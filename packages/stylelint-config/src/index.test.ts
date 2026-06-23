import { fileURLToPath } from "node:url";

import stylelint from "stylelint";

import { defineStylelintConfig } from "./index";

describe("defineStylelintConfig", () => {
  it("defaults to a pure-CSS base (no SCSS preset or scss/* rules)", () => {
    const config = defineStylelintConfig();

    expect(config.extends).toContain("stylelint-config-standard");
    expect(config.extends).toContain("@stylistic/stylelint-config");
    expect(config.extends).not.toContain("stylelint-config-standard-scss");
    expect(config.plugins).toContain("stylelint-order");
    expect(config.rules?.["scss/no-duplicate-load-rules"]).toBeUndefined();
    // Core *-no-unknown stay ON in CSS mode — only the SCSS layer swaps them for scss/* twins.
    expect(config.rules?.["declaration-property-value-no-unknown"]).not.toBeNull();
    expect(config.rules?.["scss/property-no-unknown"]).toBeUndefined();
  });

  it("opts into the SCSS layer when scss: true", () => {
    const config = defineStylelintConfig({ scss: true });

    expect(config.extends).toContain("stylelint-config-standard-scss");
    expect(config.extends).not.toContain("stylelint-config-standard");
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

  it("enforces recess ordering, the unit allow-list, and CSS hygiene in both modes", () => {
    for (const config of [defineStylelintConfig(), defineStylelintConfig({ scss: true })]) {
      expect(config.rules?.["order/properties-order"]).toBeDefined();
      expect(config.rules?.["unit-allowed-list"]).toBeDefined();
      expect(config.rules?.["color-named"]).toBe("never");
      expect(config.rules?.["@stylistic/linebreaks"]).toBe("unix");
      expect(config.rules?.["@stylistic/selector-list-comma-newline-before"]).toBe("never-multi-line");
      expect(config.rules?.["@stylistic/value-list-comma-newline-before"]).toBe("never-multi-line");
      expect(config.rules?.["@stylistic/unicode-bom"]).toBe("never");
      expect(config.rules?.["max-nesting-depth"]).toEqual([3, { ignoreAtRules: ["media", "supports"] }]);
    }
  });
});

// Smoke test: load the config through real stylelint and lint a sample, proving the config is
// structurally valid and every rule resolves (no invalid-option / parse / deprecation warnings).
const pkgDir = fileURLToPath(new URL("..", import.meta.url));

describe("real stylelint load", () => {
  it("loads the CSS config and lints with no config errors or deprecations", async () => {
    const { results } = await stylelint.lint({
      code: "a {\n  color: #ffffff;\n}\n",
      config: defineStylelintConfig(),
      configBasedir: pkgDir
    });

    expect(results[0]?.invalidOptionWarnings).toEqual([]);
    expect(results[0]?.parseErrors).toEqual([]);
    expect(results[0]?.deprecations).toEqual([]);
  });

  it("loads the SCSS config (scss: true) and lints .scss with no config errors", async () => {
    const { results } = await stylelint.lint({
      code: "$x: 1px;\n\n.a {\n  width: $x;\n}\n",
      config: defineStylelintConfig({ scss: true }),
      configBasedir: pkgDir,
      customSyntax: "postcss-scss"
    });

    expect(results[0]?.invalidOptionWarnings).toEqual([]);
    expect(results[0]?.parseErrors).toEqual([]);
    expect(results[0]?.deprecations).toEqual([]);
  });
});
