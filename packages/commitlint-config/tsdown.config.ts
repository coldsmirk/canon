import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  // ESM-only: commitlint 21 is itself ESM-only with a Node >= 22.12 floor, so a CJS build could
  // only ever mis-serve consumers (require() of the ESM @commitlint packages).
  format: ["esm"],
  dts: true,
  fixedExtension: false,
  // No sourcemaps: config/data code, no step-debugging; avoids dangling map references.
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
