import type { Linter } from "eslint";

import { defineConfig } from "eslint/config";

import { GLOB_COMMONJS } from "../globs";

// `.cjs` / `.cts` files are CommonJS BY EXTENSION — the format is the whole point of the file, so
// the ESM-preference rules the rest of the config enforces are pure noise here: `require()` bans,
// "convert to ESM" advice, and top-level-await suggestions (a syntax error in CJS). unicorn's two
// rules self-skip `.cjs` but NOT `.cts`, so they must be turned off here — which also requires this
// layer to sit AFTER `unicorn()` in the factory (last-wins). `no-undef` needs nothing: the node
// globals in the javascript layer cover it. The `export =` ban (no-restricted-syntax:
// TSExportAssignment) deliberately stays — a `.cts` file can and should use `export default`; the
// rare consumer that needs the exact `export =` shape has the described disable-comment escape hatch.
const commonjsRules: Linter.RulesRecord = {
  "@typescript-eslint/no-require-imports": "off",
  "unicorn/prefer-module": "off",
  "unicorn/prefer-top-level-await": "off"
};

export function commonjs(): Linter.Config[] {
  return defineConfig({
    name: "coldsmirk/commonjs",
    files: GLOB_COMMONJS,
    rules: commonjsRules
  });
}
