#!/usr/bin/env node
import type { ClasscheckConfig } from "./types";

import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { ClasscheckError, runClasscheck } from "./run";

const HELP = `classcheck — Tailwind CSS v4 class-name gate

Usage:
  classcheck [--config <path>]

Loads classcheck.config.{ts,mts,js,mjs} from the current directory (Node runs the
TypeScript config natively). The config default-exports defineClasscheckConfig({...}).

Exit codes: 0 clean, 1 findings, 2 configuration or infrastructure failure.`;

const CONFIG_CANDIDATES = ["classcheck.config.ts", "classcheck.config.mts", "classcheck.config.js", "classcheck.config.mjs"];

// A typo'd flag is a usage error — the documented contract reserves exit 1 for findings, so the
// parse failure must surface as a clean exit-2 message, not a raw stack trace.
function parseCliArgs(): { config?: string; help?: boolean } {
  try {
    return parseArgs({
      options: {
        config: { type: "string" },
        help: { type: "boolean" }
      }
    }).values;
  } catch (error) {
    throw new ClasscheckError(`${(error as Error).message} (see --help)`, { cause: error });
  }
}

async function loadConfig(cwd: string, explicit: string | undefined): Promise<ClasscheckConfig> {
  const candidates = explicit ? [explicit] : CONFIG_CANDIDATES;

  for (const candidate of candidates) {
    const path = resolve(cwd, candidate);

    // Existence is decided up front, so an import failure below is always the config's OWN error
    // (a broken import inside it, a missing dependency) — masking those as "no config found"
    // would send the user hunting for the wrong problem.
    if (!existsSync(path)) {
      continue;
    }

    let module: { default?: unknown };

    try {
      module = (await import(pathToFileURL(path).href)) as { default?: unknown };
    } catch (error) {
      throw new ClasscheckError(`could not load ${candidate}: ${(error as Error).message}`, { cause: error });
    }

    const config = module.default;

    if (typeof config !== "object" || config === null || typeof (config as ClasscheckConfig).entry !== "string") {
      throw new ClasscheckError(`${candidate} must default-export defineClasscheckConfig({ entry, ... })`);
    }

    return config as ClasscheckConfig;
  }

  throw new ClasscheckError(
    explicit ? `config file not found: ${explicit}` : `no ${CONFIG_CANDIDATES[0]} found in ${cwd} (see --help)`
  );
}

try {
  const values = parseCliArgs();

  if (values.help) {
    console.log(HELP);
    process.exit(0);
  }

  const cwd = process.cwd();
  const config = await loadConfig(cwd, values.config);
  const {
    findings,
    files,
    classes
  } = await runClasscheck(config, { cwd });

  for (const {
    file,
    line,
    message
  } of findings) {
    console.log(`${relative(cwd, file)}:${line}: ${message}`);
  }

  console.log(
    findings.length > 0
      ? `\nclasscheck: ${findings.length} finding(s) across ${files} files`
      : `classcheck: ${classes} classes in ${files} files, no findings`
  );
  process.exit(findings.length > 0 ? 1 : 0);
} catch (error) {
  if (error instanceof ClasscheckError) {
    console.error(`classcheck: ${error.message}`);
  } else {
    console.error(error);
  }

  process.exit(2);
}
