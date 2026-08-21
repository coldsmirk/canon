import type { ESLint, Linter } from "eslint";

import tailwindcssPlugin from "eslint-plugin-tailwindcss";

import { GLOB_SRC } from "../globs";

// eslint-plugin-tailwindcss v4 compiles the project's real CSS entry point (in a synckit worker),
// so ordering and validation match the Tailwind compiler exactly — not a hand-maintained class
// list. Rules: https://github.com/francoismassart/eslint-plugin-tailwindcss#rules
const tailwindcssRules: Linter.RulesRecord = {
  // The compiler's own class order, autofixable.
  "tailwindcss/classnames-order": "error",
  // `-top-[5px]` over `top-[-5px]`, autofixable.
  "tailwindcss/enforces-negative-arbitrary-values": "error",
  // Merge longhand pairs into their shorthand (`pt-2 pb-2` → `py-2`), autofixable.
  "tailwindcss/enforces-shorthand": "error",
  // v4 moved the important marker: `!` belongs at the END of the class name, autofixable.
  "tailwindcss/important-modifier-suffix": "error",
  // Off (upstream recommended leaves it off too): arbitrary values are a documented, legitimate
  // escape hatch; banning them wholesale would force the inline-disable a sealed config must not.
  "tailwindcss/no-arbitrary-value": "off",
  // Two classes writing the same property is a latent bug — which one wins is build-order luck.
  "tailwindcss/no-contradicting-classname": "error",
  // Off: it flags every class the compiler doesn't know, but real projects legitimately mix in
  // CSS-module, third-party, and plain-CSS class names alongside the utilities.
  "tailwindcss/no-custom-classname": "off",
  // `inset-[1px]` → `inset-px` and friends: an arbitrary value with a native twin, autofixable.
  "tailwindcss/no-unnecessary-arbitrary-value": "error"
};

// Bundled like every other plugin, and statically imported like the React ones: the plugin only
// resolves `tailwindcss` lazily inside its rule worker (from the lint cwd), so importing it in a
// project without Tailwind installed is safe. The cost of bundling is the plugin's hard peer on
// `tailwindcss@^4`, which non-Tailwind consumers must allowlist under strict peers (see README).
export function tailwindcss(entryPoint: string): Linter.Config[] {
  return [
    {
      name: "coldsmirk/tailwindcss",
      files: GLOB_SRC,
      // The plugin types itself with @typescript-eslint/utils' stricter RuleModule/FlatConfig
      // shapes, which are not structurally assignable to ESLint's own Plugin type (its bundled
      // `configs.recommended` languageOptions differ) — identical at runtime, so cast.
      plugins: { tailwindcss: tailwindcssPlugin as unknown as ESLint.Plugin },
      // cssConfigPath is the plugin's one mandatory setting: the Tailwind v4 CSS entry point (a
      // `.css` file, not a v3 `.js` config) its worker compiles to learn the project's theme and
      // utilities. Every other setting keeps the upstream default (class attributes, cn/cva/clsx/
      // tv/twMerge call sites, cache sizing).
      settings: { tailwindcss: { cssConfigPath: entryPoint } },
      rules: tailwindcssRules
    }
  ];
}
