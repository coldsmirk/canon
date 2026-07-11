import { computeNextVersion, rewriteManifestVersion } from "./version-core";

describe("computeNextVersion", () => {
  it("increments the named bump kinds", () => {
    expect(computeNextVersion("0.5.2", "patch")).toBe("0.5.3");
    expect(computeNextVersion("0.5.2", "minor")).toBe("0.6.0");
    expect(computeNextVersion("0.5.2", "major")).toBe("1.0.0");
  });

  it("accepts an explicit greater version, normalizing a leading v", () => {
    expect(computeNextVersion("0.5.2", "0.6.0")).toBe("0.6.0");
    expect(computeNextVersion("0.5.2", "v0.6.0")).toBe("0.6.0");
  });

  it("rejects non-canonical spellings that semver would silently normalize", () => {
    // semver.valid() trims whitespace and drops build metadata — the raw input must be refused,
    // not normalized into a different version than the one asked for.
    expect(() => computeNextVersion("0.5.2", " 0.6.0 ")).toThrow(/invalid or non-stable/);
    expect(() => computeNextVersion("0.5.2", "0.7.0+review")).toThrow(/invalid or non-stable/);
  });

  it("rejects invalid SemVer and prereleases", () => {
    expect(() => computeNextVersion("0.5.2", "01.2.3")).toThrow(/invalid or non-stable/);
    expect(() => computeNextVersion("0.5.2", "banana")).toThrow(/invalid or non-stable/);
    expect(() => computeNextVersion("0.5.2", "1.2.3-rc.1")).toThrow(/invalid or non-stable/);
  });

  it("rejects downgrades and republishes (versions only move forward)", () => {
    expect(() => computeNextVersion("0.5.2", "0.4.0")).toThrow(/must be greater/);
    expect(() => computeNextVersion("0.5.2", "0.5.2")).toThrow(/must be greater/);
  });

  it("bumps a prerelease current to its release, and rejects a junk current outright", () => {
    expect(computeNextVersion("0.2.0-rc.1", "patch")).toBe("0.2.0");
    expect(() => computeNextVersion("junk", "patch")).toThrow(/not valid SemVer/);
  });
});

describe("rewriteManifestVersion", () => {
  const manifest = "{\n  \"name\": \"pkg\",\n  \"version\": \"0.5.2\",\n  \"description\": \"version: \\\"fake\\\"\"\n}\n";

  it("rewrites the top-level version field, preserving the rest of the file", () => {
    const rewritten = rewriteManifestVersion(manifest, "0.5.2", "0.6.0", "pkg/package.json");

    expect(JSON.parse(rewritten).version).toBe("0.6.0");
    expect(rewritten).toContain(String.raw`"description": "version: \"fake\""`);
  });

  it("aborts loudly instead of mis-rewriting when a nested version key precedes the top-level one", () => {
    // The first-match replacement would hit the nested key; the re-parse verification catches it.
    const nestedFirst = "{\n  \"metadata\": { \"version\": \"schema-1\" },\n  \"version\": \"0.5.2\"\n}\n";

    expect(() => rewriteManifestVersion(nestedFirst, "0.5.2", "0.6.0", "pkg/package.json")).toThrow(/Failed to rewrite/);
  });

  it("enforces the lockstep invariant (manifest must carry the current version)", () => {
    expect(() => rewriteManifestVersion(manifest, "0.9.9", "1.0.0", "pkg/package.json")).toThrow(/lockstep bump aborted/);
  });

  it("fails loudly when a manifest has no version field instead of skipping it", () => {
    expect(() => rewriteManifestVersion("{\n  \"name\": \"pkg\"\n}\n", "0.5.2", "0.6.0", "pkg/package.json")).toThrow(/lockstep bump aborted/);
  });
});
