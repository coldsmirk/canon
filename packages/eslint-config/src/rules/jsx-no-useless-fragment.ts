import type { RuleFunction } from "@eslint-react/kit";

import type { RuleSourceCode } from "./react-fragment";

import { collapseMultilineText, getChildren, isHostElement, isWhitespaceText } from "@eslint-react/jsx";

import { isReactFragment } from "./react-fragment";

// TSESTree's JSXElement | JSXFragment, derived from the helper's signature (see react-fragment.ts
// for why this package derives its AST types instead of depending on @typescript-eslint/utils).
type FragmentNode = Parameters<typeof getChildren>[0];

/**
 * Disallow useless fragments — the import-aware replacement for the disabled
 * `@eslint-react/jsx-no-useless-fragment`, which judges a named `<Fragment>` by NAME alone and so
 * unwraps local/third-party `Fragment` components that render real output. A fragment is useless
 * when it sits directly inside a host (DOM) element — the element already groups its children — or
 * wraps fewer than two meaningful children. Two shapes stay legal (the upstream `allowExpressions`
 * behaviour this config always ran with): a lone `{expression}` child, which the fragment coerces
 * into a renderable node, and a lone text child outside JSX. A named `<Fragment>` is only judged
 * when it provably resolves to `import { Fragment } from "react"`, and any prop (`key`) exempts it.
 * Autofixable where unwrapping provably preserves behaviour (see `isSafeToUnwrap`); the fix is
 * withheld when a comment sits inside either tag, so no comment is ever destroyed.
 *
 * Authored as an `@eslint-react/kit` rule factory; kit kebab-cases this name into `jsx-no-useless-fragment`.
 */
export function jsxNoUselessFragment(): RuleFunction {
  // eslint-disable-next-line unicorn/consistent-function-scoping -- kit requires the RuleFunction be returned from this factory
  return context => {
    function check(node: FragmentNode): void {
      const insideHost = isHostElement(node.parent);

      if (!insideHost && !isContentUseless(node)) {
        return;
      }

      const fixable = isSafeToUnwrap(node) && hasNoTagComments(context.sourceCode, node);

      context.report({
        fix: fixable
          ? fixer => fixer.replaceTextRange(node.range, unwrappedChildrenText(context.sourceCode, node))
          : undefined,
        message: insideHost
          ? "A fragment directly inside a host element is useless — the element already groups its children."
          : "A fragment wrapping less than two children is useless.",
        node
      });
    }

    return {
      JSXElement(node) {
        const { openingElement } = node;
        const { name } = openingElement;

        // Only a propless, provably-React `<Fragment>` is a pure grouping node; `<Fragment key={…}>`
        // (or any other prop, however invalid) must keep its element form.
        if (
          name.type === "JSXIdentifier"
          && name.name === "Fragment"
          && openingElement.attributes.length === 0
          && isReactFragment(context.sourceCode, node)
        ) {
          check(node);
        }
      },
      JSXFragment(node) {
        check(node);
      }
    };
  };
}

// A fragment's content is useless when unwrapping loses nothing: it is empty, or at most one child
// survives JSX whitespace/empty-expression cleanup. The carve-outs match the upstream defaults this
// config ran with (`allowExpressions: true`): a lone `{expression}` child, and a lone text child
// outside JSX (e.g. `<>text</>` deliberately producing an element rather than a string).
function isContentUseless(node: FragmentNode): boolean {
  if (node.children.length === 0) {
    return true;
  }

  const insideJsx = node.parent.type === "JSXElement" || node.parent.type === "JSXFragment";

  if (!insideJsx && node.children.length === 1 && node.children[0]?.type === "JSXText") {
    return false;
  }

  const meaningful = getChildren(node);

  if (meaningful.length === 0) {
    return true;
  }

  return meaningful.length === 1 && meaningful[0]?.type !== "JSXExpressionContainer";
}

// Unwrapping is only provably behaviour-preserving in two spots. Inside JSX, under a HOST element
// parent — a component parent would see a different `props.children` shape. Outside JSX, when every
// child survives as source text: an `{expression}` child or bare text is not valid JS outside a JSX
// context, so those fragments are reported without a fix.
function isSafeToUnwrap(node: FragmentNode): boolean {
  if (node.parent.type === "JSXElement" || node.parent.type === "JSXFragment") {
    return isHostElement(node.parent);
  }

  if (node.children.length === 0) {
    return false;
  }

  return node.children.every(child => !(child.type === "JSXExpressionContainer" || (child.type === "JSXText" && !isWhitespaceText(child))));
}

// A comment inside either tag (`<Fragment /* why */>`) would be destroyed by the rewrite; comments
// BETWEEN the tags are `{/* … */}` children and survive verbatim (see unwrappedChildrenText).
function hasNoTagComments(sourceCode: RuleSourceCode, node: FragmentNode): boolean {
  const opening = node.type === "JSXFragment" ? node.openingFragment : node.openingElement;
  const closing = node.type === "JSXFragment" ? node.closingFragment : node.closingElement;

  return sourceCode.getCommentsInside(opening).length === 0
    && (closing === null || sourceCode.getCommentsInside(closing).length === 0);
}

// Mirror Babel's JSX text semantics when splicing the children back out: multiline padding text
// collapses away, inline text keeps its single-line form, and every other child is copied verbatim.
function unwrappedChildrenText(sourceCode: RuleSourceCode, node: FragmentNode): string {
  let text = "";

  for (const child of node.children) {
    text += child.type === "JSXText" ? (collapseMultilineText(child.value) ?? "") : sourceCode.getText(child);
  }

  return text;
}
