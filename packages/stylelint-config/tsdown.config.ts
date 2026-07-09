import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  // Honour package.json "type": "module" for output extensions: ESM → index.js, CJS → index.cjs.
  fixedExtension: false,
  // Inline both (devDependencies): the ESM-only resolver could not be `require()`d by the CJS
  // build at runtime, and the recess-order groups module is CJS data whose external `.default`
  // interop breaks in CJS output (`require()` returns the array itself, so `.default` is
  // undefined) — bundling sidesteps the cross-format interop entirely.
  noExternal: ["import-meta-resolve", "stylelint-config-recess-order"],
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
