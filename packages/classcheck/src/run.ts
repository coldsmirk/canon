import type { ClasscheckConfig, ClasscheckFinding, ClasscheckResult } from "./types";

import { readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";

import { classSelectorsIn, isMarkerClass } from "./allowlist";
import { extractClassTokens } from "./extract";
import { LspClient, sleep } from "./lsp-client";

/**
 * A configuration or infrastructure failure — not a finding. The CLI exits 2 on these.
 */
export class ClasscheckError extends Error {}

export interface RunOptions {
  /**
   * The project root: config paths resolve against it and the server is rooted on it.
   */
  cwd?: string;
}

// The server ships as a bundled bin script with no importable API; it is resolved from THIS
// package (a regular dependency) and run with the current Node executable.
const requireHere = createRequire(import.meta.url);
const SERVER_BIN = join(
  dirname(requireHere.resolve("@tailwindcss/language-server/package.json")),
  "bin/tailwindcss-language-server"
);

/**
 * Every lint rule the server has, all at error. Sealed — the knobs are the config's four axes.
 */
const LINT = {
  cssConflict: "error",
  invalidApply: "error",
  invalidScreen: "error",
  invalidVariant: "error",
  invalidConfigPath: "error",
  invalidTailwindDirective: "error",
  invalidSourceDirective: "error",
  deprecatedAtRule: "error",
  recommendedVariantOrder: "error",
  usedBlocklistedClass: "error",
  suggestCanonicalClasses: "error"
};

// The server compiles the whole Tailwind theme before it can answer anything; polling budget for
// that first answer, then a per-document budget once the project is warm.
const READY_TIMEOUT_MS = 120_000;
const VALIDATE_TIMEOUT_MS = 30_000;

const PROBE_PREFIX = "<i className=\"";

interface ResolvedConfig {
  entry: string;
  sourceDirs: string[];
  allowFrom: string[];
  allow: string[];
}

/**
 * Run both passes and return the findings. Pass 1 collects the server's own diagnostics on every
 * stylesheet — the checks no ESLint plugin sees, because ESLint never lints CSS. Pass 2 probes
 * every class token extracted from `.ts`/`.tsx` source: the server says *nothing* about a class it
 * does not recognise, so each token is hovered in a synthetic probe document and the ones that
 * resolve to no CSS — and that no allowlisted stylesheet defines — are reported as typos.
 *
 * Class-list ordering and intra-list conflicts in markup are deliberately NOT reported here:
 * that is `@coldsmirk/eslint-config`'s `tailwind` axis, and one finding must have one source.
 */
export async function runClasscheck(config: ClasscheckConfig, options: RunOptions = {}): Promise<ClasscheckResult> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const resolved = resolveConfig(config, cwd);

  requireProjectTailwind(cwd);

  const sourceFiles = resolved.sourceDirs.flatMap(dir => walk(dir)).toSorted();
  const styleFiles = [...new Set([resolved.entry, ...resolved.allowFrom, ...sourceFiles.filter(file => file.endsWith(".css"))])].toSorted();
  const scriptFiles = sourceFiles.filter(file => /\.tsx?$/.test(file));
  // The probe never reaches disk — it only has to sit inside a mapped glob for the server to
  // attach it to the project.
  const probeFile = join(resolved.sourceDirs[0] ?? cwd, "__classcheck-probe__.tsx");
  const entryText = readFileSync(resolved.entry, "utf-8");

  const client = new LspClient({
    serverBin: SERVER_BIN,
    rootDir: cwd,
    settings: buildSettings(resolved, cwd)
  });

  try {
    await client.initialize();
    await waitUntilReady(client, probeFile);
    await proveEntryLoaded(client, probeFile, resolved.entry, entryText);

    const findings = new Map<string, ClasscheckFinding>();

    const report = (file: string, line: number, message: string): void => {
      findings.set(`${file}|${line}|${message}`, {
        file,
        line,
        message
      });
    };

    // Pass 1 — stylesheet diagnostics. One document at a time, each one awaited: validation is
    // single-flight per project, so a second document opened while the first is still queued
    // takes its place.
    for (const file of styleFiles) {
      client.openDocument(file, "css", readFileSync(file, "utf-8"));

      const diagnostics = await client.waitForDiagnostics(file, VALIDATE_TIMEOUT_MS);

      for (const diagnostic of diagnostics) {
        report(file, diagnostic.range.start.line + 1, `${diagnostic.message} [${diagnostic.code}]`);
      }
    }

    // Pass 2 — the typo sweep over every extracted class token.
    const tokens = scriptFiles.flatMap(file => extractClassTokens(file, readFileSync(file, "utf-8")));
    const uniqueTokens = [...new Set(tokens.map(t => t.token))].toSorted();

    if (uniqueTokens.length > 0) {
      const { hovers, said } = await probe(client, probeFile, uniqueTokens);
      const allowed = new Set([
        // The entry and the allowlisted stylesheets vouch for the classes they define.
        ...[entryText, ...resolved.allowFrom.map(file => readFileSync(file, "utf-8"))].flatMap(css => classSelectorsIn(css)),
        ...resolved.allow
      ]);
      const unknown = new Set(
        uniqueTokens.filter(token => !hovers.get(token) && !allowed.has(token) && !isMarkerClass(token))
      );

      for (const {
        token,
        file,
        line
      } of tokens) {
        if (unknown.has(token)) {
          report(file, line + 1, `unknown class \`${token}\` — no Tailwind utility and not defined in an allowlisted stylesheet`);
        }

        // What the server said about the token itself (canonical spelling, blocklist, …), carried
        // back to every place the token is written — including the ones it cannot see for itself.
        // classcheck OWNS canonical spelling outright: the eslint axis keeps its partial twin
        // (`no-unnecessary-arbitrary-value`, exact-twin arbitrary values only) off, so the same
        // finding never has two sources and the superset (`h-[3px]` → `h-0.75`, `bg-[var(--x)]`
        // → `bg-(--x)`, deprecated names) is enforced from exactly one place.
        const about = said.get(token);

        if (about) {
          report(file, line + 1, `${about.text} [${about.code}]`);
        }
      }
    }

    const sorted = findings.values().toArray().toSorted(
      (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.message.localeCompare(b.message)
    );

    return {
      findings: sorted,
      files: styleFiles.length + scriptFiles.length,
      classes: uniqueTokens.length
    };
  } finally {
    client.dispose();
  }
}

function resolveConfig(config: ClasscheckConfig, cwd: string): ResolvedConfig {
  if (typeof config.entry !== "string" || config.entry.length === 0) {
    throw new ClasscheckError("`entry` is required: the path to the Tailwind CSS v4 entry stylesheet");
  }

  const entry = resolve(cwd, config.entry);

  if (!entry.endsWith(".css")) {
    throw new ClasscheckError(`\`entry\` must be a Tailwind v4 \`.css\` file (a v3 \`.js\` config is not supported): ${config.entry}`);
  }

  requireFile(entry, "entry");

  const sourceDirs = (config.source ?? ["src"]).map(dir => resolve(cwd, dir));

  if (sourceDirs.length === 0) {
    throw new ClasscheckError("`source` must name at least one directory");
  }

  for (const dir of sourceDirs) {
    if (!statOf(dir)?.isDirectory()) {
      throw new ClasscheckError(`\`source\` directory does not exist: ${relative(cwd, dir)}`);
    }
  }

  const allowFrom = (config.allowFrom ?? []).map(file => resolve(cwd, file));

  // A missing allowlist stylesheet must fail, not silently stop vouching for its classes.
  for (const file of allowFrom) {
    requireFile(file, "allowFrom");
  }

  return {
    entry,
    sourceDirs,
    allowFrom,
    allow: config.allow ?? []
  };
}

function requireFile(file: string, axis: string): void {
  if (!statOf(file)?.isFile()) {
    throw new ClasscheckError(`\`${axis}\` file does not exist: ${file}`);
  }
}

// The server silently falls back to its BUNDLED tailwindcss when the project's copy is not
// resolvable from the cwd — every answer then comes from the wrong compiler version with no
// indication anywhere. Refuse to run instead. Resolved by hand (node_modules walked up the tree,
// Node's own lookup order) rather than via createRequire: module runners like Vitest shim
// require-resolution, and this check must observe the real on-disk installation the server sees.
function requireProjectTailwind(cwd: string): void {
  for (let dir = cwd; ; dir = dirname(dir)) {
    const manifest = join(dir, "node_modules", "tailwindcss", "package.json");

    if (statOf(manifest)?.isFile()) {
      const { version } = JSON.parse(readFileSync(manifest, "utf-8")) as { version?: string };

      if (typeof version !== "string" || !version.startsWith("4.")) {
        throw new ClasscheckError(`tailwindcss v4 is required, found ${version ?? "an unknown version"} at ${manifest}`);
      }

      return;
    }

    if (dirname(dir) === dir) {
      throw new ClasscheckError(
        `tailwindcss is not resolvable from ${cwd} — install it there (the language server would otherwise silently answer from its bundled copy)`
      );
    }
  }
}

function statOf(path: string) {
  try {
    return statSync(path);
  } catch {
    return null;
  }
}

/**
 * Every checkable file under `dir`, recursively, skipping dependency and hidden directories.
 * Symlinks are followed (a dirent answers `isDirectory()` with false for them, so they are
 * stat'ed through); the realpath set breaks symlink cycles.
 */
function walk(dir: string, visited = new Set<string>()): string[] {
  const real = realpathSync(dir);

  if (visited.has(real)) {
    return [];
  }

  visited.add(real);

  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name);
    const stats = entry.isSymbolicLink() ? statOf(full) : entry;

    if (stats?.isDirectory()) {
      return entry.name === "node_modules" || entry.name.startsWith(".") ? [] : walk(full, visited);
    }

    return stats?.isFile() && /\.(?:tsx?|css)$/.test(entry.name) ? [full] : [];
  });
}

// The server matches its configFile globs with forward slashes on every platform.
function posix(path: string): string {
  return path.replaceAll("\\", "/");
}

function buildSettings(resolved: ResolvedConfig, cwd: string): Record<string, unknown> {
  const globOf = (dir: string): string => {
    const rel = posix(relative(cwd, dir));

    return rel === "" ? "**" : `${rel}/**`;
  };

  // The document globs the entry point governs: every source dir, plus the stylesheets that may
  // live outside them. Left to search on its own the server picks whatever stylesheet it finds
  // first and every project utility then reads as a typo — the root must be pinned.
  const documents = [
    ...resolved.sourceDirs.map(dir => globOf(dir)),
    ...[resolved.entry, ...resolved.allowFrom].map(file => posix(relative(cwd, file)))
  ];

  return {
    editor: { tabSize: 2 },
    tailwindCSS: {
      classAttributes: ["class", "className", "classNames"],
      classFunctions: [],
      validate: true,
      hovers: true,
      lint: LINT,
      files: { exclude: [] },
      experimental: {
        classRegex: [],
        configFile: { [posix(relative(cwd, resolved.entry))]: documents }
      }
    }
  };
}

// Poll until the server's Tailwind build answers a hover — an under-guessed sleep here is a
// report full of false typos.
async function waitUntilReady(client: LspClient, probeFile: string): Promise<void> {
  client.openDocument(probeFile, "typescriptreact", probeText(["flex"]));

  const deadline = Date.now() + READY_TIMEOUT_MS;

  while (!await client.hover(probeFile, 0, PROBE_PREFIX.length)) {
    if (Date.now() > deadline) {
      throw new ClasscheckError("the language server never resolved a class — is the project's tailwindcss v4 installed?");
    }

    await sleep(500);
  }
}

/**
 * Prove the intended stylesheet root loaded before trusting one result: every static `@utility`
 * the entry defines must resolve. A server that fell back to another stylesheet answers hovers
 * happily — and then reports every project utility as a typo.
 */
async function proveEntryLoaded(client: LspClient, probeFile: string, entry: string, entryText: string): Promise<void> {
  const utilities = entryText.matchAll(/@utility\s+(?<name>[^\s{]+)/g)
    .map(match => match.groups?.name ?? "")
    // Functional utilities (`@utility tab-*`) have no literal class name to probe.
    .filter(name => name !== "" && !name.includes("*"))
    .toArray();

  if (utilities.length === 0) {
    return;
  }

  const { hovers } = await probe(client, probeFile, utilities);

  for (const [token, css] of hovers) {
    if (!css) {
      throw new ClasscheckError(`the entry stylesheet did not load: \`@utility ${token}\` from ${entry} resolved to nothing`);
    }
  }
}

// One line per token in a document that never reaches disk. This is also the only place some
// tokens are ever *seen* as classes: the server recognises a class region by where it sits (a
// `className` in a `.tsx` file, and not much else), so a class list held in a module constant gets
// neither hovers nor diagnostics where it is written. Asking about the probe instead puts every
// token on the same footing.
function probeText(tokens: string[]): string {
  return `${tokens.map(token => `${PROBE_PREFIX}${token}" />`).join("\n")}\n`;
}

async function probe(client: LspClient, probeFile: string, tokens: string[]): Promise<{ hovers: Map<string, string | null>; said: Map<string, { code: string; text: string }> }> {
  client.clearDiagnostics(probeFile);
  client.openDocument(probeFile, "typescriptreact", probeText(tokens));

  const hovers = new Map<string, string | null>();

  for (const [line, token] of tokens.entries()) {
    hovers.set(token, await client.hover(probeFile, line, PROBE_PREFIX.length));
  }

  const said = new Map<string, { code: string; text: string }>();

  // One class per line, so nothing in the probe can conflict with anything: what it reports is
  // what the class itself is, wherever it is written. The code is kept apart from the message so
  // the caller can apply per-rule ownership decisions.
  const diagnostics = await client.waitForDiagnostics(probeFile, VALIDATE_TIMEOUT_MS);

  for (const diagnostic of diagnostics) {
    const token = tokens[diagnostic.range.start.line];

    if (token !== undefined) {
      said.set(token, { code: String(diagnostic.code), text: diagnostic.message });
    }
  }

  return { hovers, said };
}
