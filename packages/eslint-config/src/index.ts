// Single API surface: the factory, nothing else. Deliberately NO prebuilt default export — one
// would run defineEslintConfig() (17 layers + a gitignore read from disk) at import time for every
// consumer, including those importing only the named factory, and would contradict the package's
// `"sideEffects": false`.
export { defineEslintConfig } from "./factory";
export type { EslintConfigOptions } from "./types";
