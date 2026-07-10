import type { RuleFunction } from "@eslint-react/kit";

// Derive the context/AST types from kit's own signature — this package deliberately has no direct
// dependency on @typescript-eslint/utils, and eslint's core types don't know JSX.
type RuleSourceCode = Parameters<RuleFunction>[0]["sourceCode"];

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

/**
 * Walk the scope chain from `node` and check that the `Fragment` binding in effect is a named
 * import of React's own `Fragment`. (`import { Fragment as F }` never reaches here because the tag
 * name must be `Fragment`; `import { X as Fragment }` resolves but is rejected — the imported name
 * must be `Fragment` too.) An unresolved `Fragment` (global, typo) is NOT treated as React's —
 * the rewrite must be provably safe.
 */
function isReactFragment(sourceCode: RuleSourceCode, node: Parameters<RuleSourceCode["getScope"]>[0]): boolean {
  for (let scope: ReturnType<RuleSourceCode["getScope"]> | null = sourceCode.getScope(node); scope; scope = scope.upper) {
    const variable = scope.variables.find(candidate => candidate.name === "Fragment");

    if (variable) {
      const valueDefinitions = variable.defs.filter(definition => isValueDefinition(definition));

      // TypeScript's type and value namespaces are separate: a local `type Fragment = ...` does not
      // shadow the imported React value used by JSX, so keep walking until a value binding appears.
      if (valueDefinitions.length === 0) {
        continue;
      }

      // Multiple value definitions are invalid or ambiguous. Autofix only the one provable shape.
      const [definition] = valueDefinitions;

      return definition !== undefined && valueDefinitions.length === 1 && isReactFragmentImport(definition);
    }
  }

  return false;
}

type ScopeDefinition = ReturnType<RuleSourceCode["getScope"]>["variables"][number]["defs"][number];

function isValueDefinition(definition: ScopeDefinition): boolean {
  const { node: specifier, parent } = definition;

  if (specifier.type === "ImportSpecifier" && parent?.type === "ImportDeclaration") {
    return parent.importKind !== "type" && specifier.importKind !== "type";
  }

  // @typescript-eslint exposes namespace membership explicitly; Espree's scope definitions do not,
  // and every non-import definition it can produce here is a value definition.
  return !("isVariableDefinition" in definition) || definition.isVariableDefinition;
}

function isReactFragmentImport(definition: ScopeDefinition): boolean {
  const { node: specifier, parent } = definition;

  if (specifier.type !== "ImportSpecifier" || parent?.type !== "ImportDeclaration") {
    return false;
  }

  const { imported } = specifier;
  const importedName = imported.type === "Identifier" ? imported.name : String(imported.value);

  return importedName === "Fragment" && parent.source.value === "react";
}
