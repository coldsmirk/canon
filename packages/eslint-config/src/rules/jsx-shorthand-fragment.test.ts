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
    rules: { "coldsmirk/jsx-shorthand-fragment": "error" }
  });
}

describe("coldsmirk/jsx-shorthand-fragment", () => {
  it("rewrites a propless named `<Fragment>` to `<>`", () => {
    expect(lintFix("const a = <Fragment>x</Fragment>;\n").output).toBe("const a = <>x</>;\n");
  });

  it("rewrites a fragment wrapping an expression child", () => {
    expect(lintFix("const a = <Fragment>{items}</Fragment>;\n").output).toBe("const a = <>{items}</>;\n");
  });

  it("leaves keyed/propped fragments and other elements untouched", () => {
    for (const code of [
      "const a = <>x</>;\n",
      "const a = <Fragment key={k}>x</Fragment>;\n",
      "const a = <Panel>x</Panel>;\n"
    ]) {
      expect(lintFix(code).fixed).toBe(false);
    }
  });
});
