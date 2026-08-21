export interface ClasscheckConfig {
  /**
   * The project's Tailwind CSS v4 entry stylesheet (the `.css` file containing
   * `@import "tailwindcss"`), relative to the config file's directory (the lint cwd). The language
   * server compiles this real entry point, so every check answers with the project's actual theme
   * and utilities. Class selectors written directly in this file are automatically allowed.
   */
  entry: string;
  /**
   * Directories scanned for source: `.ts`/`.tsx` files contribute class tokens to the typo sweep,
   * `.css` files receive the server's own stylesheet diagnostics. Relative to the lint cwd.
   *
   * @default ["src"]
   */
  source?: string[];
  /**
   * Hand-written stylesheets whose class selectors are legal to use from markup (a design system's
   * own `.css` files). Their selectors form the allowlist for the typo sweep — which also means a
   * typo in one of *those* names fails. Relative to the lint cwd; always themselves checked by the
   * stylesheet pass, even when outside `source`.
   *
   * @default []
   */
  allowFrom?: string[];
  /**
   * Extra class names that are legal even though no stylesheet in the project defines them —
   * classes a third-party script toggles at runtime, for example. Prefer `allowFrom`: a name
   * listed here is vouched for by nobody.
   *
   * @default []
   */
  allow?: string[];
}

export interface ClasscheckFinding {
  /**
   * Absolute path of the file the finding is in.
   */
  file: string;
  /**
   * 1-based line.
   */
  line: number;
  message: string;
}

export interface ClasscheckResult {
  /**
   * Deduplicated findings, sorted by file, line, message.
   */
  findings: ClasscheckFinding[];
  /**
   * Files checked (stylesheet pass + token extraction).
   */
  files: number;
  /**
   * Unique class tokens probed in the typo sweep.
   */
  classes: number;
}
