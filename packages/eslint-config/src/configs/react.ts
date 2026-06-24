import type { Linter } from "eslint";

import reactPlugin from "@eslint-react/eslint-plugin";
import reactDom from "eslint-plugin-react-dom";
import reactHooks from "eslint-plugin-react-hooks";
import reactNamingConvention from "eslint-plugin-react-naming-convention";
import reactWebApi from "eslint-plugin-react-web-api";
import { defineConfig } from "eslint/config";

import { GLOB_SRC, GLOB_SRC_NO_TSX } from "../globs";
import { coldsmirkPlugin } from "../rules";

// React APIs/types must be named imports; the React.* namespace and string refs are banned, and JSX
// is confined to `.tsx`. These selectors extend the framework-agnostic `no-restricted-syntax` set in
// the `javascript` layer, so they live here and are only applied when React is enabled.
const STRING_REF_SELECTORS = [
  { selector: "JSXAttribute[name.name='ref'][value.type='Literal']", message: "Use callback refs or useRef instead of string refs." },
  { selector: "JSXAttribute[name.name='ref'] > JSXExpressionContainer > Literal", message: "Use callback refs or useRef instead of string refs." },
  { selector: "JSXAttribute[name.name='ref'] > JSXExpressionContainer > TemplateLiteral", message: "Use callback refs or useRef instead of string refs." }
] as const;

const REACT_NAMESPACE_MESSAGE = "Import from 'react' directly instead of using the React.* namespace.";

// Shared by both restricted-syntax sets: ban const enums, export-assignment, string refs, and
// React.* access via member / type expressions.
const RESTRICTED_BASE = [
  "TSEnumDeclaration[const=true]",
  "TSExportAssignment",
  ...STRING_REF_SELECTORS,
  { selector: "MemberExpression[object.name='React']", message: REACT_NAMESPACE_MESSAGE },
  { selector: "TSQualifiedName[left.name='React']", message: "Import the type from 'react' directly instead of using the React.* namespace." }
];

// Source files (incl. .tsx): base + ban React.* in JSX member expressions.
const reactRestrictedSyntax: Linter.RuleEntry = [
  "error",
  ...RESTRICTED_BASE,
  { selector: "JSXMemberExpression[object.name='React']", message: REACT_NAMESPACE_MESSAGE }
];

// Non-.tsx files: base + a blanket ban on any JSX element/fragment so JSX is confined to .tsx.
const noTsxRestrictedSyntax: Linter.RuleEntry = [
  "error",
  ...RESTRICTED_BASE,
  "JSXElement",
  "JSXFragment"
];

// Rules: https://eslint-react.xyz/docs/rules/overview
const reactRules: Linter.RulesRecord = {
  // canon's own autofixable JSX shorthands (see ../rules) — not shipped by @stylistic or @eslint-react.
  "coldsmirk/jsx-shorthand-boolean": "error",
  "coldsmirk/jsx-shorthand-fragment": "error",
  "react-dom/no-dangerously-set-innerhtml": "error",
  "react-dom/no-dangerously-set-innerhtml-with-children": "error",
  "react-dom/no-find-dom-node": "error",
  "react-dom/no-flush-sync": "error",
  "react-dom/no-hydrate": "error",
  "react-dom/no-missing-button-type": "error",
  "react-dom/no-missing-iframe-sandbox": "error",
  "react-dom/no-render": "error",
  "react-dom/no-render-return-value": "error",
  "react-dom/no-script-url": "error",
  "react-dom/no-string-style-prop": "error",
  "react-dom/no-unknown-property": ["error", { ignore: ["css"] }],
  "react-dom/no-unsafe-iframe-sandbox": "error",
  "react-dom/no-unsafe-target-blank": "error",
  "react-dom/no-use-form-state": "error",
  "react-dom/no-void-elements-with-children": "error",
  "@eslint-react/set-state-in-effect": "off",
  "@eslint-react/jsx-no-key-after-spread": "error",
  "@eslint-react/jsx-no-comment-textnodes": "error",
  "@eslint-react/jsx-no-useless-fragment": ["error", { allowExpressions: true }],
  "react-naming-convention/context-name": "error",
  "@eslint-react/globals": "error",
  "@eslint-react/no-access-state-in-setstate": "error",
  "@eslint-react/no-array-index-key": "off",
  "@eslint-react/no-children-for-each": "off",
  "@eslint-react/no-children-map": "off",
  "@eslint-react/no-children-to-array": "off",
  "@eslint-react/no-class-component": "error",
  "@eslint-react/no-clone-element": "off",
  "@eslint-react/no-component-will-mount": "error",
  "@eslint-react/no-component-will-receive-props": "error",
  "@eslint-react/no-component-will-update": "error",
  "@eslint-react/no-context-provider": "error",
  "@eslint-react/no-create-ref": "error",
  "@eslint-react/no-direct-mutation-state": "error",
  "@eslint-react/no-duplicate-key": "error",
  "@eslint-react/no-forward-ref": "error",
  "@eslint-react/no-missing-component-display-name": "error",
  "@eslint-react/no-missing-context-display-name": "error",
  "@eslint-react/no-missing-key": "error",
  "@eslint-react/no-nested-component-definitions": "error",
  "@eslint-react/no-set-state-in-component-did-mount": "error",
  "@eslint-react/no-set-state-in-component-did-update": "error",
  "@eslint-react/no-set-state-in-component-will-update": "error",
  "@eslint-react/no-unnecessary-use-prefix": "error",
  "@eslint-react/no-unsafe-component-will-mount": "error",
  "@eslint-react/no-unsafe-component-will-receive-props": "error",
  "@eslint-react/no-unsafe-component-will-update": "error",
  "@eslint-react/no-unstable-context-value": "error",
  "@eslint-react/no-unstable-default-props": "error",
  "@eslint-react/no-unused-class-component-members": "error",
  "@eslint-react/no-unused-state": "error",
  "@eslint-react/no-use-context": "error",
  "@eslint-react/unsupported-syntax": "error",
  "@eslint-react/use-state": [
    "error",
    {
      enforceAssignment: false,
      enforceLazyInitialization: true,
      enforceSetterName: false
    }
  ],
  "react-web-api/no-leaked-event-listener": "error",
  "react-web-api/no-leaked-fetch": "error",
  "react-web-api/no-leaked-intersection-observer": "error",
  "react-web-api/no-leaked-interval": "error",
  "react-web-api/no-leaked-resize-observer": "error",
  "react-web-api/no-leaked-timeout": "error"
};

// react-hooks v7 ships many compiler-era rules; keep only rules-of-hooks + exhaustive-deps on.
// Rules: https://react.dev/reference/eslint-plugin-react-hooks
const reactHooksRules: Linter.RulesRecord = {
  "react-hooks/component-hook-factories": "off",
  "react-hooks/config": "off",
  "react-hooks/error-boundaries": "off",
  "react-hooks/exhaustive-deps": ["error", { additionalHooks: "^use(Deep|Shallow|Isomorphic)|^useDidUpdate" }],
  "react-hooks/gating": "off",
  "react-hooks/globals": "off",
  "react-hooks/immutability": "off",
  "react-hooks/incompatible-library": "off",
  "react-hooks/preserve-manual-memoization": "off",
  "react-hooks/purity": "off",
  "react-hooks/refs": "off",
  "react-hooks/rules-of-hooks": "error",
  "react-hooks/set-state-in-effect": "off",
  "react-hooks/set-state-in-render": "off",
  "react-hooks/static-components": "off",
  "react-hooks/unsupported-syntax": "off",
  "react-hooks/use-memo": "off"
};

// Uses `extends` (like typescript()) rather than the single-block flatten: @eslint-react's
// recommended-typescript preset carries its own settings/languageOptions and file scoping that
// must be preserved. The React plugins are bundled dependencies, so they're imported statically.
export function react(): Linter.Config[] {
  return defineConfig(
    {
      name: "coldsmirk/react",
      files: GLOB_SRC,
      extends: [
        reactPlugin.configs["recommended-typescript"],
        // The recommended-typescript preset re-exports the react-dom / react-web-api /
        // react-naming-convention rules under `@eslint-react/{dom,web-api,naming-convention}-*`
        // aliases. The standalone plugins below cover them at error, so turn the aliases off via
        // upstream's own disable-* configs to avoid double-reporting — these stay in sync as the
        // upstream rule sets change, unlike a hand-maintained list.
        reactPlugin.configs["disable-dom"],
        reactPlugin.configs["disable-web-api"],
        reactPlugin.configs["disable-naming-convention"],
        reactHooks.configs.flat.recommended
      ],
      plugins: {
        coldsmirk: coldsmirkPlugin,
        "react-dom": reactDom,
        "react-naming-convention": reactNamingConvention,
        "react-web-api": reactWebApi
      },
      rules: {
        ...reactRules,
        ...reactHooksRules,
        "no-restricted-syntax": reactRestrictedSyntax
      }
    },
    {
      name: "coldsmirk/react/no-jsx-outside-tsx",
      files: GLOB_SRC_NO_TSX,
      rules: {
        "no-restricted-syntax": noTsxRestrictedSyntax
      }
    }
  );
}
