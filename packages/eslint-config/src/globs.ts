// File-glob constants shared across config factories. Kept identical to the patterns the
// source repos used so a migrated config resolves byte-for-byte the same rules per file.

/**
 * All lintable source: TS/TSX/JS/JSX.
 */
export const GLOB_SRC = ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"];

/**
 * Source minus `.tsx` — where JSX is disallowed (JSX is confined to `.tsx`).
 */
export const GLOB_SRC_NO_TSX = ["**/*.ts", "**/*.js", "**/*.jsx"];

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
