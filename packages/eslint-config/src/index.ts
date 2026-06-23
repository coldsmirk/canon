import type { Linter } from "eslint";

import { defineEslintConfig } from "./factory";

export { defineEslintConfig } from "./factory";
export type { EslintConfigOptions } from "./types";

// Default export is the ready-to-use config (defaults: TS app, no React) so consumers can
// `import config from "@coldsmirk/eslint-config"`; pass options via the named `defineEslintConfig`.
// The explicit annotation keeps the emitted `.d.ts` portable (avoids a deep @eslint/core type ref).
const config: Linter.Config[] = defineEslintConfig();

export default config;
