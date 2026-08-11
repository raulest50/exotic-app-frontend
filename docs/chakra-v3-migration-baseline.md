# Chakra UI v2 baseline

This file records the local baseline immediately before the controlled Chakra UI
v2 to v3 migration.

- Baseline commit: `90769ab1909b55f9365bec81119c65fa230c4e55`
- Runtime: Node `24.19.0`, Bun `1.3.14`
- React: `18.3.1`
- Chakra UI: `2.10.10`
- Vite: `8.2.1`
- React Router DOM: `7.18.2`

## Automated baseline

- `bun run vite build`: passes (2,907 modules transformed).
- `bunx ladle build`: passes after loading the application's real v2 theme.
- `bunx tsc --noEmit --project tsconfig.json --pretty false`: fails with 108
  inherited diagnostics. These diagnostics are not a migration gate by count;
  migration work must not introduce a new file/code/message combination.
- `bun run check:chakra-v3`: reports the known v2 surface without failing while
  the package script includes `--allow-v2`.
- `bun run check:chakra-v3 --strict`: is expected to fail until the migration is
  complete.

## Scope controls

- Work stays local on `main`; no push or deployment is part of this migration.
- `backup/pre-chakra-v3-2026-08-11` points to the baseline commit.
- React, React Router, Vite, `wx-react-gantt`, backend contracts, routes, and
  permissions are held constant.
- `framer-motion` remains installed because the application imports it directly.
- Chakra UI v2 and v3 will not coexist in the runtime bundle.

