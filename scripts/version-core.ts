// Version arithmetic, structured manifest rewriting, and injected file-transaction logic for
// scripts/version.ts, split out so each boundary can be tested without running the script on import.
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
 * the lockstep invariant (the manifest must carry `expectedCurrent`) and re-parses the result to
 * prove the rewrite actually landed — a manifest missing a top-level "version" would otherwise be
 * skipped silently.
 */
export function rewriteManifestVersion(contents: string, expectedCurrent: string, next: string, label: string): string {
  const manifestVersion = (JSON.parse(contents) as { version?: string }).version;

  if (manifestVersion !== expectedCurrent) {
    throw new Error(`${label} carries version "${manifestVersion}", expected "${expectedCurrent}" — lockstep bump aborted.`);
  }

  const range = findTopLevelVersionRange(contents);

  if (range === undefined) {
    throw new Error(`Failed to locate the top-level version field in ${label}.`);
  }

  const rewritten = `${contents.slice(0, range.start)}${JSON.stringify(next)}${contents.slice(range.end)}`;

  if ((JSON.parse(rewritten) as { version?: string }).version !== next) {
    throw new Error(`Failed to rewrite the version field in ${label}.`);
  }

  return rewritten;
}

export interface VersionFileWrite {
  contents: string;
  original: string;
  path: string;
}

export interface VersionFileOperations {
  remove: (path: string) => void;
  rename: (from: string, to: string) => void;
  write: (path: string, contents: string) => void;
}

/**
 * Stage both the original and next contents beside every target before replacing any target. If
 * replacement fails, restore already-replaced files in reverse order using the staged originals.
 */
export function writeVersionFiles(
  files: readonly VersionFileWrite[],
  operations: VersionFileOperations,
  temporaryPath: (path: string, index: number, purpose: "next" | "rollback") => string
): void {
  const staged = files.map((file, index) => {
    return {
      ...file,
      nextPath: temporaryPath(file.path, index, "next"),
      rollbackPath: temporaryPath(file.path, index, "rollback")
    };
  });
  let replaced = 0;

  try {
    for (const file of staged) {
      operations.write(file.rollbackPath, file.original);
    }

    for (const file of staged) {
      operations.write(file.nextPath, file.contents);
    }

    for (const file of staged) {
      operations.rename(file.nextPath, file.path);
      replaced += 1;
    }
  } catch (error) {
    const rollbackFailures: Array<{ error: unknown; path: string; rollbackPath: string }> = [];

    for (let index = replaced - 1; index >= 0; index -= 1) {
      const file = staged[index]!;

      try {
        operations.rename(file.rollbackPath, file.path);
      } catch (rollbackError) {
        rollbackFailures.push({
          error: rollbackError,
          path: file.path,
          rollbackPath: file.rollbackPath
        });
      }
    }

    const retainedBackups = new Set(rollbackFailures.map(failure => failure.rollbackPath));

    for (const file of staged) {
      safelyRemove(file.nextPath, operations);

      if (!retainedBackups.has(file.rollbackPath)) {
        safelyRemove(file.rollbackPath, operations);
      }
    }

    if (rollbackFailures.length > 0) {
      const details = rollbackFailures
        .map(failure => `${failure.path} (backup: ${failure.rollbackPath})`)
        .join(", ");
      const failures = rollbackFailures.map(failure => new Error(`Failed to restore ${failure.path} from ${failure.rollbackPath}.`, {
        cause: failure.error
      }));

      throw new AggregateError(
        [error, ...failures],
        `Version update failed and rollback was incomplete for ${details}.`,
        { cause: error }
      );
    }

    throw error;
  }

  for (const file of staged) {
    safelyRemove(file.nextPath, operations);
    safelyRemove(file.rollbackPath, operations);
  }
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

function findTopLevelVersionRange(contents: string): { end: number; start: number } | undefined {
  let cursor = skipWhitespace(contents, 0);

  if (contents[cursor] !== "{") {
    return undefined;
  }

  cursor += 1;
  let versionRange: { end: number; start: number } | undefined;

  while (cursor < contents.length) {
    cursor = skipWhitespace(contents, cursor);

    if (contents[cursor] === "}") {
      return versionRange;
    }

    const key = readJsonString(contents, cursor);
    cursor = skipWhitespace(contents, key.end);

    if (contents[cursor] !== ":") {
      return undefined;
    }

    cursor = skipWhitespace(contents, cursor + 1);

    if (key.value === "version") {
      const value = readJsonString(contents, cursor);
      versionRange = { start: cursor, end: value.end };
      cursor = value.end;
    } else {
      cursor = skipJsonValue(contents, cursor);
    }

    cursor = skipWhitespace(contents, cursor);

    if (contents[cursor] === ",") {
      cursor += 1;
      continue;
    }

    if (contents[cursor] === "}") {
      return versionRange;
    }

    return undefined;
  }

  return undefined;
}

function readJsonString(contents: string, start: number): { end: number; value: string } {
  if (contents[start] !== "\"") {
    throw new Error("Expected a JSON string.");
  }

  for (let cursor = start + 1; cursor < contents.length; cursor += 1) {
    if (contents[cursor] === "\\") {
      cursor += 1;
    } else if (contents[cursor] === "\"") {
      const end = cursor + 1;
      return { end, value: JSON.parse(contents.slice(start, end)) as string };
    }
  }

  throw new Error("Unterminated JSON string.");
}

function skipJsonValue(contents: string, start: number): number {
  const depth = { arrays: 0, objects: 0 };
  let inString = false;

  for (let cursor = start; cursor < contents.length; cursor += 1) {
    const character = contents[cursor];

    if (inString) {
      if (character === "\\") {
        cursor += 1;
      } else if (character === "\"") {
        inString = false;
      }

      continue;
    }

    const result = processJsonValueCharacter(character, depth);

    if (result === "string") {
      inString = true;
    } else if (result === "delimiter") {
      return cursor;
    }
  }

  return contents.length;
}

function processJsonValueCharacter(
  character: string | undefined,
  depth: { arrays: number; objects: number }
): "delimiter" | "other" | "string" {
  switch (character) {
    case "\"": {
      return "string";
    }

    case "[": {
      depth.arrays += 1;

      return "other";
    }

    case "]": {
      depth.arrays -= 1;

      return "other";
    }

    case "{": {
      depth.objects += 1;

      return "other";
    }

    case "}": {
      if (depth.objects > 0) {
        depth.objects -= 1;

        return "other";
      }

      return depth.arrays === 0 ? "delimiter" : "other";
    }

    case ",": {
      return depth.arrays === 0 && depth.objects === 0 ? "delimiter" : "other";
    }

    default: {
      return "other";
    }
  }
}

function skipWhitespace(contents: string, start: number): number {
  let cursor = start;

  while (cursor < contents.length && /\s/u.test(contents[cursor]!)) {
    cursor += 1;
  }

  return cursor;
}

function safelyRemove(path: string, operations: VersionFileOperations): void {
  try {
    operations.remove(path);
  } catch {
    // Preserve the original staging or replacement error.
  }
}
