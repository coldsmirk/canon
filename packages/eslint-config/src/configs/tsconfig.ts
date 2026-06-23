import type { ESLint, Linter } from "eslint";

import jsoncPlugin from "eslint-plugin-jsonc";
import * as jsoncParser from "jsonc-eslint-parser";

import { GLOB_TSCONFIG } from "../globs";

// `compilerOptions` key order, grouped by the official tsconfig schema categories (Projects,
// Language and Environment, Modules, …) rather than alphabetically — mirrors @antfu/eslint-config so
// the file reads the way the TypeScript docs are organized. Keep in sync as TS adds options.
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
  "allowUmdGlobalAccess",
  // JavaScript Support
  "allowJs",
  "checkJs",
  "maxNodeModuleJsDepth",
  // Type Checking
  "strict",
  "strictBindCallApply",
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
  "useUnknownInCatchVariables",
  // Emit
  "declaration",
  "declarationDir",
  "declarationMap",
  "downlevelIteration",
  "emitBOM",
  "emitDeclarationOnly",
  "importHelpers",
  "importsNotUsedAsValues",
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
  "preserveValueImports",
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
  "skipLibCheck"
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
