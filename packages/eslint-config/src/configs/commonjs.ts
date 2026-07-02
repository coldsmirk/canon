import type { Linter } from "eslint";

import { defineConfig } from "eslint/config";

import { GLOB_COMMONJS } from "../globs";

// `.cjs` / `.cts` files are CommonJS BY EXTENSION — the format is the whole point of the file, so
// the ESM-preference rules the rest of the config enforces are pure noise here. Only the rules that
// actually fire need exempting: `unicorn/prefer-module` already skips `.cjs` on its own, and
// `no-undef` is covered by the node globals in the javascript layer. The `export =` ban
// (no-restricted-syntax: TSExportAssignment) deliberately stays — a `.cts` file can and should use
// `export default`; the rare consumer that needs the exact `export =` shape has the described
// disable-comment escape hatch.
const commonjsRules: Linter.RulesRecord = {
  "@typescript-eslint/no-require-imports": "off"
};

export function commonjs(): Linter.Config[] {
  return defineConfig({
    name: "coldsmirk/commonjs",
    files: GLOB_COMMONJS,
    rules: commonjsRules
  });
}
