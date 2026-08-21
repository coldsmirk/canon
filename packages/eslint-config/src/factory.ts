import type { Linter } from "eslint";

import type { EslintConfigOptions } from "./types";

import gitignore from "eslint-config-flat-gitignore";

import {
  antfu,
  comments,
  commonjs,
  ignores,
  imports,
  javascript,
  jsdoc,
  packageJson,
  react,
  regexp,
  stylistic,
  tailwindcss,
  test,
  tsconfig,
  typescript,
  unicorn,
  unusedImports,
  vitest
} from "./configs";

/**
 * Build the opinionated ESLint flat config. The options object selects features (`type`, `react`,
 * `tailwind`) and adds project ignore globs (`ignores`) — that is the entire surface. Rules are
 * deliberately NOT configurable: this is a sealed, take-it-or-leave-it config. Every plugin is
 * bundled, so no axis needs an extra install — a React project just sets `react: true`, and the
 * Tailwind axis compiles against the `tailwindcss` v4 the project already has.
 *
 * Extra flat configs passed after `options` are appended to the result, so a consumer gets a ready-to-
 * export config without wrapping it in another `defineConfig()` — this is the project-layer extension
 * point (purely additive; the sealed baseline is unchanged).
 *
 * @example
 * ```ts
 * export default defineEslintConfig();                  // private TS app (lenient package.json)
 * export default defineEslintConfig({ type: "lib" });   // published TS library (strict package.json)
 * export default defineEslintConfig({ react: true });   // React app
 * export default defineEslintConfig({ react: true, tailwind: "./src/app.css" }); // + Tailwind v4
 *
 * // React app + project-specific layers, no outer defineConfig() needed:
 * export default defineEslintConfig({ react: true }, ...tanstackConfig, projectLayer);
 * ```
 */
export function defineEslintConfig(
  options: EslintConfigOptions = {},
  ...userConfigs: Linter.Config[]
): Linter.Config[] {
  const {
    type = "app",
    react: enableReact = false,
    tailwind: tailwindEntryPoint,
    ignores: userIgnores = []
  } = options;

  const layers: Linter.Config[][] = [
    // strict:false — a consumer without any .gitignore (for example, a new project) must not crash
    // the whole lint run; it degrades to no ignores.
    [{ ...gitignore({ strict: false }), name: "coldsmirk/gitignore" }],
    ignores(userIgnores),
    // `typescript()` carries the eslint+tslint recommended baseline; `javascript()` (opinionated
    // core-rule overrides) MUST come after it so its re-enabled rules win over tslint's turn-offs.
    typescript(),
    javascript(),
    imports(),
    unicorn(),
    // MUST follow both `typescript()` and `unicorn()`: it turns their ESM-preference rules off for
    // CommonJS-by-extension files, and flat config is last-wins.
    commonjs(),
    regexp(),
    comments(),
    jsdoc(),
    antfu(),
    unusedImports(),
    stylistic(),
    // Vitest hygiene is framework-agnostic, so unlike the DOM test layer it is always on.
    vitest(),
    // Scoped to package.json / tsconfig files only (disjoint from source globs).
    packageJson(type),
    tsconfig()
  ];

  // The test layer (testing-library) is DOM/React-oriented, so it follows `react`.
  if (enableReact) {
    layers.push(react(), test());
  }

  // Independent of `react`: class strings live in plain .ts (cva / clsx / tv) as much as in .tsx.
  if (tailwindEntryPoint !== undefined) {
    layers.push(tailwindcss(tailwindEntryPoint));
  }

  // Project configs are appended AFTER canon's layers (flat config is last-wins), so a consumer can add
  // its own plugins/rules — and, where it must, override a canon rule for its own files — without an
  // outer defineConfig() wrap. The sealed baseline stays intact; the project layer is purely additive.
  return [...layers.flat(), ...userConfigs];
}
