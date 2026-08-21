import { classSelectorsIn, isMarkerClass } from "./allowlist";

describe("classSelectorsIn", () => {
  it("collects class selectors, including compound and nested ones", () => {
    const css = ".readout { color: red; }\n.card .card-title:hover { color: blue; }\n";

    expect(classSelectorsIn(css)).toEqual(["readout", "card", "card-title"]);
  });

  it("does not let comments vouch for a name the stylesheet never defines", () => {
    expect(classSelectorsIn("/* about .ghost */\n.real { color: red; }\n")).toEqual(["real"]);
  });

  it("keeps decimals and function results out (.5 in p-1.5, url(x).frag)", () => {
    expect(classSelectorsIn(".x { width: 1.5rem; background: url(a.png).frag; }")).toEqual(["x"]);
  });
});

describe("isMarkerClass", () => {
  it("recognises group/peer and their named forms only", () => {
    expect(isMarkerClass("group")).toBe(true);
    expect(isMarkerClass("peer/label")).toBe(true);
    expect(isMarkerClass("grouped")).toBe(false);
    expect(isMarkerClass("flex")).toBe(false);
  });
});
