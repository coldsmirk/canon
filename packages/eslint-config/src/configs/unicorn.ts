import type { Linter } from "eslint";

import unicornPlugin from "eslint-plugin-unicorn";

import { GLOB_SRC } from "../globs";
import { flattenConfig } from "../utils";

// Rules: https://github.com/sindresorhus/eslint-plugin-unicorn#rules
// Domain-specific carve-outs (e.g. `no-thenable` for a Polars-style when/then API) are NOT here —
// they belong in a consumer's trailing override, not the shared baseline.
const unicornRules: Linter.RulesRecord = {
  "unicorn/consistent-empty-array-spread": "error",
  "unicorn/error-message": "error",
  "unicorn/escape-case": "error",
  "unicorn/filename-case": ["error", { case: "kebabCase", ignore: ["README.md", "AGENTS.md", "CLAUDE.md"] }],
  // `react` / `react-dom` allow named imports only, paired with the React.* member-access ban in
  // the react layer. Harmless for non-React code (those specifiers simply never appear).
  "unicorn/import-style": [
    "error",
    {
      checkDynamicImport: false,
      extendDefaultStyles: false,
      styles: {
        react: { named: true },
        "react-dom/client": { named: true }
      }
    }
  ],
  "unicorn/new-for-builtins": "error",
  "unicorn/no-array-for-each": "error",
  "unicorn/no-array-reduce": "off",
  "unicorn/no-console-spaces": "error",
  "unicorn/no-empty-file": "error",
  "unicorn/no-for-loop": "error",
  "unicorn/no-nested-ternary": "off",
  "unicorn/no-new-array": "error",
  "unicorn/no-new-buffer": "error",
  "unicorn/no-null": "off",
  // Off: fluent/builder APIs that expose a `.then()` method (e.g. a Polars-style when/then/otherwise
  // chain) are an established pattern, and the thenable-confusion warning is just noise on them.
  "unicorn/no-thenable": "off",
  "unicorn/no-unnecessary-await": "error",
  "unicorn/no-unnecessary-polyfills": "error",
  "unicorn/no-unused-properties": "error",
  "unicorn/no-useless-promise-resolve-reject": "error",
  "unicorn/no-useless-spread": "error",
  "unicorn/no-useless-switch-case": "error",
  // Disable the arrow-function-body check: `.catch(() => undefined)` is the only way to write a
  // fire-and-forget noop; its autofix (dropping undefined) otherwise fights no-empty-function and
  // never converges.
  "unicorn/no-useless-undefined": ["error", { checkArrowFunctionBody: false }],
  "unicorn/number-literal-case": "error",
  "unicorn/prefer-array-find": "error",
  "unicorn/prefer-array-flat": "error",
  "unicorn/prefer-array-flat-map": "error",
  "unicorn/prefer-array-index-of": "error",
  "unicorn/prefer-array-some": "error",
  "unicorn/prefer-date-now": "error",
  "unicorn/prefer-default-parameters": "error",
  "unicorn/prefer-dom-node-text-content": "error",
  "unicorn/prefer-event-target": "off",
  "unicorn/prefer-includes": "error",
  "unicorn/prefer-logical-operator-over-ternary": "error",
  "unicorn/prefer-node-protocol": "error",
  "unicorn/prefer-number-properties": "error",
  "unicorn/prefer-object-from-entries": "error",
  "unicorn/prefer-single-call": "error",
  "unicorn/prefer-string-raw": "error",
  "unicorn/prefer-string-starts-ends-with": "error",
  "unicorn/prefer-string-trim-start-end": "error",
  "unicorn/prefer-type-error": "error",
  "unicorn/prevent-abbreviations": "off",
  "unicorn/require-module-specifiers": "off",
  "unicorn/text-encoding-identifier-case": ["error", { withDash: true }],
  "unicorn/throw-new-error": "error"
};

export function unicorn(): Linter.Config[] {
  return [flattenConfig("coldsmirk/unicorn", GLOB_SRC, [unicornPlugin.configs.recommended], { rules: unicornRules })];
}
