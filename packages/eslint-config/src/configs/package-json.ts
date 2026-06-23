import type { Linter } from "eslint";

import packageJsonPlugin from "eslint-plugin-package-json";

// Publish-oriented field requirements that don't apply to private apps; relaxed when type is "app".
const PUBLISH_ONLY_RULES = [
  "package-json/require-attribution",
  "package-json/require-description",
  "package-json/require-exports",
  "package-json/require-files",
  "package-json/require-license",
  "package-json/require-repository",
  "package-json/require-sideEffects"
];

// Correctness/hygiene that applies to both app and lib (not publish-gated): ban `file:`/`link:`/
// relative local deps that break registry installs, and forbid publish-only fields on private packages.
const ALWAYS_RULES: Linter.RulesRecord = {
  "package-json/no-local-dependencies": "error",
  "package-json/restrict-private-properties": "error"
};

/**
 * package.json hygiene, validation, and key ordering via eslint-plugin-package-json. `"lib"` uses
 * the strict `recommended-publishable` preset; `"app"` uses the baseline `recommended` preset minus
 * the publish-only field requirements (a private app has no exports/files/license to require). Both
 * add `order-properties` (from the `stylistic` preset) so top-level keys are sorted. The presets are
 * self-contained — they set the `**\/package.json` glob, the jsonc parser, and the plugin.
 */
export function packageJson(type: "app" | "lib" = "app"): Linter.Config[] {
  const preset = type === "lib" ? packageJsonPlugin.configs["recommended-publishable"] : packageJsonPlugin.configs.recommended;

  const relaxed: Linter.RulesRecord = {};

  if (type === "app") {
    for (const rule of PUBLISH_ONLY_RULES) {
      relaxed[rule] = "off";
    }
  }

  return [
    {
      ...preset,
      name: "coldsmirk/package-json",
      rules: {
        ...preset.rules,
        ...packageJsonPlugin.configs.stylistic.rules,
        ...ALWAYS_RULES,
        ...relaxed
      }
    }
  ];
}
