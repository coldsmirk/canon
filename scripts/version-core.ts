// Version arithmetic and manifest rewriting for scripts/version.ts, split out so each boundary can
// be tested without running the script on import.
import semver from "semver";

/**
 * Compute the next lockstep version and validate it. Throws on anything that is not a plain,
 * canonical, strictly-greater stable x.y.z — invalid SemVer (leading zeros, junk), prerelease or
 * build-metadata suffixes, non-canonical spellings (whitespace, `v` handled by normalization),
 * downgrades, and republishes all abort.
 */
export function computeNextVersion(current: string, bump: string): string {
  if (semver.valid(current) === null) {
    throw new Error(`Root manifest version "${current}" is not valid SemVer — fix package.json before bumping.`);
  }

  const next = nextVersion(current, bump);

  // Canonical equality, not mere validity: semver.valid() trims whitespace and DROPS build
  // metadata, so " 0.6.0 " or "0.7.0+meta" round-trips to a DIFFERENT string than the one about
  // to be written into the manifests. The value written must be exactly the canonical form.
  if (semver.valid(next) !== next || semver.prerelease(next) !== null) {
    throw new Error(`Refusing to write invalid or non-stable version "${next}" (current "${current}") — pass a plain x.y.z instead.`);
  }

  // Releases only move forward: an explicit version <= current would downgrade or republish, and
  // the tag/publish pipeline downstream assumes monotonic versions.
  if (!semver.gt(next, current)) {
    throw new Error(`Refusing to move from "${current}" to "${next}" — the new version must be greater.`);
  }

  return next;
}

/**
 * Rewrite the top-level "version" field of a manifest's raw text, preserving formatting. Verifies
 * the lockstep invariant (the manifest must carry `expectedCurrent`), replaces the first
 * `"version": "…"` occurrence, and re-parses the result to prove the rewrite landed on the real
 * top-level field — a manifest with no version, or whose first match is a nested lookalike, aborts
 * loudly instead of being silently mis-rewritten. That verification is the whole safety story:
 * this only ever runs against the repo's conventional package.json files inside a git tree.
 */
export function rewriteManifestVersion(contents: string, expectedCurrent: string, next: string, label: string): string {
  const manifestVersion = (JSON.parse(contents) as { version?: string }).version;

  if (manifestVersion !== expectedCurrent) {
    throw new Error(`${label} carries version "${manifestVersion}", expected "${expectedCurrent}" — lockstep bump aborted.`);
  }

  // Replacer as a function: a plain-string replacement would interpret `$`-sequences in it.
  const rewritten = contents.replace(/"version"\s*:\s*"[^"]+"/, () => `"version": "${next}"`);

  if ((JSON.parse(rewritten) as { version?: string }).version !== next) {
    throw new Error(`Failed to rewrite the top-level version field in ${label}.`);
  }

  return rewritten;
}

function nextVersion(version: string, kind: string): string {
  if (kind === "major" || kind === "minor" || kind === "patch") {
    const incremented = semver.inc(version, kind);

    if (incremented === null) {
      throw new Error(`Cannot ${kind}-bump "${version}".`);
    }

    return incremented;
  }

  // Explicit version: must be plain x.y.z (a leading "v" is tolerated and normalized away).
  // Shape-check the RAW input before semver.valid() may normalize it — valid() silently drops
  // build metadata and trims whitespace, which would write a different version than the one asked
  // for. Anything that fails the shape check passes through unchanged and aborts at the canonical
  // guard with the original input in the message.
  if (!/^v?\d+\.\d+\.\d+$/.test(kind)) {
    return kind;
  }

  return semver.valid(kind) ?? kind;
}
