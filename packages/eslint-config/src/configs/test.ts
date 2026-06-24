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
    ], {
      // These testing-library rules assume plain react-testing-library app tests and are too strict for
      // component-library / wrapped-render testing — the same "rule's ideal doesn't fit this scenario"
      // category as the disabled @eslint-react/static-components:
      // - no-node-access / no-container forbid .closest() / .querySelector() / container methods, but a
      //   component library's internal structure (antd/antd-mobile classes, data containers) carries no
      //   semantic role/label, so getByRole etc. can't reach it — direct DOM access is the only way in.
      // - render-result-naming-convention enforces RTL's render-return naming, which misfires on custom
      //   render wrappers (renderWithProviders, …).
      rules: {
        "testing-library/no-container": "off",
        "testing-library/no-node-access": "off",
        "testing-library/render-result-naming-convention": "off"
      }
    })
  ];
}
