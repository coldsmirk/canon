import type { RuleFunction } from "@eslint-react/kit";

/**
 * Enforce the JSX fragment shorthand: `<>...</>` over a named `<Fragment>...</Fragment>` that carries
 * no props. (`<React.Fragment>` is already banned by the React.* namespace restriction, so only the
 * named-import form is handled here.) A keyed or otherwise-propped `<Fragment key={...}>` is left
 * alone — the shorthand can't express props. Autofixable — it rewrites the open/close tags to `<>`/`</>`.
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
        ) {
          context.report({
            fix: fixer => [
              fixer.replaceTextRange(openingElement.range, "<>"),
              fixer.replaceTextRange(closingElement.range, "</>")
            ],
            message: "Use the `<>...</>` shorthand instead of `<Fragment>` when there are no props.",
            node
          });
        }
      }
    };
  };
}
