import type { VersionFileOperations, VersionFileWrite } from "./version-core";

import {
  computeNextVersion,
  rewriteManifestVersion,
  writeVersionFiles
} from "./version-core";

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

  it("rewrites only the top-level version field, preserving formatting", () => {
    const rewritten = rewriteManifestVersion(manifest, "0.5.2", "0.6.0", "pkg/package.json");

    expect(JSON.parse(rewritten).version).toBe("0.6.0");
    expect(rewritten).toContain(String.raw`"description": "version: \"fake\""`);
  });

  it("finds the top-level version structurally and preserves its surrounding whitespace", () => {
    const nestedFirst = "{\n  \"metadata\": { \"version\": \"schema-1\" },\n  \"version\"  :   \"0.5.2\"\n}\n";
    const rewritten = rewriteManifestVersion(nestedFirst, "0.5.2", "0.6.0", "pkg/package.json");

    expect(rewritten).toContain("\"metadata\": { \"version\": \"schema-1\" }");
    expect(rewritten).toContain("\"version\"  :   \"0.6.0\"");
    expect(JSON.parse(rewritten).version).toBe("0.6.0");
  });

  it("enforces the lockstep invariant (manifest must carry the current version)", () => {
    expect(() => rewriteManifestVersion(manifest, "0.9.9", "1.0.0", "pkg/package.json")).toThrow(/lockstep bump aborted/);
  });

  it("fails loudly when a manifest has no version field instead of skipping it", () => {
    expect(() => rewriteManifestVersion("{\n  \"name\": \"pkg\"\n}\n", "0.5.2", "0.6.0", "pkg/package.json")).toThrow(/lockstep bump aborted/);
  });
});

describe("writeVersionFiles", () => {
  const writes: VersionFileWrite[] = [
    {
      path: "/repo/a.json",
      original: "a-old",
      contents: "a-new"
    },
    {
      path: "/repo/b.json",
      original: "b-old",
      contents: "b-new"
    },
    {
      path: "/repo/c.json",
      original: "c-old",
      contents: "c-new"
    }
  ];

  it("stages every file before replacing the targets", () => {
    const { files, operations } = createMemoryFileSystem(writes);

    writeVersionFiles(writes, operations, temporaryPath);

    expect(Object.fromEntries(files)).toEqual({
      "/repo/a.json": "a-new",
      "/repo/b.json": "b-new",
      "/repo/c.json": "c-new"
    });
  });

  it("cleans staged files when staging fails before replacement", () => {
    const stagingError = new Error("staging failed");
    const { files, operations } = createMemoryFileSystem(writes, {
      failWrite: path => path.includes("b.json.1.next") ? stagingError : undefined
    });

    expect(captureError(() => writeVersionFiles(writes, operations, temporaryPath))).toBe(stagingError);
    expect(Object.fromEntries(files)).toEqual({
      "/repo/a.json": "a-old",
      "/repo/b.json": "b-old",
      "/repo/c.json": "c-old"
    });
  });

  it("does not replace targets when staging an original backup fails", () => {
    const stagingError = new Error("backup staging failed");
    const { files, operations } = createMemoryFileSystem(writes, {
      failWrite: path => path.includes("b.json.1.rollback") ? stagingError : undefined
    });

    expect(captureError(() => writeVersionFiles(writes, operations, temporaryPath))).toBe(stagingError);
    expect(Object.fromEntries(files)).toEqual({
      "/repo/a.json": "a-old",
      "/repo/b.json": "b-old",
      "/repo/c.json": "c-old"
    });
  });

  it("rolls back replacements and rethrows the original rename error", () => {
    const renameError = new Error("rename failed");
    const { files, operations } = createMemoryFileSystem(writes, {
      failRename: from => from.includes("b.json.1.next") ? renameError : undefined
    });

    expect(captureError(() => writeVersionFiles(writes, operations, temporaryPath))).toBe(renameError);
    expect(Object.fromEntries(files)).toEqual({
      "/repo/a.json": "a-old",
      "/repo/b.json": "b-old",
      "/repo/c.json": "c-old"
    });
  });

  it("reports an incomplete rollback without hiding the original rename error", () => {
    const renameError = new Error("rename failed");
    const rollbackError = new Error("rollback failed");
    const { files, operations } = createMemoryFileSystem(writes, {
      failRename: from => {
        if (from.includes("b.json.1.next")) {
          return renameError;
        }

        return from.includes("a.json.0.rollback") ? rollbackError : undefined;
      }
    });

    const error = captureError(() => writeVersionFiles(writes, operations, temporaryPath));

    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).cause).toBe(renameError);
    expect((error as AggregateError).errors[0]).toBe(renameError);
    expect((error as AggregateError).message).toMatch(/rollback was incomplete/);
    expect(Object.fromEntries(files)).toEqual({
      "/repo/a.json": "a-new",
      "/repo/a.json.0.rollback.tmp": "a-old",
      "/repo/b.json": "b-old",
      "/repo/c.json": "c-old"
    });
  });
});

function createMemoryFileSystem(
  writes: readonly VersionFileWrite[],
  failures: {
    failRename?: (from: string, to: string) => Error | undefined;
    failWrite?: (path: string, contents: string) => Error | undefined;
  } = {}
): { files: Map<string, string>; operations: VersionFileOperations } {
  const files = new Map(writes.map(write => [write.path, write.original]));

  return {
    files,
    operations: {
      remove: path => {
        if (!files.delete(path)) {
          throw new Error(`Missing file: ${path}`);
        }
      },
      rename: (from, to) => {
        const failure = failures.failRename?.(from, to);

        if (failure !== undefined) {
          throw failure;
        }

        const contents = files.get(from);

        if (contents === undefined) {
          throw new Error(`Missing file: ${from}`);
        }

        files.set(to, contents);
        files.delete(from);
      },
      write: (path, contents) => {
        const failure = failures.failWrite?.(path, contents);

        if (failure !== undefined) {
          throw failure;
        }

        files.set(path, contents);
      }
    }
  };
}

function temporaryPath(path: string, index: number, purpose: "next" | "rollback"): string {
  return `${path}.${index}.${purpose}.tmp`;
}

function captureError(callback: () => void): unknown {
  try {
    callback();
  } catch (error) {
    return error;
  }

  throw new Error("Expected callback to throw.");
}
