import type { Linter } from "eslint";

import { fixupPluginRules } from "@eslint/compat";
import jestDom from "eslint-plugin-jest-dom";
import testingLibrary from "eslint-plugin-testing-library";

import { GLOB_TEST } from "../globs";
import { flattenConfig } from "../utils";

// jest-dom + testing-library/react on test files, merged into ONE block: their namespaces are
// disjoint (jest-dom/* vs testing-library/*) and neither preset carries files/languageOptions, so
// flattenConfig collapses both losslessly — every rule from both survives.
//
// jest-dom 5.5.0 predates ESLint 10: its prefer-to-have-{class,style,attribute} rules call the
// removed `context.getSourceCode()`, which throws and crashes the entire lint run on ESLint 10. We
// wrap the plugin with @eslint/compat's fixupPluginRules to polyfill that API. testing-library 7.x
// already supports ESLint 10, so it needs no shim.
//
// TODO(jest-dom + ESLint 10): once eslint-plugin-jest-dom ships a release whose peer accepts eslint
// `^10` and which no longer calls `context.getSourceCode()`, drop the `@eslint/compat` dependency
// (package.json) and this fixupPluginRules wrap — revert to plain `plugins: { "jest-dom": jestDom }`.
export function test(): Linter.Config[] {
  return [
    flattenConfig("coldsmirk/test", GLOB_TEST, [
      { ...jestDom.configs["flat/recommended"], plugins: { "jest-dom": fixupPluginRules(jestDom) } },
      testingLibrary.configs["flat/react"]
    ])
  ];
}
