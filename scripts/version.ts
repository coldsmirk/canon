// Bump the synced version across the root manifest and every publishable package, then print the
// git commands to cut the release. The package set is discovered from disk (not hardcoded) so it
// can never drift from the workspace, and writes are computed up front then flushed together so a
// missing/malformed manifest aborts before any file is mutated. Validation lives in
// scripts/version-core.ts (real SemVer via the `semver` package, canonical-form and
// monotonicity guards) where it is unit-tested. Workspace links are path-based, so the lockfile
// does not change. Run via jiti (already a dev dependency):
//   jiti scripts/version.ts <patch|minor|major|x.y.z>
import { randomUUID } from "node:crypto";
import { globSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { computeNextVersion, rewriteManifestVersion, writeVersionFiles } from "./version-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Root first: it is the version source (read below) and the version the release tag is cut from.
// Then every non-private package manifest discovered under packages/* (sorted for stable output).
const rootManifest = join(root, "package.json");
const packageManifests = globSync("packages/*/package.json", { cwd: root })
  .map(rel => join(root, rel))
  .filter(path => JSON.parse(readFileSync(path, "utf-8")).private !== true)
  .toSorted();
const manifests = [rootManifest, ...packageManifests];

const bump = process.argv[2];

if (!bump) {
  throw new Error("Usage: jiti scripts/version.ts <patch|minor|major|x.y.z>");
}

const current = JSON.parse(readFileSync(rootManifest, "utf-8")).version as string;
const next = computeNextVersion(current, bump);

// Compute every rewrite first; only flush once all reads/replacements succeed, so a bad manifest
// can never leave a half-bumped tree.
const writes = manifests.map(path => {
  const original = readFileSync(path, "utf-8");

  return {
    path,
    original,
    contents: rewriteManifestVersion(original, current, next, relative(root, path))
  };
});

const transactionId = `${process.pid}-${randomUUID()}`;

writeVersionFiles(
  writes,
  {
    remove: unlinkSync,
    rename: renameSync,
    write: (path, contents) => writeFileSync(path, contents)
  },
  (path, index, purpose) => join(dirname(path), `.${basename(path)}.canon-version-${transactionId}-${index}-${purpose}`)
);

console.log(`Bumped ${current} -> ${next} across ${manifests.length} manifests.`);
console.log("Next:");
// Stage the touched manifests by name — `commit -am` would sweep any unrelated tracked change
// sitting in the working tree into the release commit.
console.log("  git add package.json packages/*/package.json");
console.log(`  git commit -m "chore(release): v${next}"`);
// Annotated tag (-a): `git push --follow-tags` pushes annotated tags but not lightweight ones.
console.log(`  git tag -a v${next} -m "v${next}"`);
console.log("  git push --follow-tags");
