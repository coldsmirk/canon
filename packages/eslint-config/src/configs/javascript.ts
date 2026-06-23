import type { Linter } from "eslint";

import { defineConfig } from "eslint/config";

import { GLOB_SRC } from "../globs";

// Rules: https://eslint.org/docs/latest/rules/
// React/JSX-specific `no-restricted-syntax` selectors live in the `react` layer so a pure-TS
// config stays free of React concerns; here we keep only framework-agnostic TS hygiene.
const javascriptRules: Linter.RulesRecord = {
  "accessor-pairs": ["error", { enforceForClassMembers: true, setWithoutGet: true }],
  "array-callback-return": ["error", { allowImplicit: true }],
  "arrow-body-style": ["error", "as-needed", { requireReturnForObjectLiteral: true }],
  "block-scoped-var": "error",
  camelcase: ["error", { ignoreGlobals: true, properties: "always" }],
  curly: ["error", "all"],
  "default-case-last": "error",
  "default-param-last": "error",
  "dot-notation": ["error", { allowKeywords: true }],
  eqeqeq: ["error", "always"],
  "func-style": ["error", "declaration", { allowArrowFunctions: true }],
  "new-cap": [
    "error",
    {
      capIsNew: false,
      newIsCap: true,
      properties: true
    }
  ],
  "no-alert": "error",
  "no-caller": "error",
  "no-cond-assign": ["error", "always"],
  "no-constructor-return": "error",
  "no-else-return": ["error", { allowElseIf: false }],
  "no-empty": ["error", { allowEmptyCatch: true }],
  "no-eval": "error",
  "no-extend-native": "error",
  "no-extra-bind": "error",
  "no-extra-label": "error",
  "no-implied-eval": "error",
  "no-invalid-this": "error",
  "no-iterator": "error",
  "no-labels": ["error", { allowLoop: false, allowSwitch: false }],
  "no-lone-blocks": "error",
  "no-multi-assign": "error",
  "no-multi-str": "error",
  "no-new": "error",
  "no-new-func": "error",
  "no-new-wrappers": "error",
  "no-obj-calls": "error",
  "no-octal-escape": "error",
  "no-param-reassign": ["error", { props: false }],
  "no-promise-executor-return": ["error", { allowVoid: true }],
  "no-proto": "error",
  "no-restricted-globals": [
    "error",
    { message: "Use `globalThis` instead.", name: "global" },
    { message: "Use `globalThis` instead.", name: "self" }
  ],
  "no-restricted-properties": [
    "error",
    { message: "Use `Object.getPrototypeOf` or `Object.setPrototypeOf` instead.", property: "__proto__" },
    { message: "Use `Object.defineProperty` instead.", property: "__defineGetter__" },
    { message: "Use `Object.defineProperty` instead.", property: "__defineSetter__" },
    { message: "Use `Object.getOwnPropertyDescriptor` instead.", property: "__lookupGetter__" },
    { message: "Use `Object.getOwnPropertyDescriptor` instead.", property: "__lookupSetter__" }
  ],
  "no-restricted-syntax": ["error", "TSEnumDeclaration[const=true]", "TSExportAssignment"],
  "no-return-assign": ["error", "always"],
  "no-script-url": "error",
  "no-self-compare": "error",
  "no-sequences": "error",
  "no-template-curly-in-string": "error",
  "no-throw-literal": "error",
  "no-undef-init": "error",
  "no-unmodified-loop-condition": "error",
  "no-unneeded-ternary": ["error", { defaultAssignment: false }],
  "no-unreachable": "error",
  "no-unreachable-loop": "error",
  "no-unused-vars": "off",
  "no-useless-call": "error",
  "no-useless-computed-key": "error",
  "no-useless-concat": "error",
  "no-useless-rename": "error",
  "no-useless-return": "error",
  "object-shorthand": ["error", "always", { avoidQuotes: true, ignoreConstructors: false }],
  "one-var": ["error", { initialized: "never" }],
  "operator-assignment": ["error", "always"],
  "prefer-arrow-callback": ["error", { allowNamedFunctions: false, allowUnboundThis: true }],
  "prefer-const": ["error", { destructuring: "all", ignoreReadBeforeAssign: true }],
  // Enforce object destructuring in declarations, but NOT array destructuring — `const x = arr[i]`
  // and `const x = process.argv[2]` read better than `const [, , x] = …`. (Avoids the per-file
  // carve-out the source repos needed; this config is sealed, so the baseline must be reasonable.)
  "prefer-destructuring": ["error", { VariableDeclarator: { array: false, object: true }, AssignmentExpression: { array: false, object: false } }],
  "prefer-exponentiation-operator": "error",
  "prefer-named-capture-group": "error",
  "prefer-numeric-literals": "error",
  "prefer-object-has-own": "error",
  "prefer-object-spread": "error",
  "prefer-promise-reject-errors": "error",
  "prefer-regex-literals": ["error", { disallowRedundantWrapping: true }],
  "prefer-template": "error",
  "require-atomic-updates": "error",
  "require-await": "error",
  "symbol-description": "error",
  "unicode-bom": ["error", "never"],
  "use-isnan": ["error", { enforceForIndexOf: true, enforceForSwitchCase: true }],
  "valid-typeof": ["error", { requireStringLiterals: true }],
  yoda: ["error", "never"]
};

// Opinionated core-rule overrides. The `eslint.configs.recommended` baseline lives in `typescript()`
// (it must sit immediately before typescript-eslint's eslint-recommended turn-offs); this layer is
// ordered AFTER it so explicit re-enables (e.g. no-obj-calls / no-unreachable, which still matter
// for plain `.js` files TypeScript never checks) take effect.
export function javascript(): Linter.Config[] {
  return defineConfig({
    name: "coldsmirk/javascript",
    files: GLOB_SRC,
    rules: javascriptRules
  });
}
