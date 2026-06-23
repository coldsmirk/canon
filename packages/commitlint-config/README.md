# @coldsmirk/commitlint-config

Opinionated [commitlint](https://commitlint.js.org/) config: [Conventional Commits](https://www.conventionalcommits.org/), enforced **single-line** — no body, no footer, so every commit is one concise `type(scope): subject` header.

## Install

```bash
pnpm add -D @coldsmirk/commitlint-config @commitlint/cli
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

## License

MIT
