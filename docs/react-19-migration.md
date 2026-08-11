# React 19 migration

## Scope

- Baseline frontend commit: `26cf8260e4d5b8180fa855a85893c0633c2ea97b`.
- Baseline E2E commit: `d2dd44da1b8fb8ba0907e4442a43f5915e5d70db`.
- Local backup reference in both repositories: `backup/pre-react-19-2026-08-11`.
- Target: exact `react@19.2.8`, `react-dom@19.2.8`,
  `@types/react@19.2.18`, and `@types/react-dom@19.2.4`.
- No push, deployment, Render change, React Compiler adoption, or unrelated
  dependency update is part of this migration.

## React 18 characterization

- Bun: `1.3.14`.
- Node.js: `24.19.0`.
- Runtime tree: one `react@18.3.1` and one `react-dom@18.3.1`.
- TypeScript baseline: 92 diagnostics, representing 82 unique normalized
  signatures when line and column positions are ignored.
- Normalized signature SHA-256:
  `6c9ec3382ff01d14743e21f862e8c710355db967b607a1ed03941c3bbc6b23fb`.
- The complete sorted signature inventory is stored in
  `docs/react-19-typescript-baseline.txt`.
- Baseline TypeScript codes: `TS18047`, `TS18048`, `TS2304`, `TS2305`,
  `TS2307`, `TS2322`, `TS2339`, `TS2345`, `TS2352`, `TS2554`, `TS6133`,
  `TS6196`, `TS7006`, and `TS7009`.
- The normalized baseline is compared by source file, TypeScript code, and
  message. React 19 may remove inherited diagnostics but must not introduce a
  new normalized signature.

The inherited diagnostics are concentrated in existing stories and unrelated
business modules. The only diagnostic in a file touched by the preceding
Cronograma removal is the inherited `TS2345` in `Home.tsx`; its failing line was
not modified by that removal.

## Known compatibility exception

`@ladle/react@5.1.1` supports React 19, but its development-only transitive
dependency `react-inspector@6.0.2` declares a peer range ending at React 18. No
removed React API or private React internal was found in the installed code.
The warning is accepted only if Ladle builds and all characterization stories
render and interact successfully. No dependency override will be added.

## Mechanical preparation

- `codemod@1.13.19 react/19/migration-recipe --dry-run` reported zero source
  transformations.
- `types-react-codemod@3.5.3 preset-19 --dry` proposed 23 changes and was not
  applied because its scope exceeded the required JSX namespace migration.
- `types-react-codemod@3.5.3 scoped-jsx --dry` identified exactly 21 files.
  Applying that transform added only local `JSX` type imports and preserved all
  existing `JSX.Element` contracts.
- The scoped JSX change was validated under React 18 before the runtime upgrade
  and stored in commit `932e894`.

## React 19 result

- The four target packages are pinned exactly, without `^` or `~`.
- `bun why react` and `bun why react-dom` resolve a single
  `react@19.2.8`/`react-dom@19.2.8` pair.
- The lockfile changes are limited to React, React DOM, their type packages,
  `scheduler@0.27.0`, and removal of the now-orphaned `@types/prop-types` entry.
  React and scheduler no longer reference `loose-envify`, which remains in the
  lockfile for unrelated consumers.
- The source audit found no removed React APIs, legacy roots, global JSX
  namespace usage, zero-argument `useRef`, problematic callback-ref returns,
  legacy context, string refs, or private React internals.
- No additional post-upgrade compatibility source correction was required.
  `main.tsx`, StrictMode, provider order, routes, permissions, lazy loading, and
  public component contracts remain unchanged.
- The dependency upgrade was stored in commit `331a030`.

## Validation record

Historical Chakra snapshot names remain unchanged and snapshots were not
regenerated to accept a React migration difference.

| Check | React 18 baseline | React 19 result |
|---|---|---|
| Frozen Bun install | Pass; 1079 packages, no changes | Pass; 1078 packages, no changes |
| Chakra v3 typegen/static check | Pass; no tracked changes | Pass; no tracked changes |
| Vite production build | Pass; 4121 modules | Pass; 4122 modules |
| Ladle build | Pass; 3327 modules | Pass; 3329 modules |
| TypeScript normalized delta | 92 diagnostics / 82 signatures | Pass; same 92/82, zero new or removed signatures, same SHA-256 |
| E2E project typecheck | Pass | Pass |
| Visual launcher tests | Pass; 6/6 | Pass; 6/6 |
| Historical visual comparisons | Pass; 24/24, no updates | Pass; 24/24, no updates |
| React integration characterization | Pass; 14/14, light/dark | Pass; 14/14, light/dark |
| Authenticated local platform E2E | Blocked: `.env.e2e.local` absent | Blocked: `.env.e2e.local` absent |

The React 19 visual/characterization Playwright suite completed 38/38 tests.
Runtime guards reported no unexpected `console.error`, `pageerror`,
React/Chakra warning, failed request, or HTTP 5xx. The intentional
`window.reportError` characterization was observed as `pageerror` and isolated
from the runtime guard as designed.

## Acceptance boundary

The isolated build, type, visual, mounting, interaction, resize, and unmount
gates are green. Authenticated platform acceptance remains pending because no
unversioned `.env.e2e.local` with the required roles is available. Consequently,
Home, protected routes, BI/Suspense, permissions, and Transacciones de Almacén
were not asserted against a live backend in this checkpoint. The mutating OCM
test was not run. No push, deployment, Render change, or snapshot update was
performed.
