# @coldsmirk/eslint-config

Opinionated, composable ESLint **flat config** for the only two project shapes worth supporting: a pure-TypeScript or a React project. More opinionated than `@antfu/eslint-config`, with far fewer knobs — the two axes are `type` (`app` vs `lib`) and `react`.

Built on the antfu-family toolchain: `typescript-eslint`, `@stylistic`, `eslint-plugin-unicorn`, `eslint-plugin-perfectionist`, `eslint-plugin-import-lite`, `eslint-plugin-antfu`, `eslint-plugin-jsdoc`, `eslint-plugin-regexp`, `@eslint-community/eslint-comments`, `eslint-plugin-package-json` (package.json) + `eslint-plugin-jsonc` (tsconfig), and `@eslint-react/*` + `eslint-plugin-react-hooks` when React is on.

It lints TS/JS, package.json, and tsconfig only. It does **not** format CSS/Markdown/etc. — CSS/SCSS is owned by [`@coldsmirk/stylelint-config`](https://github.com/coldsmirk/canon/tree/main/packages/stylelint-config).

## Install

```bash
pnpm add -D eslint @coldsmirk/eslint-config
```

Requires ESLint **>= 10** and Node **>= 22**. The React and test plugins are **bundled** — a React project just sets `react: true`; no extra installs, no peer-dependency warnings. Only `eslint` itself is a peer.

## Usage

`eslint.config.ts` (or `.js` / `.mjs`):

```ts
import { defineEslintConfig } from "@coldsmirk/eslint-config";

// Pure-TS library / Node project
export default defineEslintConfig();

// React app
export default defineEslintConfig({ react: true });
```

The factory returns a plain `Linter.Config[]` — `export default` it directly.

## Options

```ts
defineEslintConfig({
  type: "app",   // "app" (lenient) | "lib" (strict, publishable package.json). Default: "app"
  react: false,  // React rules + hooks + JSX + the test layer (all plugins bundled). Default: false
  ignores: []    // extra ignore globs for files not in .gitignore. Default: []
});
```

Those are the only knobs. `.gitignore` is always honoured (merged with `ignores`); the test layer (jest-dom + testing-library on `*.test.{ts,tsx}`) follows `react`.

## package.json & tsconfig

`package.json` is sorted and validated by [`eslint-plugin-package-json`](https://github.com/JoshuaKGoldberg/eslint-plugin-package-json); `tsconfig.json` keys are sorted by `eslint-plugin-jsonc`. Strictness follows the global `type`:

- **`type: "app"`** (default) — sort keys + validity/hygiene checks, but does **not** require publish-only fields (`exports`, `files`, `license`, `repository`, …). Right for private apps.
- **`type: "lib"`** — the full publishable rule set; every published-package requirement is enforced.

```ts
export default defineEslintConfig({ type: "lib" }); // strict package.json for a published library
```

## Sealed by design

This is a highly opinionated config: **rules are not configurable.** There is no rule-override argument, no per-feature `overrides`, and no composer — the factory just returns the array you export as-is. The only knobs are `type`, `react`, and `ignores` (file scoping — for files outside `.gitignore` such as committed generated output or vendored code). If a built-in rule doesn't fit, that's a change to make in this package, not a local override.

You can still inspect exactly what applies to a file with:

```bash
npx eslint --inspect-config
```

## Extending with project-specific rules

"Sealed" means canon's **built-in** rules aren't reconfigurable — it does **not** mean the config is a dead end. The factory returns a plain `Linter.Config[]`, so you append your own flat-config block(s) after it. That trailing block is the right home for **project-specific** rules — ones that encode your own framework or domain conventions (a custom local plugin, an extra `no-restricted-syntax` selector) and so don't belong in a shared config:

```ts
import { defineEslintConfig } from "@coldsmirk/eslint-config";
import { defineConfig } from "eslint/config";

import { localPlugin } from "./tools/eslint-local-rules";

export default defineConfig(
  ...defineEslintConfig({ react: true }),
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
- **Dead code**: core and `@typescript-eslint` `no-unused-vars` are off and delegated to `unused-imports/no-unused-vars`; a leading `_` marks an intentionally-unused arg/var.
- **package.json / tsconfig**: keys sorted; package.json validated (and, for `type: "lib"`, held to publishable requirements).
- **React** (when enabled): named imports only (no `React.*`), no class components, no `forwardRef`/`createRef`/`Context.Provider`, JSX confined to `.tsx`, leak-free Web APIs, `rules-of-hooks` + `exhaustive-deps`, and canon's own autofixable JSX shorthands (`disabled` over `disabled={true}`, `<>` over a propless `<Fragment>`).

## License

MIT
