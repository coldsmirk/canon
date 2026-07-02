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
    for (const config of [defineStylelintConfig(), defineStylelintConfig({ scss: true })]) {
      for (const entry of [...config.extends as string[], ...config.plugins as string[]]) {
        expect(isAbsolute(entry)).toBe(true);
      }
    }
  });

  it("enforces recess ordering, the unit allow-list, and CSS hygiene in both modes", () => {
    for (const config of [defineStylelintConfig(), defineStylelintConfig({ scss: true })]) {
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
