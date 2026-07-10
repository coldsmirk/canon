# @coldsmirk/commitlint-config

Opinionated [commitlint](https://commitlint.js.org/) config: [Conventional Commits](https://www.conventionalcommits.org/), enforced **single-line** — no body, no footer, so every commit is one concise `type(scope): subject` header.

## Install

```bash
pnpm add -D @coldsmirk/commitlint-config @commitlint/cli
```

Requires Node **>= 22.12** (commitlint 21 is ESM-only with this floor; this package is ESM-only too).

Also install `typescript` and `@types/node` — they are required (non-optional) peers of `cosmiconfig-typescript-loader`, which `@commitlint/cli` always depends on, so a strict-peer install flags them **regardless of config format**. At runtime they are only actually loaded for a TypeScript config file (`commitlint.config.ts`, as shown below); a plain `.js`/`.mjs` config never touches them, but the install-time peer graph is unconditional:

```bash
pnpm add -D typescript @types/node
```

## Usage

`commitlint.config.ts` (or `.js`). Call the factory — consistent with the other `@coldsmirk` configs:

```ts
import { defineCommitlintConfig } from "@coldsmirk/commitlint-config";

export default defineCommitlintConfig();
```

Wire it with husky:

```bash
echo 'pnpm exec commitlint --edit "$1"' > .husky/commit-msg
```

## What it enforces

- Everything from [`@commitlint/config-conventional`](https://github.com/conventional-changelog/commitlint/tree/master/%40commitlint/config-conventional).
- `body-empty: [error, always]` and `footer-empty: [error, always]` — multi-line commit messages fail. Put rationale in the PR description.
- commitlint's built-in `defaultIgnores` are **off**. Only the message shapes git itself writes are exempt: merge commits and the `amend!`/`fixup!`/`squash!` autosquash markers. A `git revert` default message (body carries the reverted hash) and a bare-semver subject are NOT exempt — write them as conventional single-line messages (`revert: …`, `chore(release): …`).

## License

MIT
