export interface EslintConfigOptions {
  /**
   * Project nature — the global strictness axis. `"lib"` is strict (publishable `package.json`
   * field requirements); `"app"` is lenient.
   *
   * @default "app"
   */
  type?: "app" | "lib";
  /**
   * Enable React support: `@eslint-react` (recommended-typescript), react-hooks, react-dom /
   * react-web-api / react-naming-convention, the JSX restrictions, and the test layer (jest-dom +
   * testing-library on test files). All plugins are bundled — no extra install. Test linting
   * follows this flag.
   *
   * @default false
   */
  react?: boolean;
  /**
   * Extra ignore globs, merged into the default (`**\/dist\/**`). For files that should not be
   * linted but aren't in `.gitignore` (committed generated output, vendored code, etc.). This is
   * file scoping, not rule customization.
   */
  ignores?: string[];
}
