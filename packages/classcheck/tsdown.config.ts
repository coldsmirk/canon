import { defineConfig } from "tsdown";

export default defineConfig({
  // Two entries: the programmatic API (index) and the bin (cli, shebang preserved by tsdown).
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["esm"],
  dts: true,
  fixedExtension: false,
  sourcemap: false,
  outputOptions: {
    comments: {
      annotation: true,
      jsdoc: false,
      legal: false
    }
  }
});
