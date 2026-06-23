import type { Linter } from "eslint";

import type { EslintConfigOptions } from "./types";

import gitignore from "eslint-config-flat-gitignore";

import {
  antfu,
  comments,
  ignores,
  imports,
  javascript,
  jsdoc,
  packageJson,
  react,
  regexp,
  stylistic,
  test,
  tsconfig,
  typescript,
  unicorn,
  unusedImports
} from "./configs";

/**
 * Build the opinionated ESLint flat config. The options object selects features (`type`, `react`) and
 * adds project ignore globs (`ignores`) — that is the entire surface. Rules are deliberately NOT
 * configurable: this is a sealed, take-it-or-leave-it config. The React and test plugins are bundled,
 * so a React project needs no extra installs — just set `react: true`.
 *
 * @example
 * ```ts
 * export default defineEslintConfig();                              // private TS app (lenient package.json)
 * export default defineEslintConfig({ type: "lib" });               // published TS library (strict package.json)
 * export default defineEslintConfig({ react: true });               // React app
 * export default defineEslintConfig({ type: "lib", react: true });  // React library
 * ```
 */
export function defineEslintConfig(options: EslintConfigOptions = {}): Linter.Config[] {
  const {
    type = "app",
    react: enableReact = false,
    ignores: userIgnores = []
  } = options;

  const layers: Linter.Config[][] = [
    // strict:false — a consumer without a root .gitignore (new project / monorepo sub-package) must
    // not crash the whole lint run; it degrades to no ignores.
    [{ ...gitignore({ root: true, strict: false }), name: "coldsmirk/gitignore" }],
    ignores(userIgnores),
    // `typescript()` carries the eslint+tslint recommended baseline; `javascript()` (opinionated
    // core-rule overrides) MUST come after it so its re-enabled rules win over tslint's turn-offs.
    typescript(),
    javascript(),
    imports(),
    unicorn(),
    regexp(),
    comments(),
    jsdoc(),
    antfu(),
    unusedImports(),
    stylistic(),
    // Scoped to package.json / tsconfig files only (disjoint from source globs).
    packageJson(type),
    tsconfig()
  ];

  // The test layer (jest-dom + testing-library) is DOM/React-oriented, so it follows `react`.
  if (enableReact) {
    layers.push(react(), test());
  }

  return layers.flat();
}
