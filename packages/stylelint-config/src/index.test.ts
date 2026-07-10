import { isAbsolute } from "node:path";

import stylelint from "stylelint";

import { defineStylelintConfig } from "./index";

describe("defineStylelintConfig", () => {
  it("defaults to a pure-CSS base (no SCSS preset or scss/* rules)", () => {
    const config = defineStylelintConfig();
    const [base, stylistic] = config.extends as string[];
    const [order] = config.plugins as string[];

    // Extends entries are resolved absolute paths (see resolveHere), so match the package segment.
    expect(base).toMatch(/stylelint-config-standard[/\\]/);
    expect(stylistic).toContain("@stylistic/stylelint-config");
    expect(order).toContain("stylelint-order");
    expect(config.rules?.["scss/no-duplicate-load-rules"]).toBeUndefined();
    // Core *-no-unknown stay ON in CSS mode — only the SCSS layer swaps them for scss/* twins.
    expect(config.rules?.["declaration-property-value-no-unknown"]).not.toBeNull();
    expect(config.rules?.["scss/property-no-unknown"]).toBeUndefined();
  });

  it("opts into the SCSS layer when scss: true", () => {
    const config = defineStylelintConfig({ scss: true });
    const [base] = config.extends as string[];

    expect(base).toMatch(/stylelint-config-standard-scss[/\\]/);
    expect(config.rules?.["scss/no-duplicate-load-rules"]).toBe(true);
    expect(config.rules?.["scss/dollar-variable-default"]).toEqual([true, { ignore: "local" }]);
    // SCSS swaps off the core class-pattern in favour of the interpolation-aware variant.
    expect(config.rules?.["selector-class-pattern"]).toBeNull();
    expect(config.rules?.["scss/selector-class-pattern"]).toBeDefined();
    // SCSS-aware *-no-unknown twins replace the core versions (which mis-handle $vars / nested longhands).
    expect(config.rules?.["property-no-unknown"]).toBeNull();
    expect(config.rules?.["declaration-property-value-no-unknown"]).toBeNull();
    expect(config.rules?.["scss/property-no-unknown"]).toBe(true);
    expect(config.rules?.["scss/declaration-property-value-no-unknown"]).toBe(true);
    expect(config.rules?.["scss/block-no-redundant-nesting"]).toBe(true);
  });

  it("resolves every extends/plugins entry to an absolute path (pnpm-safe for consumers)", () => {
    // stylelint resolves bare names from the CONSUMER's config-file location, where this package's
    // own dependencies do not exist under pnpm's strict isolation — a bare name is a regression.
    for (const config of [defineStylelintConfig(), defineStylelintConfig({ scss: true }), defineStylelintConfig({ tailwind: true }), defineStylelintConfig({ scss: true, tailwind: true })]) {
      for (const entry of [...config.extends as string[], ...config.plugins as string[]]) {
        expect(isAbsolute(entry)).toBe(true);
      }
    }
  });

  it("keeps the Tailwind layer off by default (Tailwind at-rules stay unknown)", () => {
    const config = defineStylelintConfig();

    // The base preset owns at-rule-no-unknown; no override means @theme & co. keep erroring.
    expect(config.rules?.["at-rule-no-unknown"]).toBeUndefined();
    expect(config.rules?.["function-no-unknown"]).toBeUndefined();
    expect(config.rules?.["custom-property-pattern"]).toBeUndefined();
    expect(config.rules?.["at-rule-no-deprecated"]).toBeUndefined();
  });

  it("admits the Tailwind v4 surface when tailwind: true (CSS mode)", () => {
    const config = defineStylelintConfig({ tailwind: true });
    const atRuleSetting = config.rules?.["at-rule-no-unknown"] as [true, { ignoreAtRules: string[] }];

    // Family-complete: the v4 authoring at-rules plus the documented v3-compat bridges.
    expect(atRuleSetting[1].ignoreAtRules).toEqual(expect.arrayContaining(["apply", "config", "custom-variant", "plugin", "reference", "source", "theme", "utility", "variant"]));
    // The REMOVED v3 @tailwind directive stays flagged — it is dead code in a v4 project.
    expect(atRuleSetting[1].ignoreAtRules).not.toContain("tailwind");
    expect(config.rules?.["function-no-unknown"]).toEqual([true, { ignoreFunctions: ["--alpha", "--spacing", "theme"] }]);
    // @apply collides with the abandoned CSS @apply proposal at-rule-no-deprecated knows.
    expect(config.rules?.["at-rule-no-deprecated"]).toEqual([true, { ignoreAtRules: ["apply"] }]);
    // Block-form @utility / @custom-variant put `&` directly inside the at-rule — the at-rule IS
    // the scoping root in v4, so the core rule must exempt the family.
    expect(config.rules?.["nesting-selector-no-missing-scoping-root"]).toEqual([true, { ignoreAtRules: ["custom-variant", "utility", "variant"] }]);
    expect(config.rules?.["custom-property-pattern"]).toBeDefined();
    // CSS mode never touches the scss/* twins.
    expect(config.rules?.["scss/at-rule-no-unknown"]).toBeUndefined();
  });

  it("lands the Tailwind allowances on the scss/* twins when composed with scss: true", () => {
    const config = defineStylelintConfig({ scss: true, tailwind: true });
    const scssAtRuleSetting = config.rules?.["scss/at-rule-no-unknown"] as [true, { ignoreAtRules: string[] }];

    // The SCSS layer's core swap-off must survive the Tailwind layer.
    expect(config.rules?.["at-rule-no-unknown"]).toBeNull();
    expect(config.rules?.["function-no-unknown"]).toBeNull();
    // The merged allowance keeps the SCSS set AND gains the Tailwind set — no drift.
    expect(scssAtRuleSetting[1].ignoreAtRules).toEqual(expect.arrayContaining(["extend", "include", "theme", "utility", "apply"]));
    expect(config.rules?.["scss/function-no-unknown"]).toEqual([true, { ignoreFunctions: ["--alpha", "--spacing", "theme"] }]);
  });

  it("enforces recess ordering, the unit allow-list, and CSS hygiene in every mode", () => {
    for (const config of [defineStylelintConfig(), defineStylelintConfig({ scss: true }), defineStylelintConfig({ tailwind: true }), defineStylelintConfig({ scss: true, tailwind: true })]) {
      expect(config.rules?.["order/properties-order"]).toBeDefined();
      expect(config.rules?.["unit-allowed-list"]).toBeDefined();
      // The viewport family must be complete — allowing dvh but not dvmin would force a disable
      // comment, exactly what a sealed config must not do.
      expect(config.rules?.["unit-allowed-list"]).toEqual(expect.arrayContaining(["dvh", "svh", "lvh", "vmin", "dvmin", "svmax", "lvmax", "vi", "dvb", "ch"]));
      expect(config.rules?.["color-named"]).toBe("never");
      expect(config.rules?.["@stylistic/linebreaks"]).toBe("unix");
      expect(config.rules?.["@stylistic/selector-list-comma-newline-before"]).toBe("never-multi-line");
      expect(config.rules?.["@stylistic/value-list-comma-newline-before"]).toBe("never-multi-line");
      expect(config.rules?.["@stylistic/unicode-bom"]).toBe("never");
      expect(config.rules?.["max-nesting-depth"]).toEqual([3, { ignoreAtRules: ["media", "supports"] }]);
    }
  });
});

// Smoke tests: load the config through real stylelint with NO configBasedir — the consumer
// situation the resolved-absolute-path extends/plugins must survive (bare names only load when the
// basedir happens to contain the presets) — proving the config is structurally valid and every
// rule resolves (no invalid-option / parse / deprecation warnings).
describe("real stylelint load", () => {
  it("loads the CSS config and lints with no config errors or deprecations", async () => {
    const { results } = await stylelint.lint({
      code: "a {\n  color: #ffffff;\n}\n",
      config: defineStylelintConfig()
    });

    expect(results[0]?.invalidOptionWarnings).toEqual([]);
    expect(results[0]?.parseErrors).toEqual([]);
    expect(results[0]?.deprecations).toEqual([]);
  });

  it("loads the SCSS config (scss: true) and lints .scss with no config errors", async () => {
    const { results } = await stylelint.lint({
      code: "$x: 1px;\n\n.a {\n  width: $x;\n}\n",
      config: defineStylelintConfig({ scss: true }),
      customSyntax: "postcss-scss"
    });

    expect(results[0]?.invalidOptionWarnings).toEqual([]);
    expect(results[0]?.parseErrors).toEqual([]);
    expect(results[0]?.deprecations).toEqual([]);
  });
});

describe("tailwind option axis (real lint)", () => {
  // The shape a Tailwind v4 entry stylesheet actually takes (cascade-layer statement first — the
  // spec allows @layer before @import — then layered imports, @theme with a namespace reset,
  // @custom-variant / @utility definitions in both the inline and block forms — the block forms
  // put `&` directly inside the at-rule, which nesting-selector-no-missing-scoping-root must
  // accept — and @apply inside a rule).
  const TAILWIND_CSS = `@layer theme, base, components, utilities;

@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);

@theme inline {
  --color-*: initial;
  --color-canvas: light-dark(#ffffff, #000000);
}

@custom-variant theme-midnight (&:where([data-theme="midnight"] *));

@custom-variant any-hover {
  @media (any-hover: hover) {
    &:hover {
      @slot;
    }
  }
}

@utility tab-4 {
  tab-size: 4;
}

@utility scrollbar-hidden {
  &::-webkit-scrollbar {
    display: none;
  }
}

.btn {
  margin: --spacing(4);

  @apply flex;
}
`;

  it("accepts the Tailwind v4 authoring surface with tailwind: true", async () => {
    const { results } = await stylelint.lint({
      code: TAILWIND_CSS,
      config: defineStylelintConfig({ tailwind: true })
    });

    expect(results[0]?.invalidOptionWarnings).toEqual([]);
    expect(results[0]?.parseErrors).toEqual([]);
    expect(results[0]?.warnings).toEqual([]);
  });

  it("rejects the same stylesheet without tailwind: true (the axis is opt-in)", async () => {
    const { results } = await stylelint.lint({
      code: TAILWIND_CSS,
      config: defineStylelintConfig()
    });

    const violated = new Set(results[0]?.warnings.map(warning => warning.rule));

    expect(violated).toContain("at-rule-no-unknown");
  });

  it("keeps the sealed baseline intact under tailwind: true (no blanket loosening)", async () => {
    const { results } = await stylelint.lint({
      code: "a {\n  color: RED !important;\n}\n",
      config: defineStylelintConfig({ tailwind: true })
    });

    const violated = new Set(results[0]?.warnings.map(warning => warning.rule));

    expect(violated).toContain("declaration-no-important");
    expect(violated).toContain("color-named");
  });

  it("composes with scss: true (allowances land on the scss/* twins)", async () => {
    const { results } = await stylelint.lint({
      // Includes a block-form @utility: nesting-selector-no-missing-scoping-root is a core rule in
      // SCSS mode too (never swapped), so its Tailwind exemption must hold here as well.
      code: "@theme inline {\n  --color-canvas: #ffffff;\n}\n\n@utility scrollbar-hidden {\n  &::-webkit-scrollbar {\n    display: none;\n  }\n}\n\n.a {\n  @apply flex;\n}\n",
      // scss/partial-no-import can only judge imports when it knows the linted file's name.
      codeFilename: "app.scss",
      config: defineStylelintConfig({ scss: true, tailwind: true }),
      customSyntax: "postcss-scss"
    });

    expect(results[0]?.invalidOptionWarnings).toEqual([]);
    expect(results[0]?.parseErrors).toEqual([]);
    expect(results[0]?.warnings).toEqual([]);
  });
});
