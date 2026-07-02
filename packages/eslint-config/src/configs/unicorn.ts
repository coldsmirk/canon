import type { Linter } from "eslint";

import unicornPlugin from "eslint-plugin-unicorn";

import { GLOB_SRC } from "../globs";
import { flattenConfig } from "../utils";

// Rules: https://github.com/sindresorhus/eslint-plugin-unicorn#rules
// Domain-specific carve-outs (e.g. `no-thenable` for a Polars-style when/then API) are NOT here —
// they belong in a consumer's trailing override, not the shared baseline.
const unicornRules: Linter.RulesRecord = {
  // Off: assumes every `.children` is a DOM collection, so it false-positives on non-DOM `.children`
  // (React children, schema / AST node trees). High noise in React and tree-shaped data.
  "unicorn/better-dom-traversing": "off",
  // Off (v70 recommended): demands an is/has/can prefix on every local boolean, but React-ecosystem
  // state idioms (`loading`, `disabled`, `open`) are unprefixed by convention, and there is no
  // autofix — the rename cost lands on every consumer.
  "unicorn/consistent-boolean-name": "off",
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
  // v70 renamed prevent-abbreviations to name-replacements AND put it in recommended — same rule,
  // same noise (it rewrites `props`/`ref`-style names wholesale), so the off moves to the new name.
  "unicorn/name-replacements": "off",
  "unicorn/new-for-builtins": "error",
  // v70 renamed no-array-for-each and widened it beyond arrays (Set/Map/NodeList forEach too).
  "unicorn/no-for-each": "error",
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
  // Off (v70 recommended): flags the module-level lazy-cache / registry pattern
  // (`let cache; function get() { cache ??= … }`), which is legitimate and common.
  "unicorn/no-top-level-assignment-in-function": "off",
  "unicorn/no-unnecessary-await": "error",
  "unicorn/no-unnecessary-polyfills": "error",
  "unicorn/no-unused-properties": "error",
  "unicorn/no-useless-promise-resolve-reject": "error",
  "unicorn/no-useless-spread": "error",
  "unicorn/no-useless-switch-case": "error",
  // Off (v70): duplicate of core `no-useless-concat`, which the javascript layer already enforces —
  // keeping the core twin preserves long-standing behavior without double-reporting.
  "unicorn/no-useless-concat": "off",
  // Disable the arrow-function-body check: `.catch(() => undefined)` is the only way to write a
  // fire-and-forget noop; its autofix (dropping undefined) otherwise fights no-empty-function and
  // never converges.
  "unicorn/no-useless-undefined": ["error", { checkArrowFunctionBody: false }],
  "unicorn/number-literal-case": "error",
  // Off (v70): duplicate of core `operator-assignment`, configured ["error", "always"] in the
  // javascript layer — same reasoning as no-useless-concat above.
  "unicorn/operator-assignment": "off",
  "unicorn/prefer-array-find": "error",
  "unicorn/prefer-array-flat": "error",
  "unicorn/prefer-array-flat-map": "error",
  "unicorn/prefer-array-index-of": "error",
  "unicorn/prefer-array-some": "error",
  // Off (v70 recommended): bans promise chaining outright, which kills the fire-and-forget
  // `.catch(() => undefined)` idiom this config explicitly protects (see no-useless-undefined) —
  // and `.then()` composition is a legitimate form. No autofix, so every hit is manual work.
  "unicorn/prefer-await": "off",
  "unicorn/prefer-date-now": "error",
  "unicorn/prefer-default-parameters": "error",
  "unicorn/prefer-dom-node-text-content": "error",
  "unicorn/prefer-event-target": "off",
  "unicorn/prefer-includes": "error",
  // Off: its autofix rewrites `a === x || a === y || a === z` to `[x, y, z].includes(a)`, which loses
  // discriminated-union narrowing — `eslint --fix` then emits code that fails typecheck. An autofix
  // must not introduce type errors.
  "unicorn/prefer-includes-over-repeated-comparisons": "off",
  "unicorn/prefer-logical-operator-over-ternary": "error",
  "unicorn/prefer-node-protocol": "error",
  "unicorn/prefer-number-properties": "error",
  "unicorn/prefer-object-from-entries": "error",
  "unicorn/prefer-single-call": "error",
  "unicorn/prefer-string-raw": "error",
  "unicorn/prefer-string-starts-ends-with": "error",
  "unicorn/prefer-string-trim-start-end": "error",
  "unicorn/prefer-type-error": "error",
  // Off (v70 recommended): its type-aware twin (@typescript-eslint/require-array-sort-compare)
  // defaults to ignoreStringArrays and isn't even in the upstream presets; this syntax-level
  // version can't tell string[] apart, so it taxes the most common, correct sort with boilerplate.
  "unicorn/require-array-sort-compare": "off",
  "unicorn/require-module-specifiers": "off",
  "unicorn/text-encoding-identifier-case": ["error", { withDash: true }],
  "unicorn/throw-new-error": "error"
};

export function unicorn(): Linter.Config[] {
  return [flattenConfig("coldsmirk/unicorn", GLOB_SRC, [unicornPlugin.configs.recommended], { rules: unicornRules })];
}
