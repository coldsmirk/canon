import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  // ESM-only: flat config + ESLint 10 are ESM; no CJS consumers to support.
  format: ["esm"],
  dts: true,
  fixedExtension: false,
  // No sourcemaps: this is configuration/data code that nobody step-debugs, and the maps would
  // only point at unpublished `src`. Keeps dist to index.js + index.d.ts with no dangling map refs.
  sourcemap: false
});
