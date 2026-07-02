// File-glob constants shared across config factories. Extensions are listed explicitly (no
// `?([cm])` extglob) so the covered set is readable at a glance.

/**
 * All lintable source: TS/TSX/JS/JSX plus the `.mts`/`.cts`/`.mjs`/`.cjs` module-variant
 * extensions. The variants MUST be listed: ESLint lints `.mjs`/`.cjs` by default, so leaving them
 * out means those files pass with zero rules applied — silently; `.mts`/`.cts` would not be linted
 * at all. CommonJS idioms in `.cjs`/`.cts` are exempted separately (see `commonjs()`).
 */
export const GLOB_SRC = ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts", "**/*.js", "**/*.jsx", "**/*.mjs", "**/*.cjs"];

/**
 * Source minus `.tsx` — where JSX is disallowed (JSX is confined to `.tsx`).
 */
export const GLOB_SRC_NO_TSX = ["**/*.ts", "**/*.mts", "**/*.cts", "**/*.js", "**/*.jsx", "**/*.mjs", "**/*.cjs"];

/**
 * CommonJS-by-extension files: the extension itself declares the module system, so ESM-preference
 * rules are noise here.
 */
export const GLOB_COMMONJS = ["**/*.cjs", "**/*.cts"];

/**
 * Colocated tests. Uses the `.test.` convention (the Jest/Vitest/React ecosystem default), not
 * `.spec.` — name test files `foo.test.ts` / `foo.test.tsx`.
 */
export const GLOB_TEST = ["**/*.test.{ts,tsx}"];

/**
 * Build output — always ignored, even though `.gitignore` usually covers it too.
 */
export const GLOB_DIST = ["**/dist/**"];

/**
 * tsconfig files: the root config plus variants like `tsconfig.build.json`.
 */
export const GLOB_TSCONFIG = ["**/tsconfig.json", "**/tsconfig.*.json"];
