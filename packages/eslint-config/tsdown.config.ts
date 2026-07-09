import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  // ESM-only: flat config + ESLint 10 are ESM; no CJS consumers to support.
  format: ["esm"],
  dts: true,
  fixedExtension: false,
  // No sourcemaps: this is configuration/data code that nobody step-debugs, and the maps would
  // only point at unpublished `src`. Keeps dist to index.js + index.d.ts with no dangling map refs.
  sourcemap: false,
  // Ship readable but comment-free bundles: rolldown always drops plain comments; this
  // drops JSDoc/legal too, keeping @__PURE__-style annotations for tree-shaking.
  outputOptions: {
    comments: {
      annotation: true,
      jsdoc: false,
      legal: false
    }
  }
});
