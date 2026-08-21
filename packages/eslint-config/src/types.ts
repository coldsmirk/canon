export interface EslintConfigOptions {
  /**
   * Project nature — the global strictness axis. `"lib"` is strict (publishable `package.json`
   * field requirements); `"app"` is lenient.
   *
   * @default "app"
   */
  type?: "app" | "lib";
  /**
   * Enable React 19+ support: `@eslint-react` (recommended-typescript, including its native
   * rules-of-hooks / exhaustive-deps), react-dom / react-web-api / react-naming-convention, the
   * JSX restrictions, and the DOM test layer (testing-library on test files). All plugins are
   * bundled — no extra install.
   * Vitest hygiene on test files is framework-agnostic and always on, independent of this flag.
   *
   * @default false
   */
  react?: boolean;
  /**
   * Enable Tailwind CSS v4 support by passing the project's Tailwind entry stylesheet (the `.css`
   * file containing `@import "tailwindcss"`). Absolute paths are safest: the plugin resolves a
   * RELATIVE path per linted file, against the nearest directory up the tree holding an
   * `eslint.config.*` or `package.json` — the repo root in a single-project repo, but each
   * package's own root when a monorepo lints from the top. The path is mandatory because the
   * plugin compiles that real entry point to learn the project's theme and utilities — there is
   * no reliable default. Adds `eslint-plugin-tailwindcss` class hygiene on source files:
   * compiler-exact class ordering, shorthand merging, contradiction detection, `!` suffix
   * placement. The plugin is bundled like every other one; at lint time it compiles against the
   * project's own `tailwindcss` v4 install, resolved from the lint cwd.
   */
  tailwind?: string;
  /**
   * Extra ignore globs, merged into the default (`**\/dist\/**`). For files that should not be
   * linted but aren't in `.gitignore` (committed generated output, vendored code, etc.). This is
   * file scoping, not rule customization.
   */
  ignores?: string[];
}
