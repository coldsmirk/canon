import { extractClassTokens } from "./extract";

const tokensOf = (text: string, file = "example.tsx") => extractClassTokens(file, text).map(t => t.token);

describe("extractClassTokens", () => {
  it("reads plain className strings with exact positions", () => {
    const tokens = extractClassTokens("example.tsx", "export const a = <div className=\"flex p-2\" />;\n");

    expect(tokens).toEqual([
      {
        token: "flex",
        file: "example.tsx",
        line: 0,
        character: 33
      },
      {
        token: "p-2",
        file: "example.tsx",
        line: 0,
        character: 38
      }
    ]);
  });

  it("walks templates, ternaries, and the module constants they interpolate", () => {
    const text = [
      "const TONE = active ? \"text-red-500\" : \"text-sky-500\";",
      `export const a = <div className={\`tap \${TONE}\`} />;`
    ].join("\n");

    expect(tokensOf(text)).toEqual(expect.arrayContaining(["tap", "text-red-500", "text-sky-500"]));
  });

  it("reads classNames slot maps and plain class attribute objects", () => {
    const text = [
      "export const a = <Field classNames={{ input: \"readout\" }} />;",
      "export const b = { class: \"prose-sm\" };"
    ].join("\n");

    expect(tokensOf(text)).toEqual(expect.arrayContaining(["readout", "prose-sm"]));
  });

  it("treats bare cva calls as class sites but skips defaultVariants values", () => {
    const text = [
      "export const chip = cva(\"tap p-2\", {",
      "  variants: { tone: { hot: \"text-red-500\" } },",
      "  defaultVariants: { tone: \"hot\" }",
      "});"
    ].join("\n");
    const tokens = tokensOf(text, "variants.ts");

    expect(tokens).toEqual(expect.arrayContaining(["tap", "p-2", "text-red-500"]));
    expect(tokens).not.toContain("hot");
  });

  it("resolves a call's callee back to the cva constant that holds the classes", () => {
    const text = [
      "const button = cva(\"inline-flex\");",
      "export const a = <button className={button({ size: \"sm\" })} />;"
    ].join("\n");

    expect(tokensOf(text)).toContain("inline-flex");
  });

  it("parses object KEYS for clsx (quoted and bare), but not for cva", () => {
    const text = "export const a = <div className={clsx({ \"flex p-2\": on, badkey: off })} />;";
    const tokens = tokensOf(text);

    expect(tokens).toEqual(expect.arrayContaining(["flex", "p-2", "badkey"]));
  });

  it("ignores strings that no class site reaches", () => {
    expect(tokensOf("const greeting = \"hello world\";\nexport default greeting;", "plain.ts")).toEqual([]);
  });
});
