import type { Linter } from "eslint";

import jestDom from "eslint-plugin-jest-dom";
import testingLibrary from "eslint-plugin-testing-library";

import { GLOB_TEST } from "../globs";

// jest-dom + testing-library/react on spec files. Both `flat/recommended` and `flat/react` are
// single config objects carrying their own `plugins`/`rules` (and no `files`). Spreading BOTH into
// one object would let testing-library clobber jest-dom's plugin+rules (a latent bug in the source
// repos), so we emit them as TWO scoped objects. Plugins are bundled deps (imported statically).
export function test(): Linter.Config[] {
  return [
    {
      ...jestDom.configs["flat/recommended"],
      name: "coldsmirk/test/jest-dom",
      files: GLOB_TEST
    },
    {
      ...testingLibrary.configs["flat/react"],
      name: "coldsmirk/test/testing-library",
      files: GLOB_TEST
    }
  ];
}
