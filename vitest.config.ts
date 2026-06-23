import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    // Config-resolution tests run in Node (no DOM); specs are colocated under each package's src.
    include: ["packages/*/src/**/*.test.ts"]
  }
});
