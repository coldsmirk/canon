import type { Linter } from "eslint";

import unusedImportsPlugin from "eslint-plugin-unused-imports";
import { defineConfig } from "eslint/config";

import { GLOB_SRC } from "../globs";

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
    plugins: { "unused-imports": unusedImportsPlugin },
    rules: unusedImportsRules
  });
}
