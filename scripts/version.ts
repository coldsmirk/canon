// Bump the synced version across the root manifest and every publishable package, then print the
// git commands to cut the release. The package set is discovered from disk (not hardcoded) so it
// can never drift from the workspace, and writes are computed up front then flushed together so a
// missing/malformed manifest aborts before any file is mutated. Validation lives in
// scripts/version-core.ts (real SemVer via the `semver` package, canonical-form and
// monotonicity guards) where it is unit-tested. Workspace links are path-based, so the lockfile
// does not change. Run via jiti (already a dev dependency):
//   jiti scripts/version.ts <patch|minor|major|x.y.z>
import { globSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { computeNextVersion, rewriteManifestVersion } from "./version-core";

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
// can never leave a half-bumped tree. A crash mid-flush is git's job to undo (`git checkout` the
// manifests) — no transactional staging needed for five files in a tracked tree.
const writes = manifests.map(path => {
  return {
    path,
    contents: rewriteManifestVersion(readFileSync(path, "utf-8"), current, next, relative(root, path))
  };
});

for (const { path, contents } of writes) {
  writeFileSync(path, contents);
}

console.log(`Bumped ${current} -> ${next} across ${manifests.length} manifests.`);
console.log("Next:");
// Stage the touched manifests by name — `commit -am` would sweep any unrelated tracked change
// sitting in the working tree into the release commit.
console.log("  git add package.json packages/*/package.json");
console.log(`  git commit -m "chore(release): v${next}"`);
// Annotated tag (-a): `git push --follow-tags` pushes annotated tags but not lightweight ones.
console.log(`  git tag -a v${next} -m "v${next}"`);
console.log("  git push --follow-tags");
