# @coldsmirk/stylelint-config

Opinionated [Stylelint](https://stylelint.io/) config for CSS and SCSS: `stylelint-config-standard` (or `stylelint-config-standard-scss` via the `scss` option) + `@stylistic/stylelint-config`, with [recess](https://github.com/stormwarning/stylelint-config-recess-order) property ordering and a curated set of color / unit / selector / nesting rules.

## Install

```bash
pnpm add -D stylelint @coldsmirk/stylelint-config
```

Requires Stylelint **>= 17** and Node **>= 22**.

## Usage

`stylelint.config.js` (or `.mjs` / `.ts`). The default is **plain CSS**; pass `scss: true` for SCSS:

```ts
import { defineStylelintConfig } from "@coldsmirk/stylelint-config";

// Plain CSS
export default defineStylelintConfig();

// SCSS
export default defineStylelintConfig({ scss: true });
```

Add a lint script:

```jsonc
{
  // plain CSS — or "**/*.{css,scss}" when using scss: true
  "scripts": { "lint:css": "stylelint \"**/*.css\"" }
}
```

## Options

```ts
defineStylelintConfig({
  scss: false // enable SCSS: swaps the base to standard-scss and turns on the scss/* layer. Default: false
});
```

`scss` is the only knob — like the `react` axis in `@coldsmirk/eslint-config`, SCSS support is opt-in. Rules are otherwise **not configurable** (sealed).

## What it enforces (highlights)

- **Property order**: recess ordering (`stylelint-order`), no blank lines between groups.
- **Colors**: lowercase, long hex, no `alpha` in hex, no named colors.
- **Units**: restricted to a sensible allow-list (`px em rem % vw vh fr deg rad grad turn ms s`).
- **SCSS** (with `scss: true`): standard-scss + a `scss/*` correctness layer — `@use`/`@forward` module hygiene, interpolation / `calc()` guards, `$variable` & private-member hygiene, SCSS-aware unknown-property/value checks (replacing the core versions that mis-handle `$vars` and nested longhands), and redundant-nesting cleanup.
- **Selectors**: `:global` pseudo-class permitted (CSS Modules); explicit `&` nesting, capped nesting depth, no qualifying types.
- **Line endings**: LF enforced (`@stylistic/linebreaks`).
- **Delimiter style**: comma-last & semicolon-attached, locked two-sided across selectors, functions, declarations, value lists and media queries — comma-first / semicolon-first banned (auto-fixed where stylelint ships a fixer, reported otherwise), plus no space before an at-rule `;` and no BOM.
- Everything from `stylelint-config-standard` and `@stylistic/stylelint-config` (formatting).

## License

MIT
