import type { Linter } from "eslint";

import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tslint from "typescript-eslint";

import { GLOB_SRC } from "../globs";

// Rules: https://typescript-eslint.io/rules/
// The non-type-checked `strict` + `stylistic` tier (no projectService): the whole no-unsafe-*
// family is deliberately OFF, matching the source repos. Type-aware rules are out of scope.
const typescriptRules: Linter.RulesRecord = {
  "@typescript-eslint/array-type": ["error", { default: "array-simple", readonly: "array-simple" }],
  "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "as", objectLiteralTypeAssertions: "allow" }],
  "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
  "@typescript-eslint/consistent-type-imports": [
    "error",
    {
      prefer: "type-imports",
      fixStyle: "separate-type-imports",
      disallowTypeAnnotations: true
    }
  ],
  "@typescript-eslint/max-params": ["error", { max: 5 }],
  "@typescript-eslint/method-signature-style": ["error", "property"],
  "@typescript-eslint/no-dynamic-delete": "off",
  "@typescript-eslint/no-empty-object-type": ["error", { allowInterfaces: "always" }],
  "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/no-import-type-side-effects": "error",
  "@typescript-eslint/no-invalid-void-type": "off",
  "@typescript-eslint/no-non-null-assertion": "off",
  "@typescript-eslint/no-this-alias": "off",
  "@typescript-eslint/no-unnecessary-parameter-property-assignment": "error",
  "@typescript-eslint/no-unsafe-assignment": "off",
  "@typescript-eslint/no-unsafe-call": "off",
  "@typescript-eslint/no-unsafe-function-type": "off",
  "@typescript-eslint/no-unsafe-member-access": "off",
  "@typescript-eslint/no-unsafe-return": "off",
  "@typescript-eslint/no-unused-expressions": ["error", { enforceForJSX: true }],
  // The core `no-unused-private-class-members` (on via recommended) only sees `#private`; the TS
  // version also covers `private`-keyword members & constructor parameter properties. Turn the core
  // one off so `#private` members aren't double-reported.
  "no-unused-private-class-members": "off",
  "@typescript-eslint/no-unused-private-class-members": "error",
  "@typescript-eslint/no-unused-vars": "off",
  // Non-type-aware extension rules (no projectService needed): TDZ/ordering guard
  // (functions:false keeps the hoisted top-level-function idiom legal) + dead empty-export cleanup.
  "@typescript-eslint/no-use-before-define": ["error", { functions: false }],
  "@typescript-eslint/no-useless-empty-export": "error"
};

// Establishes the combined JS + TS recommended baseline. `eslint.configs.recommended` and
// typescript-eslint's `eslint-recommended` turn-offs (bundled in `strict`) MUST be adjacent and in
// this order, so they live together here; the opinionated core-rule overrides in `javascript()` are
// layered AFTER this (see the factory) to win where they intentionally re-enable a rule.
//
// This layer uses `extends` (not the single-block flatten the other layers use) on purpose:
// typescript-eslint's `eslint-recommended` turn-offs are internally scoped to TS files only, so
// flattening them into one block would wrongly disable those core rules on plain `.js` files.
// `extends` preserves each upstream config's own `files`. Consequence: the recommended/strict rules
// live in `extends`-expanded child blocks, so override the baseline via a trailing config arg
// (always wins) rather than `.override("coldsmirk/typescript")`, which only targets `typescriptRules`.
export function typescript(): Linter.Config[] {
  return defineConfig({
    name: "coldsmirk/typescript",
    files: GLOB_SRC,
    extends: [eslint.configs.recommended, tslint.configs.strict, tslint.configs.stylistic],
    rules: typescriptRules
  });
}
