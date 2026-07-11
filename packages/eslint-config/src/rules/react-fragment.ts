import type { RuleFunction } from "@eslint-react/kit";

// Derive the context/AST types from kit's own signature — this package deliberately has no direct
// dependency on @typescript-eslint/utils, and eslint's core types don't know JSX.
export type RuleSourceCode = Parameters<RuleFunction>[0]["sourceCode"];

type ScopeDefinition = ReturnType<RuleSourceCode["getScope"]>["variables"][number]["defs"][number];

/**
 * Walk the scope chain from `node` and check that the `Fragment` binding in effect is a named
 * import of React's own `Fragment`. (`import { Fragment as F }` never reaches here because the tag
 * name must be `Fragment`; `import { X as Fragment }` resolves but is rejected — the imported name
 * must be `Fragment` too.) An unresolved `Fragment` (global, typo) is NOT treated as React's —
 * the rewrite must be provably safe.
 */
export function isReactFragment(sourceCode: RuleSourceCode, node: Parameters<RuleSourceCode["getScope"]>[0]): boolean {
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
