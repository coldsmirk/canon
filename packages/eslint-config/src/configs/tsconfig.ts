import type { ESLint, Linter } from "eslint";

import jsoncPlugin from "eslint-plugin-jsonc";
import * as jsoncParser from "jsonc-eslint-parser";

import { GLOB_TSCONFIG } from "../globs";

// `compilerOptions` key order, grouped by the compiler's own option categories (Projects,
// Language and Environment, Modules, …) rather than alphabetically — the grouping
// @antfu/eslint-config also uses, extended here to the FULL option set (upstream lags TS releases).
// The authoritative list is the compiler itself; diff against a new TypeScript release with:
//   node -e 'for (const d of require("typescript").optionDeclarations) console.log((d.category?.message ?? "-") + ": " + d.name)'
const compilerOptionsOrder = [
  // Projects
  "incremental",
  "composite",
  "tsBuildInfoFile",
  "disableSourceOfProjectReferenceRedirect",
  "disableSolutionSearching",
  "disableReferencedProjectLoad",
  // Language and Environment
  "target",
  "jsx",
  "jsxFactory",
  "jsxFragmentFactory",
  "jsxImportSource",
  "lib",
  "moduleDetection",
  "noLib",
  "reactNamespace",
  "useDefineForClassFields",
  "emitDecoratorMetadata",
  "experimentalDecorators",
  "libReplacement",
  // Modules
  "baseUrl",
  "rootDir",
  "rootDirs",
  "customConditions",
  "noUncheckedSideEffectImports",
  "module",
  "moduleResolution",
  "moduleSuffixes",
  "noResolve",
  "paths",
  "resolveJsonModule",
  "resolvePackageJsonExports",
  "resolvePackageJsonImports",
  "typeRoots",
  "types",
  "allowArbitraryExtensions",
  "allowImportingTsExtensions",
  "rewriteRelativeImportExtensions",
  "allowUmdGlobalAccess",
  // JavaScript Support
  "allowJs",
  "checkJs",
  "maxNodeModuleJsDepth",
  // Type Checking
  "strict",
  "strictBindCallApply",
  "strictBuiltinIteratorReturn",
  "strictFunctionTypes",
  "strictNullChecks",
  "strictPropertyInitialization",
  "allowUnreachableCode",
  "allowUnusedLabels",
  "alwaysStrict",
  "exactOptionalPropertyTypes",
  "noFallthroughCasesInSwitch",
  "noImplicitAny",
  "noImplicitOverride",
  "noImplicitReturns",
  "noImplicitThis",
  "noPropertyAccessFromIndexSignature",
  "noUncheckedIndexedAccess",
  "noUnusedLocals",
  "noUnusedParameters",
  "stableTypeOrdering",
  "useUnknownInCatchVariables",
  // Emit
  "declaration",
  "declarationDir",
  "declarationMap",
  "downlevelIteration",
  "emitBOM",
  "emitDeclarationOnly",
  "importHelpers",
  "inlineSourceMap",
  "inlineSources",
  "mapRoot",
  "newLine",
  "noEmit",
  "noEmitHelpers",
  "noEmitOnError",
  "outDir",
  "outFile",
  "preserveConstEnums",
  "removeComments",
  "sourceMap",
  "sourceRoot",
  "stripInternal",
  // Interop Constraints
  "allowSyntheticDefaultImports",
  "esModuleInterop",
  "forceConsistentCasingInFileNames",
  "isolatedDeclarations",
  "isolatedModules",
  "preserveSymlinks",
  "verbatimModuleSyntax",
  "erasableSyntaxOnly",
  // Completeness
  "skipDefaultLibCheck",
  "skipLibCheck",
  // Compiler Diagnostics
  "diagnostics",
  "explainFiles",
  "extendedDiagnostics",
  "generateCpuProfile",
  "generateTrace",
  "listEmittedFiles",
  "listFiles",
  "noCheck",
  "traceResolution",
  // Output Formatting
  "noErrorTruncation",
  "preserveWatchOutput",
  "pretty",
  // Watch and Build Modes
  "assumeChangesOnlyAffectDirectDependencies",
  // Editor Support
  "disableSizeLimit",
  "plugins",
  // Backwards Compatibility (deprecated/removed flags, kept so legacy tsconfigs still sort cleanly)
  "charset",
  "importsNotUsedAsValues",
  "keyofStringsOnly",
  "noImplicitUseStrict",
  "noStrictGenericChecks",
  "out",
  "preserveValueImports",
  "suppressExcessPropertyErrors",
  "suppressImplicitAnyIndexErrors",
  // Deprecation handling (uncategorized in the compiler)
  "ignoreDeprecations"
];

/**
 * Sort tsconfig keys. There is no dedicated tsconfig ESLint plugin; eslint-plugin-jsonc's
 * `sort-keys` is the established approach (also what antfu uses). Top-level keys follow a semantic
 * order (extends first, then compilerOptions, …); `compilerOptions` is grouped by the tsconfig schema
 * categories (see `compilerOptionsOrder`), matching `@antfu/eslint-config`.
 */
export function tsconfig(): Linter.Config[] {
  return [
    {
      name: "coldsmirk/tsconfig",
      files: GLOB_TSCONFIG,
      languageOptions: {
        parser: jsoncParser as unknown as Linter.Parser
      },
      plugins: {
        jsonc: jsoncPlugin as unknown as ESLint.Plugin
      },
      rules: {
        "jsonc/sort-keys": [
          "error",
          {
            pathPattern: "^$",
            order: ["extends", "compilerOptions", "references", "files", "include", "exclude"]
          },
          {
            pathPattern: "^compilerOptions$",
            order: compilerOptionsOrder
          }
        ]
      }
    }
  ];
}
