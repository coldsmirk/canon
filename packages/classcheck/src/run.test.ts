import { join, relative } from "node:path";

import { ClasscheckError, runClasscheck } from "./run";

const FIXTURES = join(import.meta.dirname, "fixtures");

describe("runClasscheck", () => {
  it("rejects a missing entry before spawning anything", async () => {
    await expect(runClasscheck({ entry: "missing.css" }, { cwd: FIXTURES })).rejects.toThrow(ClasscheckError);
  });

  it("rejects a missing allowFrom stylesheet — a silent hole in the allowlist is worse than an error", async () => {
    await expect(
      runClasscheck({
        entry: "app.css",
        source: ["."],
        allowFrom: ["styles/missing.css"]
      }, { cwd: FIXTURES })
    ).rejects.toThrow(ClasscheckError);
  });

  // One server run over the whole fixture project; every behavioural assertion reads from it.
  describe("against the fixture project (real language server)", () => {
    let messages: string[] = [];

    beforeAll(async () => {
      const result = await runClasscheck(
        {
          entry: "app.css",
          source: ["."],
          allowFrom: ["styles/handwritten.css"]
        },
        { cwd: FIXTURES }
      );

      messages = result.findings.map(f => `${relative(FIXTURES, f.file)}:${f.line}: ${f.message}`);
    }, 180_000);

    it("reports a class typo in JSX (`felx`) at its line", () => {
      expect(messages.some(m => m.startsWith("widget.tsx:7") && m.includes("unknown class `felx`"))).toBe(true);
    });

    it("reports a typo inside a cva variant map in a plain .ts module", () => {
      expect(messages.some(m => m.startsWith("variants.ts:") && m.includes("text-skyy-500"))).toBe(true);
    });

    it("reports a typo written as a clsx object key", () => {
      expect(messages.some(m => m.includes("unknown class `badkey`"))).toBe(true);
    });

    it("accepts utilities from the entry, entry-defined selectors, and allowlisted hand-written classes", () => {
      for (const token of ["`tap`", "`entry-defined`", "`readout`", "`text-red-500`", "`flex`", "`p-2`"]) {
        expect(messages.filter(m => m.includes(token)), token).toEqual([]);
      }
    });

    it("does not treat cva defaultVariants values as classes", () => {
      expect(messages.filter(m => m.includes("`hot`"))).toEqual([]);
    });

    it("surfaces the server's own stylesheet diagnostics (v3 leftovers in legacy.css)", () => {
      expect(messages.some(m => m.startsWith("legacy.css:"))).toBe(true);
    });

    it("keeps the clean stylesheets clean", () => {
      expect(messages.filter(m => m.startsWith("app.css:"))).toEqual([]);
      expect(messages.filter(m => m.startsWith(join("styles", "handwritten.css")))).toEqual([]);
    });
  });
});
