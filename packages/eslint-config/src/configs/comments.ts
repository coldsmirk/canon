import type { Linter } from "eslint";

import commentsConfigs from "@eslint-community/eslint-plugin-eslint-comments/configs";

import { GLOB_SRC } from "../globs";
import { flattenConfig } from "../utils";

// Rules: https://eslint-community.github.io/eslint-plugin-eslint-comments/rules/
const eslintCommentsRules: Linter.RulesRecord = {
  "@eslint-community/eslint-comments/disable-enable-pair": "off",
  "@eslint-community/eslint-comments/no-unlimited-disable": "off",
  // Disable comments are the only escape hatch in a sealed config — make every one justify itself.
  "@eslint-community/eslint-comments/require-description": "error"
};

export function comments(): Linter.Config[] {
  return [flattenConfig("coldsmirk/comments", GLOB_SRC, [commentsConfigs.recommended], { rules: eslintCommentsRules })];
}
