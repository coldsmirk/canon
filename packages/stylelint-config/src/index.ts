import type { Config } from "stylelint";

import propertyGroups from "stylelint-config-recess-order/groups";

export interface StylelintConfigOptions {
  /**
   * Enable SCSS support: swap the CSS base preset for `stylelint-config-standard-scss` and turn on the
   * `scss/*` correctness + hygiene rules. Leave off for plain `.css` projects.
   *
   * @default false
   */
  scss?: boolean;
}

// ============================================================================
// Rule Definitions
// ============================================================================

const ALLOWED_UNITS = ["px", "em", "rem", "%", "vw", "vh", "fr", "deg", "rad", "grad", "turn", "ms", "s"];

// Recess property ordering, with no blank lines inserted between groups.
const orderRules: Config["rules"] = {
  "order/order": ["dollar-variables", "at-variables", "custom-properties", "less-mixins", "declarations", "at-rules", "rules"],
  "order/properties-order": propertyGroups.map(group => {
    return {
      ...group,
      emptyLineBefore: "never",
      noEmptyLineBetween: true
    };
  })
};

const declarationRules: Config["rules"] = {
  "declaration-empty-line-before": "never",
  "declaration-property-value-no-unknown": [true, { ignoreProperties: {} }]
};

const colorRules: Config["rules"] = {
  "color-hex-alpha": "never",
  "color-hex-length": "long",
  "color-named": "never"
};

// `:global` is a CSS-modules pseudo-class the parser doesn't know natively (applies to .css and .scss).
const selectorRules: Config["rules"] = {
  "selector-pseudo-class-no-unknown": [true, { ignorePseudoClasses: ["global"] }]
};

const valueRules: Config["rules"] = {
  "number-max-precision": null,
  "unit-allowed-list": ALLOWED_UNITS
};

// Correctness + hygiene that applies to plain CSS and SCSS alike: nesting discipline, deprecated
// selectors, notation consistency, and LF line endings.
const cssHygieneRules: Config["rules"] = {
  "declaration-no-important": true,
  "display-notation": "short",
  "font-weight-notation": ["numeric", { ignore: ["relative"] }],
  "max-nesting-depth": [3, { ignoreAtRules: ["media", "supports"] }],
  "relative-selector-nesting-notation": "explicit",
  "selector-no-deprecated": true,
  "selector-no-qualifying-type": [true, { ignore: ["attribute"] }],
  "@stylistic/linebreaks": "unix",
  "@stylistic/named-grid-areas-alignment": true
};

// Extra @stylistic locks beyond the preset, all tightening the layout further. Five forbid a break
// BEFORE a comma/semicolon ("never-multi-line"), complementing the preset's *-newline-after twins so
// the delimiter stays attached to the preceding token (no comma-first / semicolon-first) across
// selector lists, function args, declarations, value lists and media queries. Plus: no space before an
// at-rule's `;`, and no UTF-8 BOM. Some are report-only — stylelint ships no fixer, so they error
// rather than auto-fix; that is the accepted cost of maximum strictness (the declaration / function /
// selector before-rules DO auto-fix; value-list, media-query, at-rule-semicolon-space and BOM do not).
const stylisticRules: Config["rules"] = {
  "@stylistic/declaration-block-semicolon-newline-before": "never-multi-line",
  "@stylistic/function-comma-newline-before": "never-multi-line",
  "@stylistic/selector-list-comma-newline-before": "never-multi-line",
  "@stylistic/value-list-comma-newline-before": "never-multi-line",
  "@stylistic/media-query-list-comma-newline-before": "never-multi-line",
  "@stylistic/at-rule-semicolon-space-before": "never",
  "@stylistic/unicode-bom": "never"
};

// SCSS-only: module/interpolation/calc correctness plus variable & member hygiene. The core
// `at-rule-no-unknown` / `function-no-unknown` / `declaration-property-value-no-unknown` / `property-no-unknown`
// are turned off in favour of their SCSS-aware twins (which understand `$vars`, namespaced functions, Sass
// math and nested-property longhands), and `selector-class-pattern` is swapped for the interpolation-aware
// variant. (standard-scss already nulls the first three; canon re-states them so the whole "core off →
// scss/* on" set lives in one place and stays correct even if the upstream preset changes.)
const scssRules: Config["rules"] = {
  "at-rule-no-unknown": null,
  "declaration-property-value-no-unknown": null,
  "function-no-unknown": null,
  "property-no-unknown": null,
  "selector-class-pattern": null,
  "scss/at-mixin-no-risky-nesting-selector": true,
  "scss/at-root-no-redundant": true,
  "scss/at-rule-no-unknown": [true, { ignoreAtRules: ["extend", "include"] }],
  "scss/at-use-no-redundant-alias": true,
  "scss/at-use-no-unnamespaced": true,
  "scss/block-no-redundant-nesting": true,
  "scss/declaration-property-value-no-unknown": true,
  "scss/dimension-no-non-numeric-values": true,
  "scss/dollar-variable-default": [true, { ignore: "local" }],
  "scss/dollar-variable-no-namespaced-assignment": true,
  "scss/function-calculation-no-interpolation": true,
  "scss/function-color-channel": true,
  "scss/function-color-relative": true,
  "scss/function-no-unknown": [true, { ignoreFunctions: [] }],
  "scss/no-duplicate-dollar-variables": true,
  "scss/no-duplicate-load-rules": true,
  "scss/no-unused-private-members": true,
  "scss/partial-no-import": true,
  "scss/property-no-unknown": true,
  "scss/selector-class-pattern": "^([a-z][a-z0-9]*)(-[a-z0-9]+)*$"
};

// ============================================================================
// Main Configuration
// ============================================================================

/**
 * Build the opinionated Stylelint config: `stylelint-config-standard` + `@stylistic/stylelint-config`,
 * plus recess property ordering and a curated set of color/unit/selector/nesting rules. Set
 * `scss: true` to swap the base for `stylelint-config-standard-scss` and enable the `scss/*` layer.
 * Sealed — rules are not configurable; the only knob is `scss`.
 *
 * @example
 * ```ts
 * export default defineStylelintConfig();              // plain CSS
 * export default defineStylelintConfig({ scss: true }); // SCSS
 * ```
 */
export function defineStylelintConfig(options: StylelintConfigOptions = {}): Config {
  const { scss = false } = options;

  return {
    extends: [scss ? "stylelint-config-standard-scss" : "stylelint-config-standard", "@stylistic/stylelint-config"],
    plugins: ["stylelint-order"],
    rules: {
      ...orderRules,
      ...declarationRules,
      ...colorRules,
      ...selectorRules,
      ...valueRules,
      ...cssHygieneRules,
      ...stylisticRules,
      ...scss ? scssRules : {}
    }
  };
}
