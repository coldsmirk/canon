import type { Linter } from "eslint";

import unusedImportsPlugin from "eslint-plugin-unused-imports";
import { defineConfig } from "eslint/config";

import { withCommentSafeFixes } from "../comment-safe-fix";
import { GLOB_SRC } from "../globs";

// Comment-safe autofixes: no-unused-imports' fixer deletes whole import declarations/specifiers —
// including any comment inside them (`import { /* keep */ Fragment }`), typically right after a
// multi-pass shorthand fix just made the import unused. Wrapped, such a removal is withheld (the
// unused import still reports; a human deletes it together with the comment).
const commentSafeUnusedImports = withCommentSafeFixes(unusedImportsPlugin);

// Owns dead-code detection; core + @typescript-eslint no-unused-vars are turned off and delegated
// here (a leading `_` marks an intentionally-unused binding).
// Rules: https://github.com/sweepline/eslint-plugin-unused-imports#usage
const unusedImportsRules: Linter.RulesRecord = {
  "unused-imports/no-unused-imports": "error",
  "unused-imports/no-unused-vars": [
    "error",
    {
      args: "after-used",
      argsIgnorePattern: "^_",
      vars: "all",
      varsIgnorePattern: "^_"
    }
  ]
};

export function unusedImports(): Linter.Config[] {
  return defineConfig({
    name: "coldsmirk/unused-imports",
    files: GLOB_SRC,
    plugins: { "unused-imports": commentSafeUnusedImports },
    rules: unusedImportsRules
  });
}
