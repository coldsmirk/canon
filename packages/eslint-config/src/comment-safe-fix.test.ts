import type { ESLint } from "eslint";

import { Linter } from "eslint";
import tslint from "typescript-eslint";

import { withCommentSafeFixes } from "./comment-safe-fix";

describe("withCommentSafeFixes", () => {
  it("does not reparse when a fix does not intersect any comment", () => {
    let parseCount = 0;
    const parser = {
      parseForESLint(...args: Parameters<typeof tslint.parser.parseForESLint>) {
        parseCount++;

        return tslint.parser.parseForESLint(...args);
      }
    };
    const plugin: ESLint.Plugin = withCommentSafeFixes({
      rules: {
        rename: {
          create(context) {
            return {
              Program(node) {
                context.report({
                  fix: fixer => fixer.replaceTextRange([19, 24], "renamed"),
                  message: "Rename the binding.",
                  node
                });
              }
            };
          },
          meta: {
            fixable: "code",
            schema: [],
            type: "suggestion"
          }
        }
      }
    });
    const messages = new Linter().verify("// untouched\nconst value = 1;\n", {
      files: ["**"],
      languageOptions: { parser },
      plugins: { test: plugin },
      rules: { "test/rename": "error" }
    }, { filename: "fast-path.ts" });

    expect(messages[0]?.fix).toMatchObject({ range: [19, 24], text: "renamed" });
    expect(parseCount).toBe(1);
  });
});
