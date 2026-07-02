import type { Linter } from "eslint";

import vitestPlugin from "@vitest/eslint-plugin";

import { GLOB_TEST } from "../globs";
import { flattenConfig } from "../utils";

// Vitest hygiene on test files, ALWAYS on (unlike the DOM-oriented `test` layer, which follows
// `react`): a pure-TS Vitest project needs `no-focused-tests` — an `it.only` that reaches CI
// silently skips the rest of the suite — just as much as a React one.
// Rules: https://github.com/vitest-dev/eslint-plugin-vitest
const vitestRules: Linter.RulesRecord = {
  // Off (recommended has it at warn): `.skip` is a legitimate, self-documenting way to park a test
  // on a known issue — unlike `.only`, it can't silently swallow the suite, so the linter has no
  // business rushing its cleanup.
  "vitest/no-disabled-tests": "off",
  // `it` within describe, `it` at top level — one verb everywhere.
  "vitest/consistent-test-it": ["error", { fn: "it", withinDescribe: "it" }],
  "vitest/no-duplicate-hooks": "error",
  // Vitest officially supports `expect(value, "custom failure message")`; recommended's default
  // (maxArgs: 1) would flag that legitimate second argument.
  "vitest/valid-expect": ["error", { maxArgs: 2 }],
  // Matcher idioms, all autofixable: the dedicated matcher over a generic comparison.
  "vitest/prefer-comparison-matcher": "error",
  "vitest/prefer-equality-matcher": "error",
  "vitest/prefer-to-be": "error",
  "vitest/prefer-to-contain": "error",
  "vitest/prefer-to-have-length": "error",
  // Deterministic layout, matching the stylistic layer's blank-line discipline for source.
  "vitest/prefer-hooks-in-order": "error",
  "vitest/prefer-hooks-on-top": "error",
  "vitest/padding-around-describe-blocks": "error",
  "vitest/padding-around-test-blocks": "error"
};

export function vitest(): Linter.Config[] {
  return [flattenConfig("coldsmirk/vitest", GLOB_TEST, [vitestPlugin.configs.recommended], { rules: vitestRules })];
}
