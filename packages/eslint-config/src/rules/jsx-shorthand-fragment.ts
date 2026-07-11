import type { RuleFunction } from "@eslint-react/kit";

import { isReactFragment } from "./react-fragment";

/**
 * Enforce the JSX fragment shorthand: `<>...</>` over a named `<Fragment>...</Fragment>` that carries
 * no props. (`<React.Fragment>` is already banned by the React.* namespace restriction, so only the
 * named-import form is handled here.) The tag must RESOLVE to `import { Fragment } from "react"` —
 * a local component or a third-party `Fragment` renders real output, so rewriting it to `<>` would
 * change behavior (and unused-imports would then delete its import). A keyed or otherwise-propped
 * `<Fragment key={...}>` is left alone — the shorthand can't express props. Autofixable — it rewrites
 * the open/close tags to `<>`/`</>`; the fix is withheld when a comment sits inside either tag, so
 * no comment is ever destroyed.
 *
 * Authored as an `@eslint-react/kit` rule factory; kit kebab-cases this name into `jsx-shorthand-fragment`.
 */
export function jsxShorthandFragment(): RuleFunction {
  // eslint-disable-next-line unicorn/consistent-function-scoping -- kit requires the RuleFunction be returned from this factory
  return context => {
    return {
      JSXElement(node) {
        const { closingElement, openingElement } = node;
        const { name } = openingElement;

        if (
          name.type === "JSXIdentifier"
          && name.name === "Fragment"
          && openingElement.attributes.length === 0
          && closingElement
          && isReactFragment(context.sourceCode, node)
        ) {
          // A comment inside either tag (`<Fragment /* why */>`) would be destroyed by the rewrite.
          const fixable = context.sourceCode.getCommentsInside(openingElement).length === 0
            && context.sourceCode.getCommentsInside(closingElement).length === 0;

          context.report({
            fix: fixable
              ? fixer => [
                fixer.replaceTextRange(openingElement.range, "<>"),
                fixer.replaceTextRange(closingElement.range, "</>")
              ]
              : undefined,
            message: "Use the `<>...</>` shorthand instead of `<Fragment>` when there are no props.",
            node
          });
        }
      }
    };
  };
}
