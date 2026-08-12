# Frontend dependency modernization — 2026-08-12

## Scope and rollback point

- Baseline frontend commit: `82149ab73b317be3da3000e6713e3543bd8dc2fb`.
- Baseline E2E commit: `e9392aadab578096a6713a7071959dd0fa4e587f`.
- Local backup reference in both repositories:
  `backup/pre-eslint-runtime-modernization-2026-08-12`.
- Work was performed locally on `main`. No push, deployment, Render change,
  backend change, or snapshot update was performed.
- Bun remained at `1.3.14`; no lockfile from another package manager was
  introduced.

## Implemented updates

| Area | Previous | Result | Compatibility work |
|---|---:|---:|---|
| ESLint | 8.57.1, legacy config | 10.8.1, flat config | Added an enforceable regression gate and an explicit inherited suppression baseline. |
| TypeScript ESLint | 7.18.0 | 8.67.0 | Updated parser and plugin together. |
| React hooks lint | 4.6.2 | 7.1.1 | Enabled `rules-of-hooks` and `exhaustive-deps` without adopting React Compiler rules. |
| Tiptap | 3.29.2 | 3.30.0 | Updated the four direct Tiptap packages as one coherent family. |
| Three | 0.179.1 | 0.185.1 | Replaced deprecated `Clock` with `Timer`, connected it to document visibility, and disposed it on unmount. |
| Framer Motion | 11.18.2 | Motion 13.1.0 | Replaced the direct package with `motion` and changed the two production imports to `motion/react`. |
| jsPDF-AutoTable | 3.8.4 | 5.0.8 | Adopted the named `autoTable` import and the official `Table` type in all five generators. |

The exact ESLint support versions are `@eslint/js@10.0.1`,
`globals@17.11.0`, `@typescript-eslint/eslint-plugin@8.67.0`,
`@typescript-eslint/parser@8.67.0`, `eslint-plugin-react-hooks@7.1.1`, and
`eslint-plugin-react-refresh@0.5.4`.

## ESLint gate

- `bun run lint` now runs ESLint 10 with flat configuration and
  `--max-warnings 0`.
- `eslint-suppressions.json` records 275 inherited findings in 110 files. A
  newly introduced violation is not suppressed automatically and fails the
  command.
- `bun run lint:suppressions:prune` removes obsolete baseline entries after
  existing debt is corrected. The final prune completed without changing the
  file.
- The missing Storybook plugin was removed from the configuration because this
  repository uses Ladle, not Storybook.

## Characterization added

- The existing Tiptap and Three stories validate mounting, interaction, resize,
  unmount, and remount in light and dark modes.
- A deterministic weekly MPS carousel story now validates Motion navigation,
  selection, transitions, resize, and lifecycle behavior with a mocked API.
- A deterministic PDF story covers OCM, OCAF, ODP, MPS, and Dispensación. It
  mocks identity, logo, and production data, then verifies MIME
  `application/pdf`, the `%PDF-` header, a non-trivial byte length, and clean
  runtime diagnostics.

## Final validation

| Check | Result |
|---|---|
| `bun install --frozen-lockfile` | Pass; 1,084 installs / 1,079 packages, no changes. |
| `bun run chakra:typegen` | Pass; no tracked changes. |
| `bun run check:chakra-v3` | Pass; no known Chakra v2 APIs in `src`. |
| `bun run lint` | Pass with zero unsuppressed errors or warnings. |
| `bun run lint:suppressions:prune` | Pass; no stale suppressions. |
| `bun run vite build` | Pass with Vite 8.2.1; 4,169 modules. |
| `bunx ladle build` | Pass; 3,429 modules. |
| TypeScript normalized comparison | Same 92 inherited diagnostics and 82 unique signatures; zero added or removed signatures. |
| E2E `bun run typecheck` | Pass. |
| E2E `bun run test:launcher` | Pass, 6/6. |
| E2E `bun run test:visual:chakra` | Pass, 42/42; snapshots were not updated. |

The 42 browser checks comprise 24 historical Chakra visual comparisons, 16
React/runtime integration checks, and two five-generator PDF checks. Runtime
guards found no unexpected `console.error`, `pageerror`, framework warning,
failed request, or HTTP 5xx.

## Remaining dependency work

`bun outdated` now reports only `@xyflow/react` 12.11.2 → 12.11.3 and the
separate breaking TypeScript 5.9.3 → 7.0.2 migration.

`bun audit` still reports 18 known findings (7 high, 7 moderate, and 4 low), the
same total observed before these updates. They are reached through development
tooling or unrelated dependency families, principally Ladle's Vite 6 tree,
ExcelJS (`uuid` and `tmp`), Babel tooling, YAML loaders, `flatted`, and
`picomatch`. They were not hidden with overrides. Remediation should be handled
as a separate, dependency-path-specific task rather than with an unreviewed
`bun update --latest`.

## Local commits

Frontend:

- `1bd207c` — modernize the ESLint gate.
- `4859243` — update Tiptap to 3.30.0.
- `5e0c29c` — update Three and migrate to `Timer`.
- `a4ce626` — add Motion carousel characterization.
- `88d57ad` — migrate to Motion 13.
- `c312e3e` — add PDF generator characterization.
- `1255bb6` — update jsPDF-AutoTable to 5.0.8.

E2E:

- `231293c` — characterize the Motion carousel lifecycle.
- `552f17f` — validate all five PDF generators.
