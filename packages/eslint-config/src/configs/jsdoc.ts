import type { Linter } from "eslint";

import jsdocPlugin from "eslint-plugin-jsdoc";
import { defineConfig } from "eslint/config";

import { GLOB_SRC } from "../globs";

// JSDoc block hygiene only (no requirement to document). Rules: https://github.com/gajus/eslint-plugin-jsdoc#rules
const jsdocRules: Linter.RulesRecord = {
  "jsdoc/check-alignment": "error",
  "jsdoc/check-line-alignment": ["error", "always", { tags: [] }],
  "jsdoc/check-syntax": "error",
  "jsdoc/empty-tags": "error",
  "jsdoc/escape-inline-tags": "error",
  "jsdoc/multiline-blocks": ["error", { noSingleLineBlocks: true }],
  "jsdoc/no-bad-blocks": "error",
  "jsdoc/no-blank-block-descriptions": "error",
  "jsdoc/no-blank-blocks": "error",
  "jsdoc/no-multi-asterisks": "error",
  "jsdoc/require-asterisk-prefix": "error",
  "jsdoc/tag-lines": ["error", "never", { startLines: 1 }]
};

export function jsdoc(): Linter.Config[] {
  return defineConfig({
    name: "coldsmirk/jsdoc",
    files: GLOB_SRC,
    plugins: { jsdoc: jsdocPlugin },
    rules: jsdocRules
  });
}
