import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  // ESM-only: stylelint 17 loads ESM configs natively, so the CJS build — and the dependency
  // inlining it forced (import-meta-resolve / recess-order groups), with the third-party license
  // obligations that inlining carries — is gone. Both are plain runtime dependencies now.
  format: ["esm"],
  dts: true,
  fixedExtension: false,
  // No sourcemaps: config/data code, no step-debugging; avoids dangling map references.
  sourcemap: false,
  // Ship readable but comment-free bundles: rolldown always drops plain comments; this
  // drops JSDoc/legal too, keeping @__PURE__-style annotations for tree-shaking. Only this
  // package's own code is bundled, so no third-party legal comments are at stake.
  outputOptions: {
    comments: {
      annotation: true,
      jsdoc: false,
      legal: false
    }
  }
});
