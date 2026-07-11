import type { Linter } from "eslint";

import reactPlugin from "@eslint-react/eslint-plugin";
import reactDom from "eslint-plugin-react-dom";
import reactNamingConvention from "eslint-plugin-react-naming-convention";
import reactWebApi from "eslint-plugin-react-web-api";
import { defineConfig } from "eslint/config";

import { GLOB_SRC, GLOB_SRC_NO_TSX } from "../globs";
import { coldsmirkPlugin } from "../rules";
import { RESTRICTED_SYNTAX_BASE } from "./javascript";

// React APIs/types must be named imports; the React.* namespace and string refs are banned, and JSX
// is confined to `.tsx`. These selectors extend the framework-agnostic `no-restricted-syntax` set in
// the `javascript` layer, so they live here and are only applied when React is enabled.
const STRING_REF_SELECTORS = [
  { selector: "JSXAttribute[name.name='ref'][value.type='Literal']", message: "Use callback refs or useRef instead of string refs." },
  { selector: "JSXAttribute[name.name='ref'] > JSXExpressionContainer > Literal", message: "Use callback refs or useRef instead of string refs." },
  { selector: "JSXAttribute[name.name='ref'] > JSXExpressionContainer > TemplateLiteral", message: "Use callback refs or useRef instead of string refs." }
] as const;

const REACT_NAMESPACE_MESSAGE = "Import from 'react' directly instead of using the React.* namespace.";

// Shared by both restricted-syntax sets: the framework-agnostic base (imported from the javascript
// layer, which this rule entry replaces wholesale — see RESTRICTED_SYNTAX_BASE), plus string refs
// and React.* access via member / type expressions.
const RESTRICTED_BASE = [
  ...RESTRICTED_SYNTAX_BASE,
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
  // Off: false-positives on stable components obtained from hooks/context (e.g. TanStack Form's
  // `<form.Field>` / `<Subscribe>` via useFormContext) — it can't tell them from inline definitions.
  "@eslint-react/static-components": "off",
  "@eslint-react/jsx-no-key-after-spread": "error",
  "@eslint-react/jsx-no-comment-textnodes": "error",
  // Off: it decides fragment-ness by NAME (jsxFragmentFactory, default `Fragment`) with no
  // import-source check, and its autofix then unwraps a local/third-party `<Fragment>` component —
  // deleting real rendered output. Same misfiring-autofix category as the unicorn turn-offs;
  // coldsmirk/jsx-shorthand-fragment covers the shorthand half import-aware.
  "@eslint-react/jsx-no-useless-fragment": "off",
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

// Hooks discipline comes from @eslint-react's NATIVE ports of the react-hooks rules — running a
// separate eslint-plugin-react-hooks alongside the preset double-reports every finding (upstream
// even ships `disable-conflict-eslint-plugin-react-hooks` for that split, disabling the standalone
// plugin, not its own rules). Keep only the two classics on: exhaustive-deps is raised from the
// preset's warn to error, and the compiler-era additions (purity / use-memo / set-state-in-render /
// error-boundaries / set-state-in-effect) stay off — they assume React Compiler semantics.
// Rules: https://eslint-react.xyz/docs/rules/overview
const hooksRules: Linter.RulesRecord = {
  "@eslint-react/error-boundaries": "off",
  "@eslint-react/exhaustive-deps": ["error", { additionalHooks: "^use(Deep|Shallow|Isomorphic)|^useDidUpdate" }],
  "@eslint-react/purity": "off",
  "@eslint-react/rules-of-hooks": "error",
  "@eslint-react/set-state-in-effect": "off",
  "@eslint-react/set-state-in-render": "off",
  "@eslint-react/use-memo": "off"
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
        reactPlugin.configs["disable-naming-convention"]
      ],
      plugins: {
        coldsmirk: coldsmirkPlugin,
        "react-dom": reactDom,
        "react-naming-convention": reactNamingConvention,
        "react-web-api": reactWebApi
      },
      // canon's React axis targets React 19+. Pin the minimum supported semantics instead of using
      // upstream's cwd-based detection, which is unreliable when React lives in a leaf workspace.
      settings: {
        "react-x": { version: "19.0.0" }
      },
      rules: {
        ...reactRules,
        ...hooksRules,
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
