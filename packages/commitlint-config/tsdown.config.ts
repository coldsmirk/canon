import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  // Honour package.json "type": "module" for output extensions: ESM → index.js, CJS → index.cjs.
  fixedExtension: false,
  // No sourcemaps: config/data code, no step-debugging; avoids dangling map references.
  sourcemap: false
});
