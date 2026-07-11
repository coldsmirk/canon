import type { ESLint, Rule, SourceCode } from "eslint";

import { Linter } from "eslint";

type Comment = ReturnType<SourceCode["getAllComments"]>[number];

type ReportFix = NonNullable<Rule.ReportDescriptor["fix"]>;

const LINEBREAK_PATTERN = /\r\n|[\n\r\u{2028}\u{2029}]/u;

// Plugins already processed — wrapping is idempotent across factory calls.
const WRAPPED_PLUGINS = new WeakSet<ESLint.Plugin>();

/**
 * Make every fix and suggestion of a plugin comment-safe, IN PLACE. ESLint core fixers bail out
 * when a comment sits in the range they rewrite; several plugin fixers do not (`@stylistic`
 * `jsx-tag-spacing` / `jsx-equals-spacing` replace inter-token ranges wholesale;
 * `unused-imports/no-unused-imports` deletes whole import declarations) — silently destroying the
 * comment, and in a multi-pass `--fix` run later fixers then cascade on the comment-free output.
 *
 * A fix group that intersects a comment is applied to the source, reparsed with the active language
 * parser, and compared by logical comment lines. Delimiter-only transformations (`spaced-comment`,
 * `multiline-comment-style`) remain fixable, while deleting any comment — including an empty or
 * whitespace-only one — withholds the whole fix group. Unrelated fixes skip that extra parse, and
 * suggestions pass through the same guard.
 *
 * Mutating the plugin (rather than returning a wrapped clone) is deliberate: rule ids, options,
 * messages AND the plugin object's identity are preserved, so a trailing consumer config that
 * re-registers the same plugin instance (e.g. an official preset output) composes instead of
 * throwing ESLint's "Cannot redefine plugin".
 */
export function withCommentSafeFixes(plugin: ESLint.Plugin): ESLint.Plugin {
  if (WRAPPED_PLUGINS.has(plugin)) {
    return plugin;
  }

  WRAPPED_PLUGINS.add(plugin);

  const rules = (plugin.rules ?? {}) as Record<string, Rule.RuleModule>;

  for (const [name, rule] of Object.entries(rules)) {
    rules[name] = wrapRule(rule);
  }

  return plugin;
}

function wrapRule(rule: Rule.RuleModule): Rule.RuleModule {
  return {
    ...rule,
    create(context) {
      // Prototype chain: every context member except `report` passes through untouched.
      const guarded = Object.create(context, {
        report: {
          value: (descriptor: Rule.ReportDescriptor) => {
            context.report(guardDescriptor(context, descriptor));
          }
        }
      }) as Rule.RuleContext;

      return rule.create(guarded);
    }
  };
}

function guardDescriptor(context: Rule.RuleContext, descriptor: Rule.ReportDescriptor): Rule.ReportDescriptor {
  const guardedFix = typeof descriptor.fix === "function" ? guardFix(context, descriptor.fix) : descriptor.fix;
  const guardedSuggestions = descriptor.suggest?.map(suggestion => {
    return {
      ...suggestion,
      fix: guardFix(context, suggestion.fix)
    };
  });

  return {
    ...descriptor,
    fix: guardedFix,
    suggest: guardedSuggestions
  };
}

function guardFix(context: Rule.RuleContext, fix: ReportFix): ReportFix {
  return fixer => {
    const produced = fix(fixer);
    const fixes = produced === null ? [] : isIterable(produced) ? [...produced] : [produced];

    // All-or-nothing: a multi-part fix is only meaningful as a whole.
    return preservesComments(context, fixes) ? fixes : [];
  };
}

function isIterable(value: Rule.Fix | Iterable<Rule.Fix>): value is Iterable<Rule.Fix> {
  return typeof (value as Partial<Iterable<Rule.Fix>>)[Symbol.iterator] === "function";
}

function preservesComments(context: Rule.RuleContext, fixes: Rule.Fix[]): boolean {
  const comments = context.sourceCode.getAllComments();

  if (comments.length === 0 || fixes.every(fix => comments.every(comment => !intersectsComment(fix, comment)))) {
    return true;
  }

  const before = commentSignature(comments);
  const output = applyFixes(context.sourceCode.text, fixes);

  if (output === null) {
    return false;
  }

  const after = parseComments(context, output);

  return after !== null && signaturesEqual(before, commentSignature(after));
}

function intersectsComment(fix: Rule.Fix, comment: Comment): boolean {
  const [start, end] = fix.range;

  if (comment.range === undefined) {
    return true;
  }

  const [commentStart, commentEnd] = comment.range;

  // Insertions have no width, but one inside a comment can still change its tokenization.
  return start === end
    ? commentStart < start && start < commentEnd
    : commentStart < end && commentEnd > start;
}

function applyFixes(source: string, fixes: Rule.Fix[]): string | null {
  const sorted = fixes.toSorted((left, right) => left.range[0] - right.range[0] || left.range[1] - right.range[1]);
  let cursor = 0;
  let output = "";

  for (const fix of sorted) {
    const [start, end] = fix.range;

    if (start < cursor || start < 0 || end < start || end > source.length) {
      return null;
    }

    output += source.slice(cursor, start);
    output += fix.text;
    cursor = end;
  }

  return output + source.slice(cursor);
}

function parseComments(context: Rule.RuleContext, source: string): Comment[] | null {
  const linter = new Linter({ cwd: context.cwd });
  const messages = linter.verify(source, { files: ["**"], languageOptions: context.languageOptions }, { filename: context.filename });

  if (messages.some(message => message.fatal)) {
    return null;
  }

  return linter.getSourceCode()?.getAllComments() ?? null;
}

function commentSignature(comments: Comment[]): string[] {
  return comments.flatMap(comment => normalizeCommentLines(comment));
}

function normalizeCommentLines(comment: Comment): string[] {
  const lines = comment.value.split(LINEBREAK_PATTERN);

  if (comment.type !== "Block" || lines.length === 1) {
    return [comment.value.trim()];
  }

  // Boundary lines are pure decoration when they hold only whitespace and asterisks: the `/**`
  // opener leaves a stray `*` on the first value line (and `**/` on the last), which must not
  // demote a starred comment to the line-by-line form — `/* foo */` and `/** foo */` bodies must
  // normalize to the same signature.
  const starred = lines.every((line, index) => index === 0 || index === lines.length - 1 ? /^[\s*]*$/u.test(line) : /^\s*\*/u.test(line));
  const contentLines = starred ? lines.slice(1, -1) : lines;
  const normalized = contentLines.map(line => line.replace(/^\s*\*?\s*/u, "").trimEnd());

  // A formatter may represent one logical empty comment with no content lines; retain a marker so
  // deleting that comment does not compare equal to preserving it.
  return normalized.length === 0 ? [""] : normalized;
}

function signaturesEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
