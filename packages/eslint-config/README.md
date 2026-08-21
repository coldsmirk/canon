# @coldsmirk/eslint-config

Opinionated, composable ESLint **flat config** for the only two project shapes worth supporting: a pure-TypeScript or a React 19+ project. More opinionated than `@antfu/eslint-config`, with far fewer knobs — the axes are `type` (`app` vs `lib`), `react`, and `tailwind` (Tailwind CSS v4 class hygiene).

Built on the antfu-family toolchain: `typescript-eslint`, `@stylistic`, `eslint-plugin-unicorn`, `eslint-plugin-perfectionist`, `eslint-plugin-import-lite`, `eslint-plugin-antfu`, `eslint-plugin-jsdoc`, `eslint-plugin-regexp`, `@eslint-community/eslint-comments`, `@vitest/eslint-plugin` (test files), `eslint-plugin-package-json` (package.json) + `eslint-plugin-jsonc` (tsconfig), and `@eslint-react/*` (including its native `rules-of-hooks` / `exhaustive-deps` ports) when React is on. `eslint-plugin-tailwindcss` v4 joins when the `tailwind` axis is set — see [Tailwind CSS v4](#tailwind-css-v4).

It lints TS/JS source (all eight extensions: `.ts`/`.tsx`/`.mts`/`.cts`/`.js`/`.jsx`/`.mjs`/`.cjs`), package.json, and tsconfig only. It does **not** format CSS/Markdown/etc. — CSS/SCSS is owned by [`@coldsmirk/stylelint-config`](https://github.com/coldsmirk/canon/tree/main/packages/stylelint-config).

## Install

```bash
pnpm add -D eslint jiti typescript@6 @coldsmirk/eslint-config
```

`typescript@6` pins the JS-compiler line — `typescript@latest` resolves to the native 7, which is outside the peer range and cannot be loaded by `typescript-eslint`. `jiti` is what ESLint uses to load a TypeScript config file; drop it if you write `eslint.config.js`/`.mjs` instead.

Peers: ESLint **>= 10.4** (eslint-plugin-unicorn v70's floor) and TypeScript **>= 5.0 < 6.1** (the intersection of `typescript-eslint`'s supported JS-compiler line and `@vitest/eslint-plugin`'s floor — the native TypeScript 7 exposes no JS parser API, so linting runs on the 6.x line even if your build compiles with 7). Node: **>= 24** (the shared floor of every `@coldsmirk` config; it also covers the bundled plugins' own floors). The React, test, and Tailwind plugins are **bundled** — a React 19+ project just sets `react: true`, a Tailwind project points `tailwind` at its CSS entry; no extra installs.

> `eslint-plugin-jest-dom` is deliberately not bundled: its latest release only peers ESLint ^6–^9, which would fail every consumer's install against ESLint 10 — and its rules call the `context.getSourceCode()` API that ESLint 10 removed, so even a force-installed copy crashes the lint run unless the plugin is wrapped with `@eslint/compat`'s `fixupPluginRules`. It returns the day upstream ships an ESLint-10-compatible release.

## Usage

`eslint.config.ts` (or `.js` / `.mjs`):

```ts
import { defineEslintConfig } from "@coldsmirk/eslint-config";

// Pure-TS library / Node project
export default defineEslintConfig();

// React 19+ app
export default defineEslintConfig({ react: true });
```

The factory returns a plain `Linter.Config[]` — `export default` it directly. To add project-specific layers, pass them as extra arguments after the options (no outer `defineConfig()` needed) — see [Extending](#extending-with-project-specific-rules).

## Options

```ts
defineEslintConfig({
  type: "app",       // "app" (lenient) | "lib" (strict, publishable package.json). Default: "app"
  react: false,      // React 19+ rules + hooks + JSX + the DOM test layer (all plugins bundled). Default: false
  tailwind: undefined, // path to the Tailwind v4 CSS entry point — setting it enables the Tailwind layer. Default: off
  ignores: []        // extra ignore globs for files not in .gitignore. Default: []
});
```

Those are the only knobs. `.gitignore` is always honoured (merged with `ignores`). Test files (`*.test.{ts,tsx}`) always get Vitest hygiene (`@vitest/eslint-plugin` — `no-focused-tests`, matcher idioms, …); the DOM test layer (testing-library) follows `react`.

## package.json & tsconfig

`package.json` is sorted and validated by [`eslint-plugin-package-json`](https://github.com/JoshuaKGoldberg/eslint-plugin-package-json); `tsconfig.json` keys are sorted by `eslint-plugin-jsonc`. Strictness follows the global `type`:

- **`type: "app"`** (default) — sort keys + validity/hygiene checks, but does **not** require publish-only fields (`exports`, `files`, `license`, `repository`, …). Right for private apps.
- **`type: "lib"`** — the full publishable rule set; every published-package requirement is enforced.

```ts
export default defineEslintConfig({ type: "lib" }); // strict package.json for a published library
```

## Tailwind CSS v4

Pass the path to your Tailwind **v4** CSS entry point (the `.css` file with `@import "tailwindcss"`) and the [`eslint-plugin-tailwindcss` v4](https://github.com/francoismassart/eslint-plugin-tailwindcss) layer switches on for all source files:

```ts
export default defineEslintConfig({ react: true, tailwind: "./src/app.css" });
```

The plugin compiles that real entry point (theme, custom `@utility`s and all), so class ordering and validation match the Tailwind compiler exactly. Enforced at error: `classnames-order`, `enforces-shorthand` (`pt-2 pb-2` → `py-2`), `enforces-negative-arbitrary-values`, `important-modifier-suffix` (v4's trailing `!`), `no-contradicting-classname`, and `no-unnecessary-arbitrary-value` — the first four plus the last autofixable. Deliberately **off**: `no-arbitrary-value` (arbitrary values are a documented escape hatch) and `no-custom-classname` (CSS-module / third-party / plain-CSS classes are legitimate). Class strings are picked up from `class` / `className` attributes and the usual call sites (`cn`, `clsx`, `cva`, `tv`, `twMerge`, …) — plugin defaults, unchanged.

The plugin is **bundled** like every other one — a Tailwind project needs no extra install; the `tailwindcss` v4 it already has is what gets compiled. The one consequence lands on projects that do **not** use Tailwind: the plugin hard-peers on `tailwindcss@^4`, so with pnpm's default settings the peer is auto-installed, and a repo that runs `strictPeerDependencies: true` without `autoInstallPeers` must allowlist the unmet peer instead:

```yaml
# pnpm-workspace.yaml — only needed in non-Tailwind repos with strict peer checking
peerDependencyRules:
  ignoreMissing:
    - tailwindcss
```

> The plugin resolves the `tailwindcss` package from the lint **cwd** at lint time. In a monorepo where Tailwind lives only in a leaf workspace, lint from that workspace (or hoist `tailwindcss` to the root) — otherwise the rules fail with `Could not find tailwindcss`.

For what ESLint structurally cannot see — class **typos** (`felx` produces no diagnostic anywhere), stylesheet-side mistakes (`@apply`/`@screen` misuse in `.css`), and class lists in module constants or `cva`/`clsx` maps — pair this axis with [`@coldsmirk/classcheck`](https://github.com/coldsmirk/canon/tree/main/packages/classcheck), the toolchain's language-server-driven class-name gate. The two are complements by design: ordering and conflicts are reported here (autofixable), typos and CSS diagnostics there, never in both.

## Sealed by design

This is a highly opinionated config: **the built-in rules are not configurable.** There is no rule-override option and no per-feature `overrides` — the only option knobs are `type`, `react`, `tailwind`, and `ignores` (file scoping, for files outside `.gitignore` such as committed generated output or vendored code). If a built-in rule doesn't fit, that's a change to make in this package. You *can* still append your own project-layer configs after the options (see [Extending](#extending-with-project-specific-rules)) — that's purely additive and leaves the sealed baseline intact.

You can still inspect exactly what applies to a file with:

```bash
npx eslint --inspect-config
```

## Extending with project-specific rules

"Sealed" means canon's **built-in** rules aren't reconfigurable — it does **not** mean the config is a dead end. Pass extra flat configs **after the options** and the factory appends them, so you get a ready-to-export result with no outer `defineConfig()`. Those trailing blocks are the right home for **project-specific** rules — ones that encode your own framework or domain conventions (a custom local plugin, an extra `no-restricted-syntax` selector) and so don't belong in a shared config:

```ts
import { defineEslintConfig } from "@coldsmirk/eslint-config";

import { localPlugin } from "./tools/eslint-local-rules";

export default defineEslintConfig(
  { react: true },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { local: localPlugin },
    rules: { "local/no-legacy-size-token": "error" }
  }
);
```

Flat config is last-wins, so a trailing block *can* also relax a canon rule for your project — reach for that sparingly; the value of a sealed baseline is that every file gets the same one.

> **One sharp edge — `no-restricted-syntax`.** Flat config **replaces** a rule's options wholesale; it does not merge them. canon packs several selectors into one `no-restricted-syntax` (the `React.*` ban, string-ref ban, const-enum ban, JSX-outside-`.tsx`). A project block that sets its own `no-restricted-syntax` therefore **overrides canon's entirely** — carry canon's selectors forward, or express your restriction as a separate named rule / plugin instead.

## What it enforces (highlights)

- **Formatting** (`@stylistic`, no Prettier for code): 2-space indent, double quotes, semicolons, 1tbs braces, no trailing commas, arrow-parens as-needed, LF line endings.
- **Imports**: sorted by `perfectionist` (type imports first, grouped builtin/external/internal/relative), `import-lite` hygiene.
- **Filenames**: kebab-case (`unicorn/filename-case`); `README.md` / `AGENTS.md` / `CLAUDE.md` exempt.
- **Dead code**: core and `@typescript-eslint` `no-unused-vars` are off and delegated to `unused-imports/no-unused-vars`; a leading `_` marks an intentionally-unused arg/var (naming-convention allows the underscore on parameters and variables, so the escape hatch actually works).
- **Tests**: Vitest hygiene on `*.test.{ts,tsx}` — `no-focused-tests` (an `it.only` reaching CI silently skips the suite), consistent `it`, autofixable matcher idioms (`toHaveLength`, `toBe`, …). `.skip` stays legal.
- **CommonJS by extension**: `.cjs`/`.cts` files are exempt from the ESM-preference rules (`no-require-imports`, `unicorn/prefer-module`, `unicorn/prefer-top-level-await`); node + browser globals are supplied so plain-JS config files don't trip `no-undef`.
- **package.json / tsconfig**: keys sorted; package.json validated (and, for `type: "lib"`, held to publishable requirements).
- **Tailwind CSS v4** (when `tailwind` is set): compiler-exact class ordering, shorthand merging, contradiction detection, trailing-`!` important placement — all at error, mostly autofixable; arbitrary values and custom class names stay legal.
- **React 19+** (when enabled): named imports only (no `React.*`), no class components, no `forwardRef`/`createRef`/`Context.Provider`, JSX confined to `.tsx`, leak-free Web APIs, `rules-of-hooks` + `exhaustive-deps` (via `@eslint-react`'s native ports — exactly one report per finding), and canon's own autofixable JSX hygiene rules (`disabled` over `disabled={true}`, `<>` over a propless `<Fragment>`, and no useless fragments — a named `<Fragment>` is only touched when it provably resolves to React's, and no fix ever costs a comment).

## License

MIT
