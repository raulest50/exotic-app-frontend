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

## Validation record

This section is completed at each green checkpoint. Historical Chakra snapshot
names remain unchanged and snapshots are never regenerated to accept a React
migration difference.

| Check | React 18 baseline | React 19 result |
|---|---|---|
| Frozen Bun install | Pass; 1079 packages, no changes | Pending |
| Chakra v3 typegen/static check | Pass; no tracked changes | Pending |
| Vite production build | Pass; 4121 modules | Pending |
| Ladle build | Pass; 3327 modules | Pending |
| TypeScript normalized delta | 92 diagnostics / 82 signatures | Pending |
| E2E project typecheck | Pass | Pending |
| Visual launcher tests | Pass; 6/6 | Pending |
| Historical visual comparisons | Pass; 24/24, no updates | Pending |
| React integration characterization | Pass; 14/14, light/dark | Pending |
| Authenticated local platform E2E | Blocked: `.env.e2e.local` absent | Pending |
