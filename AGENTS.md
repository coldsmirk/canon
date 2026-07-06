# AGENTS.md

Single canonical source of agent guidance for this repository. `CLAUDE.md` imports it via `@AGENTS.md` (Claude Code reads `CLAUDE.md`, not `AGENTS.md`), so every agent shares one document — make all edits here, not in `CLAUDE.md`.

## Project Overview

canon is the shared, opinionated frontend toolchain for every `@coldsmirk` repository (abacus, nodeloom, heddle's console, …). A pnpm-workspace monorepo (Node >= 22) publishing four packages to npm under `@coldsmirk/*` (MIT), all on one **shared version** bumped together by `scripts/version.ts`:

- `@coldsmirk/eslint-config` — sealed ESLint flat config for pure-TS and React projects (`defineEslintConfig`)
- `@coldsmirk/stylelint-config` — Stylelint for CSS/SCSS with @stylistic and recess ordering; Tailwind v4 via the `tailwind` axis (`defineStylelintConfig`)
- `@coldsmirk/commitlint-config` — Conventional Commits, enforced single-line (no body, no footer)
- `@coldsmirk/tsconfig` — strict, ESM-first TS configs: `/base` (bundler), `/node` (nodenext), `/react`

## Design invariants (do not break)

- **Sealed.** Rules are deliberately not configurable; the only knobs are the documented option axes (`type`, `react`, `scss`, `tailwind`, …) and the only escape hatch is an inline disable comment. Do not add per-rule options or accept downstream override requests by widening the API.
- **One API shape.** Every config is a `defineXxxConfig(options?)` factory — no string `extends`, no exported raw config objects.
- **Formatting without Prettier.** Code style is owned by `@stylistic` (ESLint) and `@stylistic/stylelint-plugin`.
- **Non-type-checked ESLint tier.** No `projectService` — type errors are TypeScript's job; keep the config fast.
- **Dogfooded.** This repo lints, type-checks, and commit-lints itself with its own workspace packages (`workspace:*`).

**Blast radius:** any rule change here lands in every downstream repo on its next version bump — treat rule additions/removals as breaking-ish, explain them in the commit, and prefer batching. Test suites cover the option axes; extend them when adding an axis.

## Commands

- `pnpm test` / `pnpm test:watch` — Vitest
- `pnpm typecheck` — root `tsc --noEmit` plus per-package typechecks
- `pnpm lint:check` / `pnpm lint` — ESLint verify / autofix
- `pnpm inspect` — `eslint --inspect-config` (debug the resolved flat config)
- `pnpm build` — all packages via tsdown; `pnpm clean` removes `dist`
- `pnpm version:patch|minor|major` — lockstep bump of root + all packages (never hand-edit one manifest)

Release: push an annotated `v*` tag → `release.yml` re-runs the gates, publishes every `@coldsmirk/*` package with provenance, and cuts a GitHub Release. husky enforces commit-msg (commitlint), pre-commit (lint-staged), pre-push (typecheck + test).

## Conventions

Same rules this repo exports: single-line Conventional Commits (subject not uppercase, header ≤ 100 chars), kebab-case filenames, @stylistic formatting (2-space, double quotes, semicolons), colocated `*.test.ts` specs.
