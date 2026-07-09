import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  // Honour package.json "type": "module" for output extensions: ESM → index.js, CJS → index.cjs.
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
