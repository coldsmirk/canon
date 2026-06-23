import type { Linter } from "eslint";

import importLite from "eslint-plugin-import-lite";
import perfectionist from "eslint-plugin-perfectionist";

import { GLOB_SRC } from "../globs";
import { flattenConfig } from "../utils";

// Lightweight import hygiene (import-lite, NOT eslint-plugin-import).
// Rules: https://github.com/9romise/eslint-plugin-import-lite
const importRules: Linter.RulesRecord = {
  "import-lite/consistent-type-specifier-style": ["error", "top-level"],
  "import-lite/first": "error",
  "import-lite/newline-after-import": ["error", { count: 1 }],
  "import-lite/no-duplicates": "error",
  "import-lite/no-mutable-exports": "error",
  "import-lite/no-named-default": "error"
};

// Deterministic ordering of imports/exports/jsx-props. Rules: https://perfectionist.dev/rules
const perfectionistRules: Linter.RulesRecord = {
  "perfectionist/sort-exports": ["error", { order: "asc", type: "natural" }],
  "perfectionist/sort-imports": [
    "error",
    {
      groups: [
        "type-import",
        ["type-internal", "type-parent", "type-sibling", "type-index"],
        "value-builtin",
        "value-external",
        "value-internal",
        ["value-parent", "value-sibling", "value-index"],
        ["value-side-effect", "value-side-effect-style"],
        "unknown"
      ],
      newlinesBetween: 1,
      order: "asc",
      type: "natural"
    }
  ],
  "perfectionist/sort-jsx-props": [
    "error",
    {
      customGroups: [
        { elementNamePattern: "^(key|ref)$", groupName: "reserved" },
        { elementNamePattern: "^on.+", groupName: "callback" }
      ],
      groups: ["reserved", "shorthand-prop", "unknown", "multiline-prop", "callback"],
      ignoreCase: true,
      order: "asc",
      type: "natural"
    }
  ],
  "perfectionist/sort-named-exports": [
    "error",
    {
      groups: ["value-export", "type-export"],
      newlinesBetween: "ignore",
      order: "asc",
      type: "natural"
    }
  ],
  "perfectionist/sort-named-imports": [
    "error",
    {
      groups: ["value-import", "type-import"],
      newlinesBetween: "ignore",
      order: "asc",
      type: "natural"
    }
  ]
};

export function imports(): Linter.Config[] {
  return [
    flattenConfig("coldsmirk/imports", GLOB_SRC, [importLite.configs.recommended], {
      plugins: { perfectionist },
      rules: {
        ...importRules,
        ...perfectionistRules
      }
    })
  ];
}
