import type { Linter } from "eslint";

import stylisticPlugin from "@stylistic/eslint-plugin";

import { GLOB_SRC } from "../globs";
import { flattenConfig } from "../utils";

// Code formatting via @stylistic (no Prettier for TS/JS): 2-space, double quotes, semicolons,
// 1tbs, no trailing commas, arrow-parens as-needed. Rules: https://eslint.style/rules
const stylisticRules: Linter.RulesRecord = {
  "@stylistic/array-bracket-newline": ["error", { multiline: true }],
  "@stylistic/array-element-newline": ["error", "consistent"],
  "@stylistic/arrow-parens": ["error", "as-needed"],
  "@stylistic/curly-newline": ["error", { consistent: true }],
  "@stylistic/function-call-spacing": ["error", "never"],
  "@stylistic/function-paren-newline": ["error", "multiline-arguments"],
  "@stylistic/generator-star-spacing": ["error", { after: true, before: false }],
  "@stylistic/implicit-arrow-linebreak": ["error", "beside"],
  "@stylistic/jsx-child-element-spacing": "error",
  "@stylistic/jsx-max-props-per-line": ["error", { maximum: { multi: 1, single: 5 } }],
  "@stylistic/jsx-newline": ["error", { allowMultilines: true, prevent: true }],
  "@stylistic/jsx-self-closing-comp": ["error", { component: true, html: true }],
  "@stylistic/line-comment-position": ["error", { position: "above" }],
  // Enforce LF everywhere ESLint can. Editor/Git config (.editorconfig, .gitattributes) are the
  // other two lines of defence; what the linter can normalize, it should.
  "@stylistic/linebreak-style": ["error", "unix"],
  "@stylistic/max-statements-per-line": ["error", { max: 1 }],
  "@stylistic/multiline-comment-style": ["error", "separate-lines", { checkJSDoc: false }],
  "@stylistic/newline-per-chained-call": ["error", { ignoreChainWithDepth: 6 }],
  "@stylistic/no-extra-parens": [
    "error",
    "all",
    {
      ignoreJSX: "multi-line",
      nestedBinaryExpressions: false,
      ternaryOperandBinaryExpressions: false
    }
  ],
  "@stylistic/no-extra-semi": "error",
  "@stylistic/no-multiple-empty-lines": [
    "error",
    {
      max: 1,
      maxBOF: 0,
      maxEOF: 0
    }
  ],
  "@stylistic/object-curly-newline": [
    "error",
    {
      ExportDeclaration: { consistent: true, multiline: true },
      ImportDeclaration: { consistent: true, multiline: true },
      ObjectExpression: {
        consistent: true,
        minProperties: 3,
        multiline: true
      },
      ObjectPattern: {
        consistent: true,
        minProperties: 3,
        multiline: true
      }
    }
  ],
  "@stylistic/object-property-newline": ["error", { allowAllPropertiesOnSameLine: true }],
  "@stylistic/padding-line-between-statements": [
    "error",
    {
      blankLine: "always",
      next: ["block", "multiline-block-like", "type", "interface", "enum", "function", "function-overload"],
      prev: "*"
    },
    {
      blankLine: "always",
      next: "*",
      prev: ["block", "multiline-block-like", "type", "interface", "enum", "function", "function-overload"]
    }
  ],
  "@stylistic/semi-style": ["error", "last"],
  "@stylistic/switch-colon-spacing": ["error", { after: true, before: false }],
  "@stylistic/yield-star-spacing": ["error", { after: true, before: false }]
};

// `customize` output is fully determined by these fixed options — compute it once at module load,
// matching how every other layer keeps its rules object as a module-level constant.
const customizedStylistic = stylisticPlugin.configs.customize({
  blockSpacing: true,
  braceStyle: "1tbs",
  commaDangle: "never",
  indent: 2,
  jsx: true,
  quoteProps: "as-needed",
  quotes: "double",
  semi: true,
  severity: "error"
});

export function stylistic(): Linter.Config[] {
  return [flattenConfig("coldsmirk/stylistic", GLOB_SRC, [customizedStylistic], { rules: stylisticRules })];
}
