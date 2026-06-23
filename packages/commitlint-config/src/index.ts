import type { UserConfig } from "@commitlint/types";

import { RuleConfigSeverity } from "@commitlint/types";

/**
 * Build the commitlint config: Conventional Commits, enforced single-line — no body and no footer, so
 * every commit is one concise `type(scope): subject` header. Extra rationale belongs in the PR
 * description, never the commit body. Sealed and currently option-less; kept as a `defineXxxConfig`
 * factory for consistency with the other `@coldsmirk` configs and to leave room for future options.
 */
export function defineCommitlintConfig(): UserConfig {
  return {
    extends: ["@commitlint/config-conventional"],
    rules: {
      "body-empty": [RuleConfigSeverity.Error, "always"],
      "footer-empty": [RuleConfigSeverity.Error, "always"]
    }
  };
}
