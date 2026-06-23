# @coldsmirk/tsconfig

Opinionated base TypeScript configs — strict, `bundler` module resolution, ESM-first.

Three variants, matched to the project shapes used here:

- **`@coldsmirk/tsconfig/base`** — framework-neutral, `bundler` module resolution. For bundler-driven projects (Vite, tsdown, …). No `lib: DOM`, no `jsx`.
- **`@coldsmirk/tsconfig/node`** — extends `base`, swaps to `nodenext` module resolution. For Node libraries emitted directly by `tsc` (no bundler), where `bundler` resolution would let invalid imports compile but break at runtime.
- **`@coldsmirk/tsconfig/react`** — extends `base`, adds `lib: ["ESNext", "DOM", "DOM.Iterable"]` and `jsx: "react-jsx"`.

## Install

```bash
pnpm add -D @coldsmirk/tsconfig typescript
```

## Usage

A bundler-driven project (Vite, tsdown, …) — `tsconfig.json`:

```jsonc
{
  "extends": "@coldsmirk/tsconfig/base",
  "compilerOptions": {
    "outDir": "dist",
    "noEmit": true // tsc type-checks; the bundler emits
  },
  "include": ["src"]
}
```

A Node library emitted by `tsc` directly (no bundler):

```jsonc
{
  "extends": "@coldsmirk/tsconfig/node",
  "compilerOptions": {
    "outDir": "dist",
    "declaration": true // /node already sets nodenext resolution
  },
  "include": ["src"]
}
```

A React project:

```jsonc
{
  "extends": "@coldsmirk/tsconfig/react",
  "compilerOptions": {
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

## What stays in your project

The base intentionally **does not** set anything path-, environment-, or build-target-specific — keep these local because they differ per repo:

- `outDir` / `rootDir` / `include` / `paths` / `baseUrl`
- `target` override (the base targets `esnext`)
- `customConditions` (e.g. `["source"]`), `types` (e.g. `["node", "vitest/globals"]`)
- `noEmit` vs emit settings, `composite`/`declaration` for project references

## License

MIT
