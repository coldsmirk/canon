import type { RuleFunction } from "@eslint-react/kit";

/**
 * Enforce the boolean-attribute shorthand: `<Comp disabled />` over `<Comp disabled={true} />`.
 * The two are semantically identical, so the explicit `={true}` is noise. Autofixable — it strips
 * the redundant `={true}`, leaving the bare attribute name; the fix is withheld when a comment
 * sits inside the attribute, so no comment is ever destroyed.
 *
 * Authored as an `@eslint-react/kit` rule factory: kit derives the rule id by kebab-casing this
 * function name (→ `jsx-shorthand-boolean`) and passes the React semantic `toolkit` as a second
 * argument. This rule is pure JSX-syntax, so it only needs `context`.
 */
export function jsxShorthandBoolean(): RuleFunction {
  // eslint-disable-next-line unicorn/consistent-function-scoping -- kit requires the RuleFunction be returned from this factory
  return context => {
    return {
      JSXAttribute(node) {
        const { value } = node;

        if (
          value?.type === "JSXExpressionContainer"
          && value.expression.type === "Literal"
          && value.expression.value === true
        ) {
          // The fix deletes everything from the attribute name to the container's end — a comment
          // in that range would be deleted with it, so report without a fix instead.
          const fixable = context.sourceCode.getCommentsInside(node).length === 0;

          context.report({
            fix: fixable ? fixer => fixer.removeRange([node.name.range[1], value.range[1]]) : undefined,
            message: "Use the shorthand boolean attribute instead of `={true}`.",
            node
          });
        }
      }
    };
  };
}
