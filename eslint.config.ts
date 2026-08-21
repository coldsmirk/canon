// Dogfood the config on this repo itself, loaded from TS source (no build step).
// The canon packages are plain Node/TypeScript with no React. `type: "lib"` because this repo
// PUBLISHES packages — the publish-only package.json rules must run against the real manifests.
// The config is sealed — no rule overrides — so this is the whole thing.
import { defineEslintConfig } from "./packages/eslint-config/src";

export default defineEslintConfig({
  type: "lib",
  // classcheck's test fixtures are deliberately broken source (unresolvable imports, class typos)
  // committed as real files so the integration test drives the real language server over them.
  ignores: ["packages/classcheck/src/fixtures/**"]
});
