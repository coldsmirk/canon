import type { Linter } from "eslint";

function mergeLanguageOptions(target: Linter.LanguageOptions, source: Linter.LanguageOptions | undefined): void {
  if (!source) {
    return;
  }

  for (const [key, value] of Object.entries(source)) {
    // parserOptions / globals are objects that must be merged, not replaced wholesale.
    target[key] = (key === "parserOptions" || key === "globals") && typeof value === "object" && value !== null ? { ...(target[key] as object), ...value } : value;
  }
}

interface FlattenExtras {
  plugins?: Record<string, unknown>;
  rules?: Linter.RulesRecord;
}

/**
 * Collapse one-or-more upstream flat configs (a plugin's `recommended` preset, a typescript-eslint
 * config array, …) plus our own additions into a SINGLE named config object scoped to `files`.
 *
 * Used instead of ESLint's `extends` for the homogeneous single-preset layers: `defineConfig({
 * extends })` flattens each preset into separate child objects named `"<name> > <preset>"`, leaking
 * extra names; merging into one block keeps every rule under one stable `name`.
 */
export function flattenConfig(
  name: string,
  files: string[],
  sources: Linter.Config[],
  extras: FlattenExtras = {}
): Linter.Config {
  const plugins: Record<string, unknown> = {};
  const languageOptions: Linter.LanguageOptions = {};
  const settings: Record<string, unknown> = {};
  const rules: Linter.RulesRecord = {};

  for (const source of sources) {
    Object.assign(plugins, source.plugins);
    mergeLanguageOptions(languageOptions, source.languageOptions);
    Object.assign(settings, source.settings);
    Object.assign(rules, source.rules);
  }

  Object.assign(plugins, extras.plugins);
  Object.assign(rules, extras.rules);

  const config: Linter.Config = {
    name,
    files,
    rules
  };

  if (Object.keys(plugins).length > 0) {
    config.plugins = plugins as Linter.Config["plugins"];
  }

  if (Object.keys(languageOptions).length > 0) {
    config.languageOptions = languageOptions;
  }

  if (Object.keys(settings).length > 0) {
    config.settings = settings;
  }

  return config;
}
