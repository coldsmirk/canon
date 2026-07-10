import type { UserConfig } from "@commitlint/types";

import { fileURLToPath } from "node:url";

import { RuleConfigSeverity } from "@commitlint/types";
import { resolve as importMetaResolve } from "import-meta-resolve";

// commitlint resolves bare `extends` names from the CONSUMER's config-file location, where this
// package's dependency on @commitlint/config-conventional is invisible under pnpm's strict
// isolation. Resolve it to an absolute path from HERE instead (the same idiom as
// @coldsmirk/stylelint-config); parser presets inside the extended config keep resolving from that
// config's own directory, so the whole chain stays pnpm-safe.
const resolveHere = (id: string): string => fileURLToPath(importMetaResolve(id, import.meta.url));

// Subject shapes git itself writes during normal workflows — merges (whose messages may
// legitimately carry a body: conflict lists, PR titles) and the autosquash markers
// `git rebase --autosquash` consumes — are the ONLY exemptions from the single-line contract.
// commitlint's full defaultIgnores list is deliberately NOT used: it would also wave through
// `git revert` bodies and bare-semver subjects, which a human is expected to rewrite as
// conventional single-line messages (`revert: …`, `chore(release): …`).
const GIT_WORKFLOW_SUBJECTS = [
  /^Merge pull request /,
  /^Merge branch /,
  /^Merge branches /,
  /^Merge tag /,
  /^Merge remote-tracking branch/,
  /^Merge commit '[0-9a-f]{40}(?:[0-9a-f]{24})?'(?:; commit '[0-9a-f]{40}(?:[0-9a-f]{24})?')*$/,
  /^Merge .+? into .+/,
  /^Merged .+? (?:in|into) .+/,
  /^Merged PR .+?: /,
  /^Automatic merge/,
  /^Auto-merged .+? into /,
  /^(?:amend|fixup|squash)!/
];

// ONLY the first line is examined. A multiline-anchored regex (commitlint's own defaults use /m)
// would let any conventional commit smuggle a "Merge ..." line into its body and skip linting
// entirely — the single-line contract must judge the body, never be bypassed through it.
const WORKFLOW_IGNORES: Array<(message: string) => boolean> = [
  message => {
    const [subject = ""] = message.split(/\r?\n/, 1);

    return GIT_WORKFLOW_SUBJECTS.some(shape => shape.test(subject));
  }
];

/**
 * Build the commitlint config: Conventional Commits, enforced single-line — no body and no footer, so
 * every commit is one concise `type(scope): subject` header. Extra rationale belongs in the PR
 * description, never the commit body. The built-in default ignores are replaced by an explicit
 * allow-list of git-generated shapes (merge commits, autosquash markers) so revert bodies and
 * bare-semver subjects cannot bypass the contract. Sealed and currently option-less; kept as a
 * `defineXxxConfig` factory for consistency with the other `@coldsmirk` configs and to leave room
 * for future options.
 */
export function defineCommitlintConfig(): UserConfig {
  return {
    extends: [resolveHere("@commitlint/config-conventional")],
    defaultIgnores: false,
    ignores: WORKFLOW_IGNORES,
    rules: {
      "body-empty": [RuleConfigSeverity.Error, "always"],
      "footer-empty": [RuleConfigSeverity.Error, "always"]
    }
  };
}
