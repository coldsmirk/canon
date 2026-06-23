// Dogfood the config on this repo itself, loaded from TS source (no build step).
// The canon packages are plain Node/TypeScript with no React. The config is sealed — no rule
// overrides — so this is the whole thing.
import { defineEslintConfig } from "./packages/eslint-config/src";

export default defineEslintConfig();
