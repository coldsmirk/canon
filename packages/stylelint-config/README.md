# @coldsmirk/stylelint-config

Opinionated [Stylelint](https://stylelint.io/) config for CSS and SCSS: `stylelint-config-standard` (or `stylelint-config-standard-scss` via the `scss` option) + `@stylistic/stylelint-config`, with [recess](https://github.com/stormwarning/stylelint-config-recess-order) property ordering and a curated set of color / unit / selector / nesting rules. Tailwind CSS v4 projects opt in with the `tailwind` axis.

## Install

```bash
pnpm add -D stylelint @coldsmirk/stylelint-config
```

Requires Stylelint **>= 17.8** (the floor of the enabled rules — `relative-selector-nesting-notation` and `selector-no-deprecated` shipped in 17.8) and Node **>= 22.9** (Stylelint 17.8+ depends on `write-file-atomic@7`, whose 22.x floor is 22.9). The package is **ESM-only**; Stylelint 17 loads ESM configs natively.

## Usage

`stylelint.config.js` (or `.mjs` / `.ts`). The default is **plain CSS**; pass `scss: true` for SCSS:

```ts
import { defineStylelintConfig } from "@coldsmirk/stylelint-config";

// Plain CSS
export default defineStylelintConfig();

// SCSS
export default defineStylelintConfig({ scss: true });

// Tailwind CSS v4
export default defineStylelintConfig({ tailwind: true });
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
  scss: false,    // enable SCSS: swaps the base to standard-scss and turns on the scss/* layer. Default: false
  tailwind: false // enable Tailwind CSS v4 authoring support (at-rules, value functions, @theme wildcard resets). Default: false
});
```

`scss` and `tailwind` are the only knobs — like the `react` axis in `@coldsmirk/eslint-config`, each is an opt-in project-shape axis, and they compose (`{ scss: true, tailwind: true }` lands the Tailwind allowances on the `scss/*` twin rules). Rules are otherwise **not configurable** (sealed).

### What `tailwind: true` admits

- **At-rules**: the v4 authoring set — `@theme`, `@utility`, `@variant`, `@custom-variant`, `@apply`, `@reference`, `@source` — plus the documented v3-compat bridges `@config` / `@plugin`. The **removed** v3 `@tailwind` directive stays flagged: it is dead code in a v4 project.
- **Block-form `&`**: `nesting-selector-no-missing-scoping-root` exempts `@utility` / `@custom-variant` / `@variant`, whose block forms place `&` directly inside the at-rule (the at-rule *is* the scoping root in v4).
- **Value functions**: `--alpha()` / `--spacing()` (and v3-compat `theme()`), both in `function-no-unknown` and in `declaration-property-value-no-unknown` (whose csstree grammar cannot be taught custom functions — only values *containing* a Tailwind function are exempted; every other declaration keeps full value checking).
- **`@theme` namespace resets**: wildcard custom-property *names* — `--color-*: initial`, `--*: initial`.
- **`@import` notation**: string form (`@import "tailwindcss";`), Tailwind's documented convention, instead of the standard preset's `url()` (CSS mode only).
- Nothing else. `declaration-no-important`, the unit allow-list, color notation, recess ordering and the rest of the sealed baseline stay fully active.

## What it enforces (highlights)

- **Property order**: recess ordering (`stylelint-order`), no blank lines between groups.
- **Colors**: lowercase, long hex, no `alpha` in hex, no named colors.
- **Units**: restricted to a sensible allow-list (`px em rem ch %`, the complete viewport family — `w h min max i b` across the `v dv sv lv` prefixes — and `fr deg rad grad turn ms s`).
- **SCSS** (with `scss: true`): standard-scss + a `scss/*` correctness layer — `@use`/`@forward` module hygiene, interpolation / `calc()` guards, `$variable` & private-member hygiene, SCSS-aware unknown-property/value checks (replacing the core versions that mis-handle `$vars` and nested longhands), and redundant-nesting cleanup.
- **Selectors**: `:global` pseudo-class permitted (CSS Modules); explicit `&` nesting, capped nesting depth, no qualifying types.
- **Line endings**: LF enforced (`@stylistic/linebreaks`).
- **Delimiter style**: comma-last & semicolon-attached, locked two-sided across selectors, functions, declarations, value lists and media queries — comma-first / semicolon-first banned (auto-fixed where stylelint ships a fixer, reported otherwise), plus no space before an at-rule `;` and no BOM.
- Everything from `stylelint-config-standard` and `@stylistic/stylelint-config` (formatting).

## License

MIT
