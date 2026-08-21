# @coldsmirk/classcheck

Headless Tailwind CSS **v4** class-name gate. It drives the real Tailwind language server — [`@tailwindcss/language-server`](https://www.npmjs.com/package/@tailwindcss/language-server), the same binary the editor extension ships — over stdio, with no editor and no network, and turns its knowledge of your *actual compiled theme* into a CI-friendly `file:line: message` report.

It is the complement of [`@coldsmirk/eslint-config`](https://github.com/coldsmirk/canon/tree/main/packages/eslint-config)'s `tailwind` axis, not a replacement for it. The ESLint layer owns what ESLint is good at — class **ordering**, intra-list **conflicts**, shorthand merging, all autofixable in markup. classcheck owns what ESLint structurally cannot see:

1. **Typos.** The compiler says *nothing* about a class it does not recognise — there is no diagnostic to wait for, so no lint rule fires. classcheck hovers every class token in your tree against the compiled theme; the ones that resolve to no CSS, and that no allowlisted stylesheet defines, are reported. `felx` fails the build.
2. **Stylesheet-side mistakes.** ESLint never lints CSS. The server's own diagnostics (`invalidApply`, `invalidScreen`, `deprecatedAtRule`, v3 leftovers, …) run on every `.css` file.
3. **Deep class sites.** Class lists in module constants, `classNames` slot maps (Mantine's Styles API), `{ class: … }` attribute objects (tiptap), `cva`/`tv` variant maps, and `clsx` object keys — sites neither the ESLint plugin nor the server sees in place — are extracted with a TypeScript AST walk and probed individually.

## Install

```bash
pnpm add -D @coldsmirk/classcheck
```

Your project already has `tailwindcss` v4 (that is the point); the language server is bundled, pinned exactly (`0.16.0`) because the gate drives its headless internals. `typescript` is a peer (used for the AST walk — any 5.x/6.x JS-compiler line).

## Usage

`classcheck.config.ts` (Node ≥ 24 runs it natively — `.js`/`.mjs`/`.mts` work too):

```ts
import { defineClasscheckConfig } from "@coldsmirk/classcheck";

export default defineClasscheckConfig({
  entry: "src/app.css",
  allowFrom: ["src/styles/global.css"]
});
```

Then:

```bash
npx classcheck        # or add "classcheck": "classcheck" to package.json scripts
```

Exit codes: `0` clean, `1` findings, `2` configuration or infrastructure failure. Programmatic use: `runClasscheck(config, { cwd })` returns the findings without printing.

## Options

The four axes are the entire surface — which checks run, and at what severity, is sealed like every other canon config:

```ts
defineClasscheckConfig({
  entry: "src/app.css",          // REQUIRED: the Tailwind v4 CSS entry point (`@import "tailwindcss"`)
  source: ["src"],               // directories scanned for .ts/.tsx (tokens) and .css (diagnostics)
  allowFrom: [],                 // hand-written stylesheets whose class selectors are legal
  allow: []                      // extra legal class names nothing in the repo defines
});
```

- **`entry`** is compiled by the server, so ordering/validation match your theme, your `@utility`s, your plugins — not a hand-maintained class list. Selectors written directly in the entry are automatically allowed. Before trusting a single result, the gate proves the intended root loaded: every static `@utility` the entry defines must resolve, or the run dies.
- **`allowFrom`** is the design-system escape hatch: `.readout`, `.eyebrow` and friends live in real CSS on purpose. Their selectors form the allowlist — which also means a typo in one of *those* names fails. Comments are stripped first: prose about a class cannot vouch for it.
- **`allow`** is for classes a third-party script toggles at runtime. Prefer `allowFrom` — a name here is vouched for by nobody. (`group`/`peer` and their named forms are built in: they generate no CSS by design.)

## What a run does

**Pass 1 — stylesheet diagnostics.** Every `.css` file under `source` (plus `entry` and `allowFrom`) is validated by the server with every lint rule at error: `cssConflict` (in `@apply`), `invalidApply`, `invalidScreen`, `invalidVariant`, `invalidConfigPath`, `invalidTailwindDirective`, `invalidSourceDirective`, `deprecatedAtRule`, `recommendedVariantOrder`, `usedBlocklistedClass`, `suggestCanonicalClasses`.

**Pass 2 — the typo sweep.** Every class token extracted from `.ts`/`.tsx` is written into a synthetic probe document (one class per line, never touching disk) and hovered. Silence from the server + absence from the allowlist = unknown class, reported at every site that writes it. Whatever the server *does* say about a token (canonical spelling, blocklist) is carried back to those sites too.

Deliberately **not** reported: class-list ordering and intra-list conflicts in markup. Those are `@coldsmirk/eslint-config`'s `tailwind` axis (autofixable there), and one finding must have one source. The same rule runs the other way for **canonical spelling**: classcheck owns `suggestCanonicalClasses` outright — `m-[8px]` → `m-2`, `h-[3px]` → `h-0.75`, `bg-[var(--x)]` → `bg-(--x)`, deprecated names like `break-words` → `wrap-break-word` — and the eslint axis keeps its partial twin (`no-unnecessary-arbitrary-value`, exact-twin values only) off. When the plugin's v4.4 `enforces-canonical-classname` ships the full check with an autofix, ownership flips to ESLint.

## Caveats

- The server resolves the `tailwindcss` package from the lint **cwd** — and silently falls back to its *bundled* copy (a different compiler version) when none is found, so classcheck refuses to run unless `tailwindcss` v4 is resolvable from the cwd. In a monorepo where Tailwind lives in a leaf workspace, run classcheck from that workspace.
- The extraction walk is per-file and syntactic: a class constant imported from another module is checked where it is *defined* (its `cva`/`clsx`/attribute site), not where it is used.
- Tokens flush against a template interpolation (`` `w-[${x}px]` ``) are fragments of *constructed* class names. Tailwind cannot compile constructed names either, so the fragments are skipped rather than misreported as typos — whitespace-separated complete tokens in the same template are still checked.
- The language server is pinned exactly because the gate depends on headless behaviour (`testMode`, configuration pull, single-flight validation) that can shift between versions; bumps happen here, tested, not in your lockfile.

## License

MIT
