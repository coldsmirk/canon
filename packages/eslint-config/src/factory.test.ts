import type { Linter } from "eslint";

import { ESLint } from "eslint";

import { defineEslintConfig } from "./factory";

// Resolve the calculated config ESLint applies to `file`, using our factory output directly
// (no config-file lookup). This is the canonical way to test a shared config.
function resolveConfig(configs: Linter.Config[], file: string) {
  const eslint = new ESLint({
    cwd: import.meta.dirname,
    overrideConfigFile: true,
    overrideConfig: configs as never
  });

  return eslint.calculateConfigForFile(file);
}

describe("defineEslintConfig factory", () => {
  it("emits stably-named config blocks", () => {
    const names = defineEslintConfig().map(c => c.name).filter(Boolean);

    expect(names).toContain("coldsmirk/javascript");
    expect(names).toContain("coldsmirk/typescript");
    expect(names).toContain("coldsmirk/stylistic");
    expect(names).toContain("coldsmirk/imports");
  });

  describe("pure-TS (react: false)", () => {
    it("applies the core rules to .ts files", async () => {
      const config = await resolveConfig(defineEslintConfig(), "example.ts");

      expect(config.rules?.["@stylistic/semi"]).toBeDefined();
      expect(config.rules?.["unicorn/error-message"]).toBeDefined();
      expect(config.rules?.["perfectionist/sort-imports"]).toBeDefined();
    });

    it("loads NO React rules", async () => {
      const config = await resolveConfig(defineEslintConfig(), "example.tsx");

      expect(config.rules?.["@eslint-react/no-class-component"]).toBeUndefined();
      expect(config.rules?.["react-hooks/rules-of-hooks"]).toBeUndefined();
      expect(config.rules?.["coldsmirk/jsx-shorthand-boolean"]).toBeUndefined();
    });

    it("bans const enums but not React.* (no React selectors in the base)", async () => {
      const config = await resolveConfig(defineEslintConfig(), "example.ts");
      const restricted = config.rules?.["no-restricted-syntax"];

      expect(JSON.stringify(restricted)).toContain("TSEnumDeclaration[const=true]");
      expect(JSON.stringify(restricted)).not.toContain("React");
    });
  });

  describe("React (react: true)", () => {
    it("loads React + hooks rules on .tsx", async () => {
      const config = await resolveConfig(defineEslintConfig({ react: true }), "example.tsx");

      expect(config.rules?.["@eslint-react/no-class-component"]?.[0]).toBe(2);
      expect(config.rules?.["react-hooks/rules-of-hooks"]?.[0]).toBe(2);
    });

    it("bans React.* namespace access via no-restricted-syntax", async () => {
      const config = await resolveConfig(defineEslintConfig({ react: true }), "example.tsx");

      expect(JSON.stringify(config.rules?.["no-restricted-syntax"])).toContain("object.name='React'");
    });

    it("confines JSX to .tsx (bans JSXElement in .ts)", async () => {
      const config = await resolveConfig(defineEslintConfig({ react: true }), "example.ts");

      expect(JSON.stringify(config.rules?.["no-restricted-syntax"])).toContain("JSXElement");
    });

    it("enables the adopted React rules (useless fragment, context display name)", async () => {
      const config = await resolveConfig(defineEslintConfig({ react: true }), "example.tsx");

      expect(config.rules?.["@eslint-react/jsx-no-useless-fragment"]).toMatchObject([2, { allowExpressions: true }]);
      expect(config.rules?.["@eslint-react/no-missing-context-display-name"]?.[0]).toBe(2);
    });

    it("enables canon's own autofixable JSX shorthand rules", async () => {
      const config = await resolveConfig(defineEslintConfig({ react: true }), "widget.tsx");

      expect(config.rules?.["coldsmirk/jsx-shorthand-boolean"]?.[0]).toBe(2);
      expect(config.rules?.["coldsmirk/jsx-shorthand-fragment"]?.[0]).toBe(2);
    });
  });

  describe("test layer (follows react)", () => {
    it("applies BOTH jest-dom and testing-library rules to .test files", async () => {
      const config = await resolveConfig(defineEslintConfig({ react: true }), "widget.test.tsx");
      const ruleNames = Object.keys(config.rules ?? {});

      // Regression guard: both presets merge into ONE block (coldsmirk/test) via flattenConfig;
      // their namespaces are disjoint (jest-dom/* vs testing-library/*), so neither clobbers the other.
      expect(ruleNames.some(r => r.startsWith("jest-dom/"))).toBe(true);
      expect(ruleNames.some(r => r.startsWith("testing-library/"))).toBe(true);
    });

    it("runs jest-dom rules on ESLint 10 without crashing (5.5.0 calls the removed getSourceCode; @eslint/compat fixup polyfills it)", async () => {
      const eslint = new ESLint({
        cwd: import.meta.dirname,
        overrideConfigFile: true,
        overrideConfig: defineEslintConfig({ react: true }) as never,
        fix: true
      });
      // `toHaveAttribute("class", ...)` reaches prefer-to-have-class, whose fixer calls context.getSourceCode().
      const [result] = await eslint.lintText("test(\"x\", () => { expect(el).toHaveAttribute(\"class\", \"a\"); });\n", { filePath: "widget.test.tsx" });

      expect(result?.messages.filter(m => m.fatal)).toHaveLength(0);
    });

    it("turns off testing-library/no-node-access (too strict for component-library tests)", async () => {
      const config = await resolveConfig(defineEslintConfig({ react: true }), "widget.test.tsx");

      expect(config.rules?.["testing-library/no-node-access"]?.[0]).toBe(0);
    });

    it("uses the .test convention, not .spec", async () => {
      const config = await resolveConfig(defineEslintConfig({ react: true }), "widget.spec.tsx");
      const ruleNames = Object.keys(config.rules ?? {});

      expect(ruleNames.some(r => r.startsWith("testing-library/"))).toBe(false);
    });

    it("is off when react is off", async () => {
      const config = await resolveConfig(defineEslintConfig(), "widget.test.ts");
      const ruleNames = Object.keys(config.rules ?? {});

      expect(ruleNames.some(r => r.startsWith("testing-library/"))).toBe(false);
    });
  });

  describe("package.json (type axis)", () => {
    it("always sorts + validates package.json", async () => {
      const config = await resolveConfig(defineEslintConfig(), "package.json");

      expect(config.rules?.["package-json/order-properties"]?.[0]).toBe(2);
      expect(config.rules?.["package-json/sort-collections"]?.[0]).toBe(2);
    });

    it("app (default) relaxes publish-only field requirements", async () => {
      const config = await resolveConfig(defineEslintConfig({ type: "app" }), "package.json");

      expect(config.rules?.["package-json/require-license"]?.[0]).toBe(0);
      expect(config.rules?.["package-json/require-exports"]?.[0]).toBe(0);
    });

    it("lib enforces publish-only field requirements", async () => {
      const config = await resolveConfig(defineEslintConfig({ type: "lib" }), "package.json");

      expect(config.rules?.["package-json/require-license"]?.[0]).toBe(2);
      expect(config.rules?.["package-json/require-exports"]?.[0]).toBe(2);
    });
  });

  describe("tsconfig", () => {
    it("sorts tsconfig keys", async () => {
      const config = await resolveConfig(defineEslintConfig(), "tsconfig.json");

      expect(config.rules?.["jsonc/sort-keys"]?.[0]).toBe(2);
    });
  });

  describe("gitignore", () => {
    it("is always included", () => {
      expect(defineEslintConfig().some(c => c.name === "coldsmirk/gitignore")).toBe(true);
    });
  });

  describe("ignores", () => {
    it("merges user ignores with the default dist ignore", () => {
      const globs = defineEslintConfig({ ignores: ["generated/**"] }).find(c => c.name === "coldsmirk/ignores")?.ignores;

      expect(globs).toContain("**/dist/**");
      expect(globs).toContain("generated/**");
    });
  });

  describe("adopted rule expansions", () => {
    it("enables the new core correctness rules on source", async () => {
      const config = await resolveConfig(defineEslintConfig(), "example.ts");

      expect(config.rules?.["no-constructor-return"]?.[0]).toBe(2);
      expect(config.rules?.["no-return-assign"]?.[0]).toBe(2);
      expect(config.rules?.["default-param-last"]?.[0]).toBe(2);
      expect(config.rules?.["no-script-url"]?.[0]).toBe(2);
      expect(config.rules?.["no-param-reassign"]?.[0]).toBe(2);
    });

    it("enables the non-type-aware TS hygiene rules", async () => {
      const config = await resolveConfig(defineEslintConfig(), "example.ts");

      expect(config.rules?.["@typescript-eslint/no-use-before-define"]).toMatchObject([2, { functions: false }]);
      expect(config.rules?.["@typescript-eslint/no-useless-empty-export"]?.[0]).toBe(2);
    });

    it("enforces LF line endings and call spacing via stylistic", async () => {
      const config = await resolveConfig(defineEslintConfig(), "example.ts");

      expect(config.rules?.["@stylistic/linebreak-style"]).toMatchObject([2, "unix"]);
      expect(config.rules?.["@stylistic/function-call-spacing"]?.[0]).toBe(2);
    });

    it("enables antfu, JSDoc, and eslint-comments additions", async () => {
      const config = await resolveConfig(defineEslintConfig(), "example.ts");

      expect(config.rules?.["antfu/import-dedupe"]?.[0]).toBe(2);
      expect(config.rules?.["antfu/no-import-node-modules-by-path"]?.[0]).toBe(2);
      expect(config.rules?.["jsdoc/no-bad-blocks"]?.[0]).toBe(2);
      expect(config.rules?.["@eslint-community/eslint-comments/require-description"]?.[0]).toBe(2);
    });
  });

  describe("plugin-sweep additions (2nd gap audit)", () => {
    it("adds TS hygiene rules and pairs off the core no-unused-private-class-members twin", async () => {
      const config = await resolveConfig(defineEslintConfig(), "example.ts");

      expect(config.rules?.["@typescript-eslint/consistent-type-imports"]?.[0]).toBe(2);
      expect(config.rules?.["@typescript-eslint/no-unnecessary-parameter-property-assignment"]?.[0]).toBe(2);
      expect(config.rules?.["@typescript-eslint/no-unused-private-class-members"]?.[0]).toBe(2);
      // Core twin OFF so `#private` members aren't double-reported alongside the TS version.
      expect(config.rules?.["no-unused-private-class-members"]?.[0]).toBe(0);
    });

    it("adds the JSDoc block-hygiene rules and @stylistic/semi-style", async () => {
      const config = await resolveConfig(defineEslintConfig(), "example.ts");

      for (const rule of ["jsdoc/check-syntax", "jsdoc/empty-tags", "jsdoc/escape-inline-tags", "jsdoc/no-blank-block-descriptions", "jsdoc/require-asterisk-prefix"]) {
        expect(config.rules?.[rule]?.[0]).toBe(2);
      }

      expect(config.rules?.["@stylistic/semi-style"]).toMatchObject([2, "last"]);
    });

    it("adds package.json correctness rules for both app and lib", async () => {
      const app = await resolveConfig(defineEslintConfig({ type: "app" }), "package.json");
      const lib = await resolveConfig(defineEslintConfig({ type: "lib" }), "package.json");

      for (const config of [app, lib]) {
        expect(config.rules?.["package-json/no-local-dependencies"]?.[0]).toBe(2);
        expect(config.rules?.["package-json/restrict-private-properties"]?.[0]).toBe(2);
      }
    });

    it("adds React rules and turns off all duplicated preset aliases (dom / naming / web-api)", async () => {
      const config = await resolveConfig(defineEslintConfig({ react: true }), "widget.tsx");

      expect(config.rules?.["@eslint-react/globals"]?.[0]).toBe(2);
      expect(config.rules?.["react-web-api/no-leaked-fetch"]?.[0]).toBe(2);
      expect(config.rules?.["react-web-api/no-leaked-intersection-observer"]?.[0]).toBe(2);
      // Standalone react-dom/* / react-web-api/* / react-naming-convention/* cover these at error; the
      // @eslint-react preset aliases are OFF so the same issue isn't reported twice (warn + error).
      expect(config.rules?.["@eslint-react/web-api-no-leaked-fetch"]?.[0]).toBe(0);
      expect(config.rules?.["@eslint-react/dom-no-render"]?.[0]).toBe(0);
      expect(config.rules?.["@eslint-react/naming-convention-context-name"]?.[0]).toBe(0);
    });

    it("applies @stylistic/jsx-child-element-spacing on .tsx without React (it lives in the stylistic layer)", async () => {
      const config = await resolveConfig(defineEslintConfig(), "widget.tsx");

      expect(config.rules?.["@stylistic/jsx-child-element-spacing"]?.[0]).toBe(2);
    });
  });

  describe("real-world feedback fixes", () => {
    it("turns off rules whose autofix/heuristics misfire (prefer-includes-over-repeated-comparisons, better-dom-traversing)", async () => {
      const config = await resolveConfig(defineEslintConfig(), "example.ts");

      expect(config.rules?.["unicorn/prefer-includes-over-repeated-comparisons"]?.[0]).toBe(0);
      expect(config.rules?.["unicorn/better-dom-traversing"]?.[0]).toBe(0);
    });

    it("delegates naming from core camelcase (off) to TS-aware naming-convention allowing snake_case props", async () => {
      const config = await resolveConfig(defineEslintConfig(), "example.ts");

      expect(config.rules?.camelcase?.[0]).toBe(0);
      expect(config.rules?.["@typescript-eslint/naming-convention"]?.[0]).toBe(2);
      // snake_case must stay legal on object/type/class properties (external/wire-format keys).
      expect(JSON.stringify(config.rules?.["@typescript-eslint/naming-convention"])).toContain("snake_case");
    });

    it("turns off @eslint-react/static-components (false-positives on hook/context-stable components)", async () => {
      const config = await resolveConfig(defineEslintConfig({ react: true }), "widget.tsx");

      expect(config.rules?.["@eslint-react/static-components"]?.[0]).toBe(0);
    });
  });
});
