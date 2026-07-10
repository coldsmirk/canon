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
  it("rewrites a propless `<Fragment>` imported from react to `<>`", () => {
    expect(lintFix("import { Fragment } from \"react\";\nconst a = <Fragment>x</Fragment>;\n").output)
      .toBe("import { Fragment } from \"react\";\nconst a = <>x</>;\n");
  });

  it("rewrites a fragment wrapping an expression child", () => {
    expect(lintFix("import { Fragment } from \"react\";\nconst a = <Fragment>{items}</Fragment>;\n").output)
      .toBe("import { Fragment } from \"react\";\nconst a = <>{items}</>;\n");
  });

  it("leaves keyed/propped fragments and other elements untouched", () => {
    for (const code of [
      "import { Fragment } from \"react\";\nconst a = <>x</>;\n",
      "import { Fragment } from \"react\";\nconst a = <Fragment key={k}>x</Fragment>;\n",
      "import { Fragment } from \"react\";\nconst a = <Panel>x</Panel>;\n"
    ]) {
      expect(lintFix(code).fixed, code).toBe(false);
    }
  });

  it("never touches a `Fragment` that is not React's — rewriting it would change behavior", () => {
    for (const code of [
      // Local or third-party Fragment components render real output.
      "import { Fragment } from \"./layout\";\nconst a = <Fragment>x</Fragment>;\n",
      // Aliased import of something else under the Fragment name.
      "import { Component as Fragment } from \"react\";\nconst a = <Fragment>x</Fragment>;\n",
      // Locally-defined component.
      "function Fragment(props) { return props.children; }\nconst a = <Fragment>x</Fragment>;\n",
      // Unresolved — not provably React's, so the rewrite is not provably safe.
      "const a = <Fragment>x</Fragment>;\n"
    ]) {
      const result = lintFix(code);

      expect(result.fixed, code).toBe(false);
      expect(result.messages, code).toEqual([]);
    }
  });

  it("reports but does not fix when a comment sits inside a tag", () => {
    const code = "import { Fragment } from \"react\";\nconst a = <Fragment /* keyed later */>x</Fragment>;\n";
    const result = lintFix(code);

    expect(result.output).toBe(code);
    expect(result.messages).toHaveLength(1);
  });
});
