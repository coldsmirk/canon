# canon

> Opinionated, **sealed** frontend toolchain configs, published under [`@coldsmirk/*`](https://www.npmjs.com/org/coldsmirk).

A pnpm monorepo of shared ESLint, Stylelint, commitlint, and TypeScript configs — one coherent toolchain where the rules aren't yours to tweak. You take the curated set or you don't. Every config is exposed as a single `defineXxxConfig()` factory, so wiring is identical everywhere.

## Packages

| Package | What it is |
|---|---|
| [`@coldsmirk/eslint-config`](packages/eslint-config) | Sealed ESLint **flat** config for pure-TypeScript and React projects. `defineEslintConfig({ type, react, ignores })`. |
| [`@coldsmirk/stylelint-config`](packages/stylelint-config) | CSS / SCSS config — standard + `@stylistic` + recess property ordering. `defineStylelintConfig({ scss })`. |
| [`@coldsmirk/commitlint-config`](packages/commitlint-config) | Conventional Commits, enforced single-line (no body, no footer). `defineCommitlintConfig()`. |
| [`@coldsmirk/tsconfig`](packages/tsconfig) | Strict, ESM-first tsconfig presets: `/base` (bundler), `/node` (nodenext), `/react` (base + JSX + DOM). |

## Quick start

Install only the configs you need — each package's README has the full details. For ESLint:

```bash
pnpm add -D @coldsmirk/eslint-config eslint
```

```ts
// eslint.config.ts
import { defineEslintConfig } from "@coldsmirk/eslint-config";

export default defineEslintConfig({ react: true });
```

See the per-package READMEs for [Stylelint](packages/stylelint-config), [commitlint](packages/commitlint-config), and [tsconfig](packages/tsconfig).

## Design

- **Sealed.** Rules are deliberately *not* configurable — the only knobs are the documented option axes (`type`, `react`, `scss`, …). The single escape hatch is an inline `eslint-disable` / `stylelint-disable` comment.
- **One API shape.** Every config is a `defineXxxConfig(options?)` factory — no string `extends`, no copy-pasted config objects.
- **Formatting without Prettier.** Code style is owned by `@stylistic` (ESLint) and `@stylistic/stylelint-plugin` (Stylelint).
- **Non-type-checked ESLint tier.** Fast — no `projectService`; type errors are TypeScript's job.
- **Dogfooded.** This repo lints, type-checks, and commit-lints itself with its own configs.

Requires **Node ≥ 22**.

## Development

```bash
pnpm install
pnpm typecheck   # tsc --noEmit across all packages
pnpm lint        # eslint . --fix
pnpm test        # vitest
pnpm build       # tsdown, all packages
```

husky enforces the chain locally — `commit-msg` (commitlint), `pre-commit` (lint-staged), `pre-push` (typecheck + test). CI re-runs the full gate on every push; a release is cut by pushing a `v*` tag, which builds, publishes every `@coldsmirk/*` package to npm with provenance, and creates a GitHub Release (see [`.github/workflows/release.yml`](.github/workflows/release.yml)).

## License

[MIT](LICENSE) © Venus
