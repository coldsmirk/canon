import type { Config } from "stylelint";

import { fileURLToPath } from "node:url";

import { resolve as importMetaResolve } from "import-meta-resolve";
import propertyGroups from "stylelint-config-recess-order/groups";

// stylelint resolves bare `extends`/`plugins` names from the CONSUMER's config-file location,
// where this package's own dependencies are invisible under pnpm's strict isolation — a bare
// "stylelint-config-standard" fails there with `Could not find`. Resolve every preset/plugin to
// an absolute path from HERE instead, using the same ESM resolver stylelint itself uses.
// `import-meta-resolve` (a regular dependency) is preferred over the native `import.meta.resolve`,
// which module runners like Vitest and jiti don't reliably provide.
const resolveHere = (id: string): string => fileURLToPath(importMetaResolve(id, import.meta.url));

export interface StylelintConfigOptions {
  /**
   * Enable SCSS support: swap the CSS base preset for `stylelint-config-standard-scss` and turn on the
   * `scss/*` correctness + hygiene rules. Leave off for plain `.css` projects.
   *
   * @default false
   */
  scss?: boolean;
  /**
   * Enable Tailwind CSS v4 authoring support: allow the Tailwind at-rules (`@theme`, `@utility`,
   * `@variant`, `@custom-variant`, `@apply`, `@reference`, `@source`, plus the compat `@config` /
   * `@plugin`), the Tailwind value functions (`--alpha()` / `--spacing()` / compat `theme()`), and
   * `@theme` namespace resets (`--color-*: initial`, `--*: initial`). Composes with `scss` — there
   * the allowances land on the `scss/*` twin rules. Leave off for projects without Tailwind.
   *
   * @default false
   */
  tailwind?: boolean;
}

// ============================================================================
// Rule Definitions
// ============================================================================

// Includes `ch` (monospace/typographic sizing) and the full viewport family: every axis
// (w/h/min/max plus the logical i/b) across all four prefixes (v/dv/sv/lv — the dynamic/small/
// large variants are the correct answer to mobile browser chrome). Family-complete on purpose:
// allowing dvh but rejecting dvmin would force the disable comment a sealed config must not.
const VIEWPORT_UNITS = ["v", "dv", "sv", "lv"].flatMap(prefix => ["w", "h", "min", "max", "i", "b"].map(axis => `${prefix}${axis}`));

const ALLOWED_UNITS = ["px", "em", "rem", "ch", "%", ...VIEWPORT_UNITS, "fr", "deg", "rad", "grad", "turn", "ms", "s"];

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

// ============================================================================
// Tailwind v4 Layer
// ============================================================================

// Shared by the SCSS layer's scss/at-rule-no-unknown and the Tailwind layer's merged override, so
// the SCSS allowance set cannot drift between the two entries.
const SCSS_IGNORED_AT_RULES = ["extend", "include"];

// The Tailwind v4 at-rule surface, family-complete on purpose (allowing @theme but rejecting
// @custom-variant would force the disable comment a sealed config must not): the v4 authoring
// at-rules plus the two documented v3-compat bridges (@config / @plugin). The removed v3
// `@tailwind` directive is deliberately NOT here — in a v4 project it is dead code and should be
// flagged, exactly what at-rule-no-unknown will do.
const TAILWIND_AT_RULES = ["apply", "config", "custom-variant", "plugin", "reference", "source", "theme", "utility", "variant"];
const TAILWIND_NESTING_AT_RULES = ["custom-variant", "utility", "variant"];

// Tailwind v4 value functions plus the documented v3-compat theme(). screen() is not listed: it
// only appears in media-query preludes, which function-no-unknown does not inspect.
const TAILWIND_FUNCTIONS = ["--alpha", "--spacing", "theme"];

// standard's kebab-case pattern, widened with the two wildcard forms Tailwind's @theme uses for
// namespace resets: `--color-*: initial` (one namespace) and `--*: initial` (the whole default
// theme). The wildcard is part of the *name*, so only the name pattern can admit it.
const TAILWIND_CUSTOM_PROPERTY_PATTERN = String.raw`^(\*|[a-z][a-z0-9]*(-[a-z0-9]+)*(-\*)?)$`;

// declaration-property-value-no-unknown matches values against csstree's grammar, which cannot be
// taught the Tailwind functions (no ignoreFunctions option). Exempt only VALUES containing one of
// them — on any property — so the grammar check stays alive for every other declaration;
// function-name typos remain caught by (scss/)function-no-unknown, whose allow-list is exact.
const TAILWIND_VALUE_IGNORES = { "/./": [String.raw`/--alpha\(|--spacing\(|\btheme\(/`] };

/**
 * Tailwind allowances, targeted at whichever `*-no-unknown` family is active: the core rules in
 * CSS mode, their `scss/` twins when the SCSS layer has swapped the cores off. Shared entries:
 * `at-rule-no-deprecated` must exempt `@apply` (it collides with the abandoned CSS `@apply`
 * proposal the rule knows as deprecated), and `custom-property-pattern` (never swapped by the
 * SCSS layer) admits the wildcard reset names.
 */
function tailwindRules(scss: boolean): Config["rules"] {
  return {
    "at-rule-no-deprecated": [true, { ignoreAtRules: ["apply"] }],
    // Tailwind's block-form `@utility` / `@custom-variant` (and `@variant`) put `&` directly
    // inside the at-rule — in v4 the at-rule IS the scoping root, so exempt the family. The rule
    // is a core rule in both CSS and SCSS modes (the SCSS layer never swaps it), so this shared
    // entry covers both.
    "nesting-selector-no-missing-scoping-root": [
      true,
      { ignoreAtRules: [...scss ? ["mixin"] : [], ...TAILWIND_NESTING_AT_RULES] }
    ],
    "custom-property-pattern": [
      TAILWIND_CUSTOM_PROPERTY_PATTERN,
      { message: "Expected custom property name to be kebab-case (a Tailwind @theme wildcard reset like \"--color-*\" is also allowed)" }
    ],
    ...scss
      ? {
          "scss/at-rule-no-unknown": [true, { ignoreAtRules: [...SCSS_IGNORED_AT_RULES, ...TAILWIND_AT_RULES] }],
          "scss/declaration-property-value-no-unknown": [true, { ignoreProperties: TAILWIND_VALUE_IGNORES }],
          "scss/function-no-unknown": [true, { ignoreFunctions: TAILWIND_FUNCTIONS }]
        }
      : {
          "at-rule-no-unknown": [true, { ignoreAtRules: TAILWIND_AT_RULES }],
          "declaration-property-value-no-unknown": [true, { ignoreProperties: TAILWIND_VALUE_IGNORES }],
          "function-no-unknown": [true, { ignoreFunctions: TAILWIND_FUNCTIONS }],
          // Tailwind's documented form is `@import "tailwindcss";` — string notation everywhere in
          // the v4 ecosystem — while the standard preset demands url(). CSS mode only: in SCSS the
          // sass import story is governed by standard-scss, which we must not re-enable over.
          "import-notation": "string"
        }
  };
}

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
  "scss/at-rule-no-unknown": [true, { ignoreAtRules: SCSS_IGNORED_AT_RULES }],
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
 * `scss: true` to swap the base for `stylelint-config-standard-scss` and enable the `scss/*` layer;
 * set `tailwind: true` to admit the Tailwind CSS v4 authoring surface (at-rules, value functions,
 * `@theme` wildcard resets). Sealed — rules are not configurable; the only knobs are `scss` and
 * `tailwind`.
 *
 * @example
 * ```ts
 * export default defineStylelintConfig();                   // plain CSS
 * export default defineStylelintConfig({ scss: true });     // SCSS
 * export default defineStylelintConfig({ tailwind: true }); // Tailwind v4 CSS
 * ```
 */
export function defineStylelintConfig(options: StylelintConfigOptions = {}): Config {
  const { scss = false, tailwind = false } = options;

  return {
    extends: [resolveHere(scss ? "stylelint-config-standard-scss" : "stylelint-config-standard"), resolveHere("@stylistic/stylelint-config")],
    plugins: [resolveHere("stylelint-order")],
    rules: {
      ...orderRules,
      ...declarationRules,
      ...colorRules,
      ...selectorRules,
      ...valueRules,
      ...cssHygieneRules,
      ...stylisticRules,
      // The Tailwind layer spreads AFTER the SCSS layer: its scss/* overrides must win over the
      // SCSS layer's own scss/at-rule-no-unknown & scss/function-no-unknown entries.
      ...scss && scssRules,
      ...tailwind && tailwindRules(scss)
    }
  };
}
