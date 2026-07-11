import { isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";

import conventional from "@commitlint/config-conventional";
import lint from "@commitlint/lint";

import { defineCommitlintConfig } from "./index";

// Run a message through real @commitlint/lint with the exact rule set a consumer resolves:
// config-conventional's rules (this package's extends target) overlaid with ours, plus our
// ignores policy. Types are cast once here — QualifiedRules is structurally what both provide.
function lintMessage(message: string) {
  const config = defineCommitlintConfig();

  return lint(message, { ...conventional.rules, ...config.rules } as never, {
    defaultIgnores: config.defaultIgnores,
    ignores: config.ignores
  });
}

describe("defineCommitlintConfig", () => {
  it("resolves extends to an absolute path (pnpm-safe for consumers) that loads config-conventional", async () => {
    // commitlint resolves bare extends names from the CONSUMER's config location, where this
    // package's dependencies are invisible under pnpm's strict isolation — a bare name is a regression.
    const [preset = ""] = defineCommitlintConfig().extends as string[];

    expect(isAbsolute(preset)).toBe(true);

    const loaded = (await import(pathToFileURL(preset).href)) as { default: { rules: Record<string, unknown> } };

    expect(loaded.default.rules["type-enum"]).toBeDefined();
  });

  it("accepts a conventional single-line message", async () => {
    const result = await lintMessage("feat(scope): add the thing");

    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("keeps Conventional Commits mandatory for every non-workflow message", async () => {
    for (const message of ["feature: add the thing", "not a conventional commit", "feat(scope) missing colon"]) {
      const result = await lintMessage(message);

      expect(result.valid, message).toBe(false);
    }
  });

  it("rejects a body and a footer (single-line contract)", async () => {
    const withBody = await lintMessage("fix: broken thing\n\nlong explanation that belongs in the PR");
    const withFooter = await lintMessage("fix: broken thing\n\nBREAKING CHANGE: everything");

    expect(withBody.valid).toBe(false);
    expect(withBody.errors.map(e => e.name)).toContain("body-empty");
    expect(withFooter.valid).toBe(false);
  });

  it("rejects the shapes commitlint's defaultIgnores would wave through (revert bodies, bare semver)", async () => {
    // `git revert` default message: body carries the reverted hash — must be rewritten as `revert: …`.
    const revert = await lintMessage("Revert \"feat: add the thing\"\n\nThis reverts commit 1234567.\n");
    // Bare semver subject: must be written as `chore(release): …`.
    const semverOnly = await lintMessage("0.5.2");

    expect(revert.valid).toBe(false);
    expect(semverOnly.valid).toBe(false);
  });

  it("still exempts the shapes git itself writes (merges, autosquash markers)", async () => {
    for (const message of [
      "Merge branch 'feature/x'",
      "Merge branch 'feature/x' into main",
      "Merge branch 'main' of github.com:coldsmirk/canon",
      "Merge branches 'topic-one' and 'topic-two'",
      "Merge tag 'v0.5.2' into main",
      "Merge remote-tracking branch 'origin/main' into feature/x",
      "Merge commit '8d2b20e'",
      "Merge commit '447ccb8206d149dc72ffd2df1394b45966470134'",
      `Merge commit '${"a".repeat(64)}'`,
      "Merge commit '5703a449b7e60e6235380d824c4b67003ce0f874'; commit '5ddd4df303fc724f5416680f11943b77ff8d0d3f'",
      "Merge pull request #42 from coldsmirk/feature-x",
      "amend! feat(scope): add the thing",
      "fixup! feat(scope): add the thing",
      "squash! feat(scope): add the thing"
    ]) {
      const result = await lintMessage(message);

      expect(result.valid, message).toBe(true);
    }
  });

  it("cannot be bypassed by mentioning a merge in the body (only the subject line is examined)", async () => {
    const smuggled = await lintMessage("feat: legitimate subject\n\nMerge pull request #42 from x/y\n");

    expect(smuggled.valid).toBe(false);
    expect(smuggled.errors.map(e => e.name)).toContain("body-empty");
  });

  it("does not exempt lookalike workflow prefixes or commit-shaped text without a real object ID", async () => {
    for (const message of [
      "Merge unrelated work",
      "Merge branch nonsense",
      "Merge pull request nonsense",
      "Automatic merge bypass",
      "Auto-merged topic into main",
      "fixup!not-an-autosquash-subject",
      "Merge commit 'abc'",
      "Merge commit 'not-a-hash'"
    ]) {
      const result = await lintMessage(message);

      expect(result.valid, message).toBe(false);
    }
  });

  it("does not let a workflow-looking body bypass the single-line contract", async () => {
    const result = await lintMessage("Merge branch nonsense\n\nbody");

    expect(result.valid).toBe(false);
    expect(result.errors.map(e => e.name)).toContain("body-empty");
  });

  it("still exempts a real merge commit that carries a body (conflict list)", async () => {
    const merge = await lintMessage("Merge branch 'main' into feature/x\n\nConflicts:\n\tsrc/index.ts\n");

    expect(merge.valid, JSON.stringify(merge.errors)).toBe(true);
  });
});
