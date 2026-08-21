import type { Linter } from "eslint";

import { join } from "node:path";

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

// Run real text through the full React config with --fix (multi-pass, like the CLI) and return
// the fixed output — the comment-survival suite below exercises fixer interactions across passes.
async function fixText(code: string, filePath: string) {
  const eslint = new ESLint({
    cwd: import.meta.dirname,
    overrideConfigFile: true,
    overrideConfig: defineEslintConfig({ react: true }) as never,
    fix: true
  });
  const [result] = await eslint.lintText(code, { filePath });

  return result?.output ?? code;
}

// Lint real text through the full config and return only the fatal (parse/crash/invalid-option)
// messages — the smoke suite below asserts these are empty; ordinary rule findings are fine.
async function lintFatals(configs: Linter.Config[], filePath: string, code: string) {
  const eslint = new ESLint({
    cwd: import.meta.dirname,
    overrideConfigFile: true,
    overrideConfig: configs as never
  });
  const [result] = await eslint.lintText(code, { filePath });

  return result?.messages.filter(m => m.fatal) ?? [];
}

describe("defineEslintConfig factory", () => {
  it("emits stably-named config blocks", () => {
    const names = defineEslintConfig().map(c => c.name).filter(Boolean);

    expect(names).toContain("coldsmirk/javascript");
    expect(names).toContain("coldsmirk/typescript");
    expect(names).toContain("coldsmirk/stylistic");
    expect(names).toContain("coldsmirk/imports");
    expect(names).toContain("coldsmirk/commonjs");
    expect(names).toContain("coldsmirk/vitest");
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
      expect(config.rules?.["@eslint-react/rules-of-hooks"]).toBeUndefined();
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
      expect(config.rules?.["@eslint-react/rules-of-hooks"]?.[0]).toBe(2);
    });

    it("pins @eslint-react to the minimum supported React 19 semantics", async () => {
      const config = await resolveConfig(defineEslintConfig({ react: true }), "example.tsx");

      expect(config.settings?.["react-x"]).toMatchObject({ version: "19.0.0" });
    });

    it("uses @eslint-react's native hook rules — exactly one source, no standalone react-hooks twin", async () => {
      const config = await resolveConfig(defineEslintConfig({ react: true }), "example.tsx");

      // The two classics, at error (the preset ships exhaustive-deps at warn).
      expect(config.rules?.["@eslint-react/rules-of-hooks"]?.[0]).toBe(2);
      expect(config.rules?.["@eslint-react/exhaustive-deps"]).toMatchObject([2, { additionalHooks: expect.stringContaining("useDidUpdate") }]);
      // No second plugin reporting the same findings: a conditional hook call must yield ONE error.
      expect(Object.keys(config.rules ?? {}).some(rule => rule.startsWith("react-hooks/"))).toBe(false);
      // The compiler-era additions stay off.
      expect(config.rules?.["@eslint-react/purity"]?.[0]).toBe(0);
      expect(config.rules?.["@eslint-react/use-memo"]?.[0]).toBe(0);
      expect(config.rules?.["@eslint-react/set-state-in-render"]?.[0]).toBe(0);
      expect(config.rules?.["@eslint-react/error-boundaries"]?.[0]).toBe(0);
    });

    it("bans React.* namespace access via no-restricted-syntax", async () => {
      const config = await resolveConfig(defineEslintConfig({ react: true }), "example.tsx");

      expect(JSON.stringify(config.rules?.["no-restricted-syntax"])).toContain("object.name='React'");
    });

    it("confines JSX to .tsx (bans JSXElement in .ts)", async () => {
      const config = await resolveConfig(defineEslintConfig({ react: true }), "example.ts");

      expect(JSON.stringify(config.rules?.["no-restricted-syntax"])).toContain("JSXElement");
    });

    it("enables the adopted React rules (key after spread, context display name)", async () => {
      const config = await resolveConfig(defineEslintConfig({ react: true }), "example.tsx");

      expect(config.rules?.["@eslint-react/jsx-no-key-after-spread"]?.[0]).toBe(2);
      expect(config.rules?.["@eslint-react/no-missing-context-display-name"]?.[0]).toBe(2);
    });

    it("turns off the upstream jsx-no-useless-fragment in favour of the import-aware coldsmirk port", async () => {
      const config = await resolveConfig(defineEslintConfig({ react: true }), "example.tsx");

      expect(config.rules?.["@eslint-react/jsx-no-useless-fragment"]?.[0]).toBe(0);
      expect(config.rules?.["coldsmirk/jsx-no-useless-fragment"]?.[0]).toBe(2);
    });

    it("enables canon's own autofixable JSX shorthand rules", async () => {
      const config = await resolveConfig(defineEslintConfig({ react: true }), "widget.tsx");

      expect(config.rules?.["coldsmirk/jsx-shorthand-boolean"]?.[0]).toBe(2);
      expect(config.rules?.["coldsmirk/jsx-shorthand-fragment"]?.[0]).toBe(2);
    });
  });

  describe("test layer (follows react)", () => {
    it("applies the testing-library rules to .test files", async () => {
      const config = await resolveConfig(defineEslintConfig({ react: true }), "widget.test.tsx");
      const ruleNames = Object.keys(config.rules ?? {});

      expect(ruleNames.some(r => r.startsWith("testing-library/"))).toBe(true);
    });

    it("does NOT bundle jest-dom (its latest release peers eslint ^6–^9 only — it would break every consumer install on eslint 10)", async () => {
      const config = await resolveConfig(defineEslintConfig({ react: true }), "widget.test.tsx");
      const ruleNames = Object.keys(config.rules ?? {});

      expect(ruleNames.some(r => r.startsWith("jest-dom/"))).toBe(false);
    });

    it("turns off testing-library rules too strict for component-library / wrapped-render tests", async () => {
      const config = await resolveConfig(defineEslintConfig({ react: true }), "widget.test.tsx");

      expect(config.rules?.["testing-library/no-node-access"]?.[0]).toBe(0);
      expect(config.rules?.["testing-library/no-container"]?.[0]).toBe(0);
      expect(config.rules?.["testing-library/render-result-naming-convention"]?.[0]).toBe(0);
    });

    it("uses the .test convention, not .spec", async () => {
      const config = await resolveConfig(defineEslintConfig({ react: true }), "widget.spec.tsx");
      const ruleNames = Object.keys(config.rules ?? {});

      expect(ruleNames.some(r => r.startsWith("testing-library/"))).toBe(false);
    });

    it("is off when react is off (vitest hygiene stays on)", async () => {
      const config = await resolveConfig(defineEslintConfig(), "widget.test.ts");
      const ruleNames = Object.keys(config.rules ?? {});

      expect(ruleNames.some(r => r.startsWith("testing-library/"))).toBe(false);
      expect(config.rules?.["vitest/no-focused-tests"]?.[0]).toBe(2);
    });
  });

  describe("vitest layer (always on)", () => {
    it("guards test files without react: no-focused-tests and the matcher idioms at error", async () => {
      const config = await resolveConfig(defineEslintConfig(), "example.test.ts");

      expect(config.rules?.["vitest/no-focused-tests"]?.[0]).toBe(2);
      expect(config.rules?.["vitest/no-identical-title"]?.[0]).toBe(2);
      expect(config.rules?.["vitest/prefer-to-have-length"]?.[0]).toBe(2);
      expect(config.rules?.["vitest/consistent-test-it"]).toMatchObject([2, { fn: "it", withinDescribe: "it" }]);
    });

    it("keeps `.skip` legal (no-disabled-tests off) — only `.only` is the hazard", async () => {
      const config = await resolveConfig(defineEslintConfig(), "example.test.ts");

      expect(config.rules?.["vitest/no-disabled-tests"]?.[0]).toBe(0);
    });

    it("applies to test files only, never to source", async () => {
      const config = await resolveConfig(defineEslintConfig(), "example.ts");
      const ruleNames = Object.keys(config.rules ?? {});

      expect(ruleNames.some(r => r.startsWith("vitest/"))).toBe(false);
    });

    it("coexists with the DOM test layer when react is on", async () => {
      const config = await resolveConfig(defineEslintConfig({ react: true }), "widget.test.tsx");

      expect(config.rules?.["vitest/no-focused-tests"]?.[0]).toBe(2);
      expect(Object.keys(config.rules ?? {}).some(r => r.startsWith("testing-library/"))).toBe(true);
    });
  });

  describe("Tailwind (tailwind axis)", () => {
    // A real Tailwind v4 entry point: the plugin's worker compiles it (resolving the tailwindcss
    // package from the fixture's directory), so these tests exercise the full pipeline.
    const entryPoint = join(import.meta.dirname, "fixtures", "tailwind.css");

    it("is off by default — no tailwindcss rules, no settings", async () => {
      const config = await resolveConfig(defineEslintConfig(), "widget.tsx");

      expect(Object.keys(config.rules ?? {}).some(r => r.startsWith("tailwindcss/"))).toBe(false);
      expect(config.settings?.tailwindcss).toBeUndefined();
    });

    it("enables the class-hygiene rules at error on source — plain .ts included (cva/clsx live there)", async () => {
      const configs = defineEslintConfig({ tailwind: entryPoint });

      for (const file of ["widget.tsx", "variants.ts"]) {
        const config = await resolveConfig(configs, file);

        for (const rule of [
          "tailwindcss/classnames-order",
          "tailwindcss/enforces-negative-arbitrary-values",
          "tailwindcss/enforces-shorthand",
          "tailwindcss/important-modifier-suffix",
          "tailwindcss/no-contradicting-classname",
          "tailwindcss/no-unnecessary-arbitrary-value"
        ]) {
          expect(config.rules?.[rule]?.[0], `${rule} on ${file}`).toBe(2);
        }
      }
    });

    it("keeps the two blunt rules off (arbitrary values are a documented escape hatch; non-Tailwind classes are legitimate)", async () => {
      const config = await resolveConfig(defineEslintConfig({ tailwind: entryPoint }), "widget.tsx");

      expect(config.rules?.["tailwindcss/no-arbitrary-value"]?.[0]).toBe(0);
      expect(config.rules?.["tailwindcss/no-custom-classname"]?.[0]).toBe(0);
    });

    it("passes the entry point through as the plugin's cssConfigPath", async () => {
      const config = await resolveConfig(defineEslintConfig({ tailwind: entryPoint }), "widget.tsx");

      expect(config.settings?.tailwindcss).toMatchObject({ cssConfigPath: entryPoint });
    });

    it("rejects an empty entry point at config build instead of dying opaquely in the plugin's worker", () => {
      expect(() => defineEslintConfig({ tailwind: "" })).toThrow(/entry stylesheet/);
    });

    it("orders and merges real class strings against the compiled theme (real lint run, --fix)", async () => {
      const eslint = new ESLint({
        cwd: import.meta.dirname,
        overrideConfigFile: true,
        overrideConfig: defineEslintConfig({ react: true, tailwind: entryPoint }) as never,
        fix: true
      });

      const lintFixed = async (code: string, filePath: string) => {
        const [result] = await eslint.lintText(code, { filePath });

        return result?.output ?? code;
      };

      const ordered = await lintFixed("export function Chip() {\n  return <span className=\"p-2 flex\">x</span>;\n}\n", "chip.tsx");
      const merged = await lintFixed("export function Pad() {\n  return <span className=\"pt-2 pb-2\">x</span>;\n}\n", "pad.tsx");

      expect(ordered).toContain("className=\"flex p-2\"");
      expect(merged).toContain("className=\"py-2\"");
    }, 30_000);

    it("lints tailwind-axis source with no fatals (react off — class strings via cva/clsx)", async () => {
      const configs = defineEslintConfig({ tailwind: entryPoint });

      expect(await lintFatals(configs, "variants.ts", "export const chip = \"flex p-2\";\n")).toEqual([]);
    }, 30_000);
  });

  describe("module-variant extensions (.mts/.cts/.mjs/.cjs)", () => {
    it("applies the core layers to every module-variant extension", async () => {
      for (const file of ["example.mts", "example.cts", "example.mjs", "example.cjs"]) {
        const config = await resolveConfig(defineEslintConfig(), file);

        expect(config.rules?.["@stylistic/semi"], file).toBeDefined();
        expect(config.rules?.["unicorn/error-message"], file).toBeDefined();
      }
    });

    it("supplies browser + node globals so plain-JS files don't trip no-undef", async () => {
      const config = await resolveConfig(defineEslintConfig(), "example.cjs");

      expect(config.languageOptions?.globals).toMatchObject({
        module: expect.anything(),
        process: expect.anything(),
        window: expect.anything()
      });
    });

    it("exempts CommonJS-by-extension files from the ESM-preference rules (and only them)", async () => {
      const cjs = await resolveConfig(defineEslintConfig(), "example.cjs");
      const cts = await resolveConfig(defineEslintConfig(), "example.cts");
      const ts = await resolveConfig(defineEslintConfig(), "example.ts");

      for (const config of [cjs, cts]) {
        expect(config.rules?.["@typescript-eslint/no-require-imports"]?.[0]).toBe(0);
        // unicorn's rules self-skip .cjs but NOT .cts, so the off must win over the unicorn layer.
        expect(config.rules?.["unicorn/prefer-module"]?.[0]).toBe(0);
        expect(config.rules?.["unicorn/prefer-top-level-await"]?.[0]).toBe(0);
      }

      expect(ts.rules?.["@typescript-eslint/no-require-imports"]?.[0]).toBe(2);
      expect(ts.rules?.["unicorn/prefer-module"]?.[0]).toBe(2);
    });

    it("confines JSX to .tsx for the variants too (react: true)", async () => {
      const config = await resolveConfig(defineEslintConfig({ react: true }), "example.mts");

      expect(JSON.stringify(config.rules?.["no-restricted-syntax"])).toContain("JSXElement");
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

    it("finds the repository .gitignore from a nested workspace cwd", () => {
      const cwd = vi.spyOn(process, "cwd").mockReturnValue(import.meta.dirname);

      try {
        const globs = defineEslintConfig().find(c => c.name === "coldsmirk/gitignore")?.ignores;

        expect(globs).toContain("**/node_modules");
        expect(globs).toContain("**/dist");
      } finally {
        cwd.mockRestore();
      }
    });
  });

  describe("ignores", () => {
    it("merges user ignores with the default dist ignore", () => {
      const globs = defineEslintConfig({ ignores: ["generated/**"] }).find(c => c.name === "coldsmirk/ignores")?.ignores;

      expect(globs).toContain("**/dist/**");
      expect(globs).toContain("generated/**");
    });
  });

  describe("user configs (project layer)", () => {
    it("appends trailing flat configs after the canon baseline", () => {
      const projectLayer: Linter.Config = { name: "project/local", rules: { "no-console": "error" } };
      const baseline = defineEslintConfig({ react: true });
      const composed = defineEslintConfig({ react: true }, projectLayer);

      expect(composed).toHaveLength(baseline.length + 1);
      expect(composed.at(-1)).toBe(projectLayer);
    });

    it("lets a trailing config override a canon rule for the project (last-wins)", async () => {
      const configs = defineEslintConfig({}, { rules: { "unicorn/error-message": "off" } });
      const config = await resolveConfig(configs, "example.ts");

      expect(config.rules?.["unicorn/error-message"]?.[0]).toBe(0);
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

    it("keeps the documented `_`-prefixed intentionally-unused escape hatch legal for variables", async () => {
      const eslint = new ESLint({
        cwd: import.meta.dirname,
        overrideConfigFile: true,
        overrideConfig: defineEslintConfig() as never
      });
      // The rest-destructuring omit idiom: `_pick` is intentionally unused by contract.
      const code = "const { pick: _pick, ...rest } = { pick: 1, keep: 2 };\n\nexport const kept = rest;\n";
      const [result] = await eslint.lintText(code, { filePath: "example.ts" });
      const escapeHatchBreakers = (result?.messages ?? []).filter(
        m => m.ruleId === "@typescript-eslint/naming-convention" || m.ruleId === "unused-imports/no-unused-vars"
      );

      expect(escapeHatchBreakers).toEqual([]);
    });
  });

  describe("unicorn v70 curation", () => {
    it("migrates the renamed rules: no-for-each on, name-replacements off, no stale ids", async () => {
      const config = await resolveConfig(defineEslintConfig(), "example.ts");

      expect(config.rules?.["unicorn/no-for-each"]?.[0]).toBe(2);
      // Renamed from prevent-abbreviations AND newly in recommended — the off must follow the name.
      expect(config.rules?.["unicorn/name-replacements"]?.[0]).toBe(0);
      // The pre-v70 ids must not appear at all: configuring a deleted rule crashes every consumer.
      expect(config.rules?.["unicorn/no-array-for-each"]).toBeUndefined();
    });

    it("keeps exactly one source per core-twin rule (core on, unicorn twin off)", async () => {
      const config = await resolveConfig(defineEslintConfig(), "example.ts");

      expect(config.rules?.["no-useless-concat"]?.[0]).toBe(2);
      expect(config.rules?.["unicorn/no-useless-concat"]?.[0]).toBe(0);
      expect(config.rules?.["operator-assignment"]?.[0]).toBe(2);
      expect(config.rules?.["unicorn/operator-assignment"]?.[0]).toBe(0);
    });

    it("turns off the v70 additions that misfire on legitimate idioms", async () => {
      const config = await resolveConfig(defineEslintConfig(), "example.ts");

      // Probed: flags `.catch(() => undefined)` fire-and-forget and all promise chaining, no autofix.
      expect(config.rules?.["unicorn/prefer-await"]?.[0]).toBe(0);
      // Probed: demands is/has prefixes on local booleans (`loading`, `disabled`, …), no autofix.
      expect(config.rules?.["unicorn/consistent-boolean-name"]?.[0]).toBe(0);
      // Probed: flags the module-level lazy-cache pattern (`let cache; f() { cache ??= … }`).
      expect(config.rules?.["unicorn/no-top-level-assignment-in-function"]?.[0]).toBe(0);
      // Syntax-level version can't ignore string arrays (the type-aware twin defaults to that),
      // so it taxes the most common, correct sort with boilerplate comparators.
      expect(config.rules?.["unicorn/require-array-sort-compare"]?.[0]).toBe(0);
    });
  });

  // Multi-pass --fix through the FULL config: a per-rule comment guard is not enough, because an
  // upstream fixer (e.g. @stylistic jsx-tag-spacing / jsx-equals-spacing) can delete the comment
  // in pass 1 and a downstream fixer then rewrites the comment-free output in pass 2. The
  // comment-safe wrapper around @stylistic must keep the comment through EVERY pass.
  describe("autofix never deletes comments (full config, multi-pass)", () => {
    it("keeps a comment inside a fragment tag through every fixer pass", async () => {
      const output = await fixText("import { Fragment } from \"react\";\n\nexport function A() {\n  return <Fragment /* keep */>x</Fragment>;\n}\n", "frag.tsx");

      expect(output).toContain("/* keep */");
    });

    it("keeps a comment inside a boolean attribute through every fixer pass", async () => {
      const output = await fixText("export function B() {\n  return <button type=\"button\" disabled /* keep */ ={true}>x</button>;\n}\n", "btn.tsx");

      expect(output).toContain("/* keep */");
    });

    it("keeps empty and whitespace-only comments through every fixer pass", async () => {
      for (const comment of ["/**/", "/* */"]) {
        const output = await fixText(`import { Fragment } from "react";\n\nexport function Empty() {\n  return <Fragment ${comment} >x</Fragment>;\n}\n`, "empty.tsx");

        expect(output, comment).toContain(comment);
      }

      const multilineEmpty = await fixText("/*\n*/\nexport const value = 1;\n", "empty-multiline.ts");

      expect(multilineEmpty).toContain("/*\n*/");
    });

    it("still applies comment-formatting fixes that preserve the logical content", async () => {
      const spaced = await fixText("//unspaced\nexport const value = 1;\n", "spaced.ts");
      const multiline = await fixText("/* first\n * second */\nexport const value = 1;\n", "multiline.ts");

      expect(spaced).toContain("// unspaced");
      expect(multiline).toContain("// first\n// second");
    });

    it("still applies the comment-free fixes (the wrapper withholds only unsafe ones)", async () => {
      const output = await fixText("import { Fragment } from \"react\";\n\nexport function C() {\n  return <Fragment>x</Fragment>;\n}\n", "clean.tsx");

      expect(output).toContain("<>x</>");
    });

    it("unwraps a useless React Fragment and then removes the now-unused import", async () => {
      // coldsmirk/jsx-no-useless-fragment and jsx-shorthand-fragment both fire on this node with
      // overlapping fixes; multi-pass --fix converges on the unwrapped form either way, and the
      // comment-free import is then legal to delete.
      const output = await fixText("import { Fragment } from \"react\";\n\nexport function E() {\n  return <Fragment><div>a</div></Fragment>;\n}\n", "unwrap.tsx");

      expect(output).toContain("return <div>a</div>;");
      expect(output).not.toContain("Fragment");
    });

    it("keeps a comment inside an import that a shorthand fix just made unused", async () => {
      // Pass 1 rewrites <Fragment> to <>; pass 2's unused-imports removal must be withheld —
      // deleting the import would take the comment with it.
      const output = await fixText("import { /* keep */ Fragment } from \"react\";\n\nexport function D() {\n  return <Fragment>x</Fragment>;\n}\n", "imp.tsx");

      expect(output).toContain("/* keep */");
      expect(output).toContain("<>x</>");
    });

    it("guards unused-import suggestions with the same comment-safe range check", async () => {
      const eslint = new ESLint({
        cwd: import.meta.dirname,
        overrideConfigFile: true,
        overrideConfig: defineEslintConfig({ react: true }) as never
      });
      const unsafeCode = "import { /* keep */ Fragment } from \"react\";\n";
      const safeCode = "import { Fragment } from \"react\";\n";
      const [unsafeResult] = await eslint.lintText(unsafeCode, { filePath: "unsafe.tsx" });
      const [safeResult] = await eslint.lintText(safeCode, { filePath: "safe.tsx" });
      const unsafeMessage = unsafeResult?.messages.find(message => message.ruleId === "unused-imports/no-unused-imports");
      const safeMessage = safeResult?.messages.find(message => message.ruleId === "unused-imports/no-unused-imports");

      expect(unsafeMessage?.fix).toBeUndefined();
      expect(unsafeMessage?.suggestions ?? []).toEqual([]);
      expect(safeMessage?.suggestions?.[0]?.fix.range).toEqual([0, safeCode.length]);
    });

    it("looks through a type-only Fragment binding to the React value binding", async () => {
      const output = await fixText("import { Fragment } from \"react\";\n\nexport function Typed() {\n  type Fragment = string;\n  const value: Fragment = \"x\";\n\n  return <Fragment>{value}</Fragment>;\n}\n", "typed.tsx");

      expect(output).toContain("return <>{value}</>;");
    });

    it("preserves @stylistic's plugin identity, so a trailing config can re-register it", async () => {
      const { default: stylisticPlugin } = await import("@stylistic/eslint-plugin");
      const configs = defineEslintConfig({}, { plugins: { "@stylistic": stylisticPlugin } });

      // A different plugin object under the same namespace would throw "Cannot redefine plugin".
      await expect(resolveConfig(configs, "example.ts")).resolves.toBeDefined();
    });
  });

  // Counterpart of the stylelint package's "real stylelint load" suite: rule options are only
  // validated when a rule actually executes, so resolveConfig alone can't catch an invalid option
  // or a plugin/ESLint incompatibility. Lint real text through every layer via lintFatals and
  // require zero fatal messages.
  describe("full-config smoke (real lint run)", () => {
    it("lints TS source, a test file, and a .cjs file with no fatals (react: false)", async () => {
      const configs = defineEslintConfig();

      expect(await lintFatals(configs, "example.ts", "export function add(a: number, b: number): number {\n  return a + b;\n}\n")).toEqual([]);
      expect(await lintFatals(configs, "example.test.ts", "it(\"adds\", () => {\n  expect(1 + 1).toBe(2);\n});\n")).toEqual([]);
      expect(await lintFatals(configs, "example.cjs", "module.exports = { sep: require(\"node:path\").sep };\n")).toEqual([]);
    });

    it("lints a component and its test with no fatals (react: true)", async () => {
      const configs = defineEslintConfig({ react: true });
      const component = "export function Badge({ label }: { label: string }) {\n  return <span>{label}</span>;\n}\n";
      const test = "import { Badge } from \"./badge\";\n\nit(\"renders\", () => {\n  expect(<Badge label=\"x\" />).toBeDefined();\n});\n";

      expect(await lintFatals(configs, "badge.tsx", component)).toEqual([]);
      expect(await lintFatals(configs, "badge.test.tsx", test)).toEqual([]);
    });

    it("reports no ESM-preference or no-undef misfires on idiomatic .cjs and .cts config files", async () => {
      const eslint = new ESLint({
        cwd: import.meta.dirname,
        overrideConfigFile: true,
        overrideConfig: defineEslintConfig() as never
      });
      const misfireRules = new Set(["no-undef", "@typescript-eslint/no-require-imports", "unicorn/prefer-module", "unicorn/prefer-top-level-await"]);
      const code = "const { join } = require(\"node:path\");\n\nmodule.exports = { root: join(__dirname, \"src\") };\n";

      for (const filePath of ["postcss.config.cjs", "commitlint.config.cts"]) {
        const [result] = await eslint.lintText(code, { filePath });
        const misfires = (result?.messages ?? []).filter(m => m.ruleId !== null && misfireRules.has(m.ruleId));

        expect(misfires, filePath).toEqual([]);
      }
    });
  });
});
