import type { Linter } from "eslint";

import { GLOB_DIST } from "../globs";

// Global ignores applied to every config block. `.gitignore` is honoured separately via
// eslint-config-flat-gitignore (see the factory); dist is listed explicitly so a stray build output
// is never linted even when not git-ignored. `userIgnores` covers files that shouldn't be linted but
// aren't git-ignored (committed generated output, vendored code, …).
export function ignores(userIgnores: string[] = []): Linter.Config[] {
  return [
    {
      name: "coldsmirk/ignores",
      ignores: [...GLOB_DIST, ...userIgnores]
    }
  ];
}
