import type { Linter } from "eslint";

import antfuPlugin from "eslint-plugin-antfu";
import { defineConfig } from "eslint/config";

import { GLOB_SRC } from "../globs";

// Small stylistic-adjacent rules that @stylistic doesn't cover.
// Rules: https://github.com/antfu/eslint-plugin-antfu#rules
const antfuRules: Linter.RulesRecord = {
  "antfu/consistent-chaining": "error",
  "antfu/consistent-list-newline": "error",
  "antfu/curly": "error",
  "antfu/if-newline": "error",
  "antfu/import-dedupe": "error",
  "antfu/indent-unindent": "error",
  "antfu/no-import-node-modules-by-path": "error",
  "antfu/top-level-function": "error"
};

export function antfu(): Linter.Config[] {
  return defineConfig({
    name: "coldsmirk/antfu",
    files: GLOB_SRC,
    plugins: { antfu: antfuPlugin },
    rules: antfuRules
  });
}
