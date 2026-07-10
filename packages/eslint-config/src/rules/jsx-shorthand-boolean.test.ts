import { Linter } from "eslint";

import { coldsmirkPlugin } from "./index";

const linter = new Linter();

function lintFix(code: string) {
  return linter.verifyAndFix(code, {
    plugins: { coldsmirk: coldsmirkPlugin },
    languageOptions: {
      ecmaVersion: "latest",
      parserOptions: { ecmaFeatures: { jsx: true } },
      sourceType: "module"
    },
    rules: { "coldsmirk/jsx-shorthand-boolean": "error" }
  });
}

describe("coldsmirk/jsx-shorthand-boolean", () => {
  it("strips `={true}` down to the shorthand", () => {
    expect(lintFix("const a = <Comp disabled={true} />;\n").output).toBe("const a = <Comp disabled />;\n");
  });

  it("fixes every boolean-true attribute on the element", () => {
    expect(lintFix("const a = <Comp a={true} b={true} />;\n").output).toBe("const a = <Comp a b />;\n");
  });

  it("leaves shorthand, `={false}`, and non-boolean values untouched", () => {
    for (const code of [
      "const a = <Comp disabled />;\n",
      "const a = <Comp hidden={false} />;\n",
      "const a = <Comp count={1} />;\n"
    ]) {
      expect(lintFix(code).fixed).toBe(false);
    }
  });

  it("reports but does not fix when a comment sits inside the attribute", () => {
    const code = "const a = <Comp disabled={/* required */ true} />;\n";
    const result = lintFix(code);

    expect(result.output).toBe(code);
    expect(result.messages).toHaveLength(1);
  });
});
