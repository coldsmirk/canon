import type { Linter } from "eslint";

import regexpPlugin from "eslint-plugin-regexp";

import { GLOB_SRC } from "../globs";
import { flattenConfig } from "../utils";

// Safer, more readable regular expressions. Rules: https://ota-meshi.github.io/eslint-plugin-regexp/
export function regexp(): Linter.Config[] {
  return [flattenConfig("coldsmirk/regexp", GLOB_SRC, [regexpPlugin.configs["flat/recommended"]])];
}
