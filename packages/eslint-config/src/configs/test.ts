import type { Linter } from "eslint";

import testingLibrary from "eslint-plugin-testing-library";

import { GLOB_TEST } from "../globs";
import { flattenConfig } from "../utils";

// testing-library/react on test files. eslint-plugin-jest-dom is deliberately NOT bundled:
// its latest release (5.5.0) peers eslint ^6–^9 only — as a dependency here it makes every
// consumer's `npm install` (and any strict-peer install) fail against the eslint >= 10.4 this
// package requires — and its rules call the `context.getSourceCode()` API that ESLint 10 removed.
// Re-add it the day upstream ships an ESLint-10-compatible release; a consumer who wants it
// sooner can layer it on via the trailing-configs extension point.
export function test(): Linter.Config[] {
  return [
    flattenConfig("coldsmirk/test", GLOB_TEST, [testingLibrary.configs["flat/react"]], {
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
