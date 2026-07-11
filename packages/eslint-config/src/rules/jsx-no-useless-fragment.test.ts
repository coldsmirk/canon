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
    rules: { "coldsmirk/jsx-no-useless-fragment": "error" }
  });
}

const REACT_IMPORT = "import { Fragment } from \"react\";\n";

describe("coldsmirk/jsx-no-useless-fragment", () => {
  it("unwraps a shorthand fragment that wraps a single element", () => {
    expect(lintFix("const a = <><div>b</div></>;\n").output).toBe("const a = <div>b</div>;\n");
  });

  it("unwraps a fragment directly inside a host element", () => {
    expect(lintFix("const a = <div><>{x}{y}</></div>;\n").output).toBe("const a = <div>{x}{y}</div>;\n");
    expect(lintFix("const a = <div><>text</></div>;\n").output).toBe("const a = <div>text</div>;\n");
  });

  it("unwraps a propless `<Fragment>` that provably resolves to React's", () => {
    expect(lintFix(`${REACT_IMPORT}const a = <Fragment><div>b</div></Fragment>;\n`).output)
      .toBe(`${REACT_IMPORT}const a = <div>b</div>;\n`);
  });

  it("collapses padding whitespace when unwrapping a multiline fragment", () => {
    expect(lintFix("const a = (\n  <>\n    <div>b</div>\n  </>\n);\n").output)
      .toBe("const a = (\n  <div>b</div>\n);\n");
  });

  it("leaves meaningful fragments alone", () => {
    for (const code of [
      // Two children: the fragment is load-bearing.
      "const a = <><div>a</div><div>b</div></>;\n",
      // A lone expression child: the fragment coerces it into a renderable node (allowExpressions).
      "const a = <>{items}</>;\n",
      // A lone text child outside JSX.
      "const a = <>text</>;\n",
      // A keyed Fragment cannot be expressed any other way.
      "import { Fragment } from \"react\";\nconst a = items.map(i => <Fragment key={i}>{i}</Fragment>);\n"
    ]) {
      const result = lintFix(code);

      expect(result.fixed, code).toBe(false);
      expect(result.messages, code).toEqual([]);
    }
  });

  it("never judges a `Fragment` that is not provably React's", () => {
    for (const code of [
      // Local or third-party Fragment components render real output — unwrapping deletes it.
      "import { Fragment } from \"./layout\";\nconst a = <Fragment><div>b</div></Fragment>;\n",
      "function Fragment(props) { return <section>{props.children}</section>; }\nconst a = <Fragment><div>b</div></Fragment>;\n",
      // Unresolved — not provably React's.
      "const a = <Fragment><div>b</div></Fragment>;\n"
    ]) {
      const result = lintFix(code);

      expect(result.fixed, code).toBe(false);
      expect(result.messages, code).toEqual([]);
    }
  });

  it("reports a useless fragment under a component parent without a fix (children shape may matter)", () => {
    const result = lintFix("const a = <Panel><><div>b</div></></Panel>;\n");

    expect(result.fixed).toBe(false);
    expect(result.messages).toHaveLength(1);
  });

  it("reports an empty fragment but never autofixes it away", () => {
    const result = lintFix("const a = <></>;\n");

    expect(result.output).toBe("const a = <></>;\n");
    expect(result.messages).toHaveLength(1);
  });

  it("reports but does not fix when a comment sits inside a tag", () => {
    const code = `${REACT_IMPORT}const a = <div><Fragment /* keep */><span>b</span></Fragment></div>;\n`;
    const result = lintFix(code);

    expect(result.output).toBe(code);
    expect(result.messages).toHaveLength(1);
  });

  it("keeps `{/* comment */}` children alive", () => {
    // Inside a host element the children are copied back verbatim, comment included.
    expect(lintFix("const a = <div><>{/* keep */}<span>b</span></></div>;\n").output)
      .toBe("const a = <div>{/* keep */}<span>b</span></div>;\n");

    // Outside JSX an expression child cannot be spliced out — report without a fix.
    const outside = lintFix("const a = <>{/* keep */}<div>b</div></>;\n");

    expect(outside.fixed).toBe(false);
    expect(outside.messages).toHaveLength(1);
  });
});
