# Dark Mode Color Migration Plan

Last updated: 2026-06-05

## Objective

Migrate the frontend dark-mode color configuration gradually, one visible module or route at a time. The migration is strictly visual. It must not change business logic, API calls, payloads, authorization rules, validation rules, state transitions, route behavior, calculations, schemas, PDF/Excel output, or render conditions.

The light-mode appearance is the compatibility baseline. Any migrated color must preserve the current light value exactly through a semantic token `default` value or a `useColorModeValue(light, dark)` light argument.

## Non-Negotiable Constraints

- Do not alter business logic, handlers, effects, reducers, access rules, API clients, payload mappers, schemas, calculations, or validations.
- Do not change light-mode colors intentionally. The `default` side of every token must match the previous literal color.
- Do not mix a dark-mode migration with unrelated refactors, renames, formatting sweeps, dependency updates, route changes, or generated output.
- Respect existing local changes. If a module has unrelated dirty files, work around them and avoid reverting or normalizing them.
- Skip `PDF_Generator`, Excel generator files, pure `types`, schemas, service/API files, and `.stories` unless a later prompt explicitly asks for them.
- `Home` is the visual reference and should only be audited unless a regression appears.

## Chakra UI V2 Approach

Use Chakra UI v2 semantic tokens as the default mechanism for reusable color roles. Use `useColorModeValue(light, dark)` only when the color is selected dynamically in component code and cannot be represented cleanly by a single token.

The theme lives in `src/theme.ts` and is consumed by `src/main.tsx`. The original color-mode configuration remains:

- `initialColorMode: "light"`
- `useSystemColorMode: false`

## Semantic Tokens

| Token | Light value | Dark value | Intended use |
| --- | --- | --- | --- |
| `app.surface` | `white` | `gray.800` | Main cards, panels, table containers |
| `app.surfaceSubtle` | `gray.50` | `gray.700` | Secondary panels, grouped sections |
| `app.surfaceMuted` | `gray.100` | `whiteAlpha.200` | Stronger muted surfaces |
| `app.tableHeader` | `gray.50` | `gray.700` | Standard table headers |
| `app.tableHeaderSticky` | `white` | `gray.800` | Sticky table headers that were white |
| `app.border` | `gray.200` | `gray.600` | Neutral borders |
| `app.textMuted` | `gray.600` | `gray.400` | Muted explanatory text |
| `app.textSubtle` | `gray.500` | `gray.400` | Secondary labels and empty states |
| `app.inputFilled` | `gray.200` | `gray.700` | Shared filled input style |
| `app.inputReadonly` | `gray.50` | `whiteAlpha.100` | Read-only inputs and disabled-looking fields |
| `app.inputReadonlyStrong` | `gray.100` | `whiteAlpha.200` | Stronger read-only state |
| `app.rowHover` | `gray.50` | `whiteAlpha.100` | Standard row hover |
| `app.rowHoverStrong` | `gray.100` | `whiteAlpha.200` | Stronger row hover |
| `app.rowSelectedBlue` | `blue.100` | `blue.800` | Selected blue rows |
| `app.rowActiveBlue` | `blue.50` | `blue.900` | Active blue rows and expanded panels |
| `app.rowSelectedTeal` | `teal.50` | `teal.900` | Selected teal rows |
| `app.rowSelectedGreen` | `green.50` | `green.900` | Selected/positive green rows |
| `app.rowMasterGreen` | `green.200` | `green.800` | Existing master-user green rows |
| `app.rowWarningOrange` | `orange.50` | `orange.900` | Warning rows |
| `app.rowSelectedPurple` | `purple.100` | `purple.800` | Selected purple rows/cards |
| `app.stepperTeal` | `teal.50` | `teal.900` | Teal wizard steppers |
| `app.stepperBlue` | `blue.50` | `blue.900` | Blue wizard steppers and execution panels |
| `app.tabSelected` | `blue.200` | `blue.800` | Shared tab active/selected background |
| `app.cardItemHover` | `teal.200` | `teal.700` | Legacy shared card item hover |
| `app.cardItemBorderBlue` | `blue.200` | `blue.600` | Legacy shared blue card item border |
| `app.cardItemBorderGreen` | `green.200` | `green.600` | Legacy shared green card item border |

## Migration Workflow Per Prompt

1. Select exactly one visible module or route from the progress table.
2. Search only within that module and its direct visual child components for:
   - `bg="white"`, `bg="gray.50"`, `bg="gray.100"`
   - `backgroundColor`
   - `Thead bg`
   - `_hover`, `_selected`, `_expanded`, `_focus`
   - `borderColor="gray.200"`
   - `color="gray.500"`, `color="gray.600"`, `color="gray.700"`
3. Replace light-only values with semantic tokens when the light value matches the token.
4. Use `useColorModeValue` for dynamic conditional expressions such as selected rows with multiple possible colors.
5. Preserve the light color exactly in every replacement.
6. Run `npm run build`.
7. Check the route in light and dark mode when feasible.
8. Update this document with migrated files, observations, and status.

## Progress

| Order | Module or route | Status | Notes |
| --- | --- | --- | --- |
| 1 | Base theme, tokens, shared styles | Migrated | `src/theme.ts`, `src/main.tsx`, and `src/styles/styles_general.tsx` updated. Build verification pending. |
| 2 | `Usuarios` | ✅ Migrado | User management, access information, permissions editor, and notifications colors migrated. Build and browser verification pending by user. |
| 3 | `Produccion` | Pendiente | Respect current local renames under `ProgProdMensualTab`, `ProgProdSemanalTab`, and `ConfParamsCategoria`. |
| 4 | `Stock` | ✅ Migrado | Consolidated inventory, Kardex text, warehouse transaction history, and detail dialog colors migrated. Build and browser verification pending by user. |
| 5 | `OperacionesCriticasBD` | ✅ Migrado | Mass loads, forced deletion, import, execution panels, steppers, selectors, and study/result muted text migrated. Build and browser verification pending by user. |
| 6 | `TransaccionesAlmacen` | ✅ Migrado | OCM/terminados intake, dispensación, ajustes, averías, historial, tables, dialogs, hovers, and selected rows migrated. Build and browser verification pending by user. |
| 7 | `Productos` | ✅ Migrado | Basic product detail, semiterminado/terminado details, packaging/insumo cards, process designer surfaces, and wizard steppers migrated. Build and browser verification pending by user. |
| 8 | `Compras` | ✅ Migrado | Purchase history, order list, supplier/material/order pickers, provider card, filter helper text, and legend borders migrated. Build and browser verification pending by user. |
| 9 | `Proveedores` | ✅ Migrado | Supplier search list and detail surfaces migrated. Build and browser verification pending by user. |
| 10 | `ActivosFijos` | ✅ Migrado | Incorporation stepper, type selection, OC-AF search, asset groups, depreciation, upload, and review surfaces migrated. Build and browser verification pending by user. |
| 11 | `GestionAreasOperativas` and `AreaOperativaPanel` | ✅ Migrado | Operational-area management, leader panel, detail drawer, category picker, and shared tracking board visuals migrated. Build and browser verification pending by user. |
| 12 | `Bintelligence` | ✅ Migrado | BI panels, daily reports menu, material selector, help modals, drawers, and empty/loading text migrated. Build and browser verification pending by user. |
| 13 | `Personal` | ✅ Migrado | Audited; no source changes required because route uses Chakra defaults and shared styles already migrated. Build and browser verification pending by user. |
| 14 | `Organigrama` | ✅ Migrado | Sidebar, tab states, organization nodes, cargo dialog, and mission/vision secondary text migrated. Build and browser verification pending by user. |
| 15 | `Contabilidad` | ✅ Migrado | Account catalog hover and account-detail summary panel migrated. Build and browser verification pending by user. |
| 16 | `Cronograma` | Pendiente | Includes Gantt/demo views. |
| 17 | `AdministracionAlertas` | Pendiente | Alert administration route. |
| 18 | `MasterDirectives` | ✅ Migrado | Directive helper text and explanatory warning contrast migrated. Build and browser verification pending by user. |
| 19 | `LoginPage` | ✅ Migrado | Login panel loading text and login background/panel dark-mode colors migrated. Build and browser verification pending by user. |
| 20 | `Ventas` | Pendiente | Currently hidden in routing, but still migrated for completeness. |
| 21 | `Clientes` | Pendiente | Currently hidden in routing, but still migrated for completeness. |
| 22 | `PagosProveedores` | Pendiente | Currently hidden in routing, but still migrated for completeness. |

## Acceptance Template For Each Module

Use this template when closing a module migration:

```md
### Module: <module>

- Status: Migrated | Verified
- Files changed:
  - `<path>`
- Light-mode compatibility:
  - Preserved previous light values: yes/no
- Dark-mode checks:
  - Panels/cards corrected: yes/no
  - Tables and sticky headers corrected: yes/no
  - Read-only inputs corrected: yes/no
  - Row hover/selected states corrected: yes/no
  - Muted text contrast reviewed: yes/no
- Verification:
  - `npm run build`: pass/fail/not run
  - Browser route check: pass/fail/not run
- Notes:
  - <brief notes or documented exceptions>
```

## Current Implementation Notes

- The base migration has introduced the semantic token vocabulary but has not migrated route-specific page files.
- Shared tabs using `my_style_tab` and shared inputs using `input_style` now resolve through tokens, preserving light-mode values.
- `Usuarios`, `Stock`, `OperacionesCriticasBD`, `TransaccionesAlmacen`, `Productos`, `Compras`, `Proveedores`, `ActivosFijos`, `GestionAreasOperativas`, `AreaOperativaPanel`, `Bintelligence`, `Personal`, `Organigrama`, `Contabilidad`, `MasterDirectives`, and `LoginPage` have been migrated or audited at the source level. Build and browser verification remain pending because the user will run them personally.
- Future prompts can continue with `Produccion` or choose a lower-conflict module if the current `Produccion` renames are still active.

## Module Migration Log

### Module: `Usuarios`

- Status: ✅ Migrado
- Files changed:
  - `src/pages/Usuarios/InfoNiveles.tsx`
  - `src/pages/Usuarios/GestionUsuarios/UserViewer.tsx`
  - `src/pages/Usuarios/GestionUsuarios/UserAccesosEditor.tsx`
  - `src/pages/Usuarios/GestionNotificaciones/GestionNotificacionesTab.tsx`
- Light-mode compatibility:
  - Preserved previous light values through semantic token defaults or `useColorModeValue` light arguments.
- Dark-mode checks:
  - Panels/cards corrected: yes
  - Tables and headers corrected: yes
  - Read-only inputs corrected: not applicable in changed files
  - Row hover/selected states corrected: yes
  - Muted text contrast reviewed: yes
- Verification:
  - `npm run build`: pending by user
  - Browser route check: pending by user
- Notes:
  - Changes are limited to Chakra color props and color-mode hooks.

### Module: `Stock`

- Status: ✅ Migrado
- Files changed:
  - `src/pages/Stock/InventarioConsolidado/ListaProductos.tsx`
  - `src/pages/Stock/Kardex/KardexTab.tsx`
  - `src/pages/Stock/HistorialTransaccionesAlamacen/FiltroTranAlmacenSearch.tsx`
  - `src/pages/Stock/HistorialTransaccionesAlamacen/HistorialTransaccionesAlmacenTab.tsx`
  - `src/pages/Stock/HistorialTransaccionesAlamacen/DetalleTransaccionDialog.tsx`
  - `src/pages/Stock/HistorialTransaccionesAlamacen/TablaTranAlmacen.tsx`
- Light-mode compatibility:
  - Preserved previous light values through semantic token defaults or `useColorModeValue` light arguments.
- Dark-mode checks:
  - Panels/cards corrected: yes
  - Tables and sticky headers corrected: yes
  - Read-only inputs corrected: not applicable in changed files
  - Row hover/selected states corrected: not applicable in changed files
  - Muted text contrast reviewed: yes
- Verification:
  - `npm run build`: pending by user
  - Browser route check: pending by user
- Notes:
  - `MovimientosExcelModal` and export logic were not touched.

### Module: `OperacionesCriticasBD`

- Status: ✅ Migrado
- Files changed:
  - `src/pages/OperacionesCriticasBD/CargaMasiva*/**/*.tsx` visual tabs and execution steps
  - `src/pages/OperacionesCriticasBD/EliminacionForzada/**/*.tsx` selectors, pickers, study results, and purge execution/result views
- Light-mode compatibility:
  - Preserved previous light values through semantic token defaults or `useColorModeValue` light arguments.
- Dark-mode checks:
  - Panels/cards corrected: yes
  - Tables and headers corrected: not applicable for targeted literal headers; default table headers were left unchanged
  - Read-only inputs corrected: not applicable in changed files
  - Row hover/selected states corrected: yes
  - Muted text contrast reviewed: yes
- Verification:
  - Targeted literal search: pass
  - `git diff --check`: pass
  - `npm run build`: pending by user; sandbox blocked and escalated approval was rejected
  - Browser route check: pending by user
- Notes:
  - Changes are limited to Chakra color props and color-mode hooks.
  - API calls, payloads, handlers, execution flow, validation, and destructive-operation safeguards were not modified.

### Module: `TransaccionesAlmacen`

- Status: ✅ Migrado
- Files changed:
  - `src/pages/TransaccionesAlmacen/AsistenteIngresoOCM/**/*.tsx`
  - `src/pages/TransaccionesAlmacen/AsistenteIngresoTerminados/**/*.tsx`
  - `src/pages/TransaccionesAlmacen/AsistenteDispensacion/**/*.tsx`
  - `src/pages/TransaccionesAlmacen/AjustesInventario/**/*.tsx`
  - `src/pages/TransaccionesAlmacen/GestionAverias/**/*.tsx`
  - `src/pages/TransaccionesAlmacen/HistorialDispensaciones/**/*.tsx`
  - `src/pages/TransaccionesAlmacen/components/MateriaPrimaPicker.tsx`
- Light-mode compatibility:
  - Preserved previous light values through semantic token defaults or `useColorModeValue` light arguments.
- Dark-mode checks:
  - Panels/cards corrected: yes
  - Tables and sticky headers corrected: yes
  - Read-only inputs corrected: not applicable in changed files
  - Row hover/selected states corrected: yes
  - Muted text contrast reviewed: yes
- Verification:
  - Targeted literal search: pass
  - `git diff --check`: pass
  - `npm run build`: pending by user; sandbox blocked and escalated approval was rejected
  - Browser route check: pending by user
- Notes:
  - Changes are limited to Chakra color props and color-mode hooks.
  - `DispensacionPDF_Generator`, API helpers, hooks, mappers, types, and service files were not modified.

### Module: `Productos`

- Status: ✅ Migrado
- Files changed:
  - `src/pages/Productos/Basic/componentes/DetalleProducto.tsx`
  - `src/pages/Productos/DefSemiTer/**` visual detail, packaging, wizard, and confirmation components
  - `src/pages/Productos/DefProcesses/CreadorProcesos/**` visual process designer surfaces
- Light-mode compatibility:
  - Preserved previous light values through semantic token defaults.
- Dark-mode checks:
  - Panels/cards corrected: yes
  - Tables and headers corrected: yes
  - Read-only inputs corrected: not applicable in changed files
  - Row hover/selected states corrected: not applicable in changed files
  - Muted text contrast reviewed: yes
- Verification:
  - Targeted literal search: pass
  - `git diff --check`: pass
  - `npm run build`: pending by user
  - Browser route check: pending by user
- Notes:
  - Changes are limited to Chakra color props.
  - Hovers that only changed shadow/transform and node glow shadows were intentionally left unchanged.
  - Types, mappers, schemas, services, and `.stories` were not modified.

### Module: `Compras`

- Status: ✅ Migrado
- Files changed:
  - `src/pages/Compras/HistorialCompras.tsx`
  - `src/pages/Compras/components/ListaOrdenesCompra.tsx`
  - `src/pages/Compras/components/*Picker.tsx` visual picker rows
  - `src/pages/Compras/components/ProveedorCard.tsx`
  - `src/pages/Compras/components/ProveedorFilterOCM.tsx`
  - `src/pages/Compras/components/ColorLegendModal.tsx`
- Light-mode compatibility:
  - Preserved previous light values through semantic token defaults.
- Dark-mode checks:
  - Panels/cards corrected: yes
  - Tables and headers corrected: yes
  - Read-only inputs corrected: not applicable in changed files
  - Row hover/selected states corrected: yes
  - Muted text contrast reviewed: yes
- Verification:
  - Targeted literal search: pass
  - `git diff --check`: pass
  - `npm run build`: pending by user
  - Browser route check: pending by user
- Notes:
  - Changes are limited to Chakra color props.
  - `OCM_PDF_Generator.tsx`, `ExcelOCGenerator.tsx`, types, and service-like files were not modified.

### Module: `Proveedores`

- Status: ✅ Migrado
- Files changed:
  - `src/pages/Proveedores/consultar/DetalleProveedor.tsx`
  - `src/pages/Proveedores/consultar/panel_busqueda_comp/ListaSearchProveedores.tsx`
- Light-mode compatibility:
  - Preserved previous light values through semantic token defaults.
- Dark-mode checks:
  - Panels/cards corrected: yes
  - Tables and headers corrected: yes
  - Read-only inputs corrected: not applicable in changed files
  - Row hover/selected states corrected: yes
  - Muted text contrast reviewed: yes
- Verification:
  - Targeted literal search: pass
  - `git diff --check`: pass
  - `npm run build`: pending by user
  - Browser route check: pending by user
- Notes:
  - Changes are limited to Chakra color props.
  - Supplier update logic, permissions, validation, file upload handling, and API calls were not modified.

### Module: `ActivosFijos`

- Status: ✅ Migrado
- Files changed:
  - `src/pages/ActivosFijos/Incorporacion/IncorporacionActivosFijos.tsx`
  - `src/pages/ActivosFijos/Incorporacion/step_zero/TipoIngresoSelection.tsx`
  - `src/pages/ActivosFijos/Incorporacion/step_zero/PanelBusquedaOCFA.tsx`
  - `src/pages/ActivosFijos/Incorporacion/step_one/ActivosFijosStep1Form.tsx`
  - `src/pages/ActivosFijos/Incorporacion/step_one/ActivoGroup/ActivoGroup.tsx`
  - `src/pages/ActivosFijos/Incorporacion/step_one/MetodoDepreciacion/MetodoDepreciacion.tsx`
  - `src/pages/ActivosFijos/Incorporacion/step_two/ActivosFijosStep2UploadInvoice.tsx`
  - `src/pages/ActivosFijos/Incorporacion/step_three/ActivosFijosStep3ReviewSubmit.tsx`
- Light-mode compatibility:
  - Preserved previous light values through semantic token defaults or `useColorModeValue` light arguments.
- Dark-mode checks:
  - Panels/cards corrected: yes
  - Tables and headers corrected: not applicable in changed files
  - Read-only inputs corrected: yes
  - Row hover/selected states corrected: yes
  - Muted text contrast reviewed: yes
- Verification:
  - Targeted literal search: pass
  - `git diff --check`: pass
  - `npm run build`: pending by user
  - Browser route check: pending by user
- Notes:
  - Changes are limited to Chakra color props and color-mode hooks.
  - `.stories.tsx`, `types.tsx`, payload sanitization, incorporation logic, file handling, validation, and API calls were not modified.

### Module: `Bintelligence`

- Status: ✅ Migrado
- Files changed:
  - `src/pages/Bintelligence/AprovisionamientoTab/AprovisionamientoTab.tsx`
  - `src/pages/Bintelligence/AprovisionamientoTab/LeadTimeDetailDrawer.tsx`
  - `src/pages/Bintelligence/AprovisionamientoTab/LeadTimeDetailHelpModal.tsx`
  - `src/pages/Bintelligence/AprovisionamientoTab/LeadTimesRankingHelpModal.tsx`
  - `src/pages/Bintelligence/AprovisionamientoTab/LeadTimesView.tsx`
  - `src/pages/Bintelligence/AprovisionamientoTab/MaterialSelectorModal.tsx`
  - `src/pages/Bintelligence/AprovisionamientoTab/ReorderPointView.tsx`
  - `src/pages/Bintelligence/InformesDiariosTab/InformesDiariosTab.tsx`
  - `src/pages/Bintelligence/PersonalBiTab/HorasExtraBiPanel.tsx`
- Light-mode compatibility:
  - Preserved previous light values through semantic token defaults or `useColorModeValue` light arguments.
- Dark-mode checks:
  - Panels/cards corrected: yes
  - Tables and headers corrected: not applicable in changed files
  - Read-only inputs corrected: not applicable in changed files
  - Row hover/selected states corrected: yes
  - Muted text contrast reviewed: yes
- Verification:
  - Targeted literal search: pass
  - `git diff --check`: pass
  - `npm run build`: pending by user
  - Browser route check: pending by user
- Notes:
  - Changes are limited to Chakra color props and color-mode hooks.
  - BI data fetching, calculations, filters, payloads, utilities, and API calls were not modified.

### Module: `Personal`

- Status: ✅ Migrado
- Files changed:
  - No source changes required.
- Light-mode compatibility:
  - Preserved previous light values; no route-specific literal replacements were needed.
- Dark-mode checks:
  - Panels/cards corrected: not applicable
  - Tables and headers corrected: covered by Chakra/shared styles
  - Read-only inputs corrected: not applicable
  - Row hover/selected states corrected: not applicable
  - Muted text contrast reviewed: yes
- Verification:
  - Targeted literal search: pass
  - `git diff --check`: pass
  - `npm run build`: pending by user
  - Browser route check: pending by user
- Notes:
  - `IncorporarPersonal`, `ConsultaDePersonal`, `ListaIntegrantes`, and `HorasExtraPersonal` were audited.
  - Registration, search, overtime workflow, validation, and API calls were not modified.

### Module: `Organigrama`

- Status: ✅ Migrado
- Files changed:
  - `src/pages/Organigrama/OrganigramaPage.tsx`
  - `src/pages/Organigrama/MisionVision.tsx`
  - `src/pages/Organigrama/components/CargoNode.tsx`
  - `src/pages/Organigrama/components/EditCargoDialog.tsx`
- Light-mode compatibility:
  - Preserved previous light values through semantic token defaults or `useColorModeValue` light arguments.
- Dark-mode checks:
  - Panels/cards corrected: yes
  - Tables and headers corrected: not applicable in changed files
  - Read-only inputs corrected: not applicable in changed files
  - Row hover/selected states corrected: yes
  - Muted text contrast reviewed: yes
- Verification:
  - Targeted literal search: pass
  - `git diff --check`: pass
  - `npm run build`: pending by user
  - Browser route check: pending by user
- Notes:
  - Changes are limited to Chakra color props and color-mode hooks.
  - Organization chart data flow, edit/view permissions, manual file handling, saves, and API calls were not modified.

### Module: `GestionAreasOperativas` and `AreaOperativaPanel`

- Status: ✅ Migrado
- Files changed:
  - `src/pages/GestionAreasOperativas/CrearAreaProduccion/CrearAreaProduccionTab.tsx`
  - `src/pages/GestionAreasOperativas/components/CategoriaHabilitadaPickerModal.tsx`
  - `src/pages/GestionAreasOperativas/ConsultaAreasOperativas/FiltroAreasOperativas.tsx`
  - `src/pages/GestionAreasOperativas/ConsultaAreasOperativas/TablaAreasOperativas.tsx`
  - `src/pages/GestionAreasOperativas/ConsultaAreasOperativas/DetalleAreaOperativaDialog.tsx`
  - `src/pages/GestionAreasOperativas/ConsultaAreasOperativas/ConsultaAreasOperativasTab.tsx`
  - `src/pages/AreaOperativaPanel/AreaOperativaPanel.tsx`
  - `src/pages/AreaOperativaPanel/AreaOperativaOrderDetailDrawer.tsx`
  - `src/pages/Produccion/components/SeguimientoBoardUI.tsx`
- Light-mode compatibility:
  - Preserved previous light values through semantic token defaults or `useColorModeValue` light arguments.
- Dark-mode checks:
  - Panels/cards corrected: yes
  - Tables and headers corrected: yes
  - Read-only inputs corrected: yes
  - Row hover/selected states corrected: yes
  - Muted text contrast reviewed: yes
- Verification:
  - Targeted literal search: pass
  - `git diff --check`: pass
  - `npm run build`: pending by user
  - Browser route check: pending by user
- Notes:
  - Changes are limited to Chakra color props and color-mode hooks.
  - `SeguimientoBoardUI.tsx` was migrated only as a shared visual dependency of `AreaOperativaPanel`; `Produccion` remains pending.
  - Area creation/editing, category selection logic, operational board actions, payloads, permissions, validations, and API calls were not modified.

### Module: `Contabilidad`

- Status: ✅ Migrado
- Files changed:
  - `src/pages/Contabilidad/cuentas/CatalogoCuentas.tsx`
  - `src/pages/Contabilidad/cuentas/DetalleAsientosCuenta.tsx`
- Light-mode compatibility:
  - Preserved previous light values through semantic token defaults or `useColorModeValue` light arguments.
- Dark-mode checks:
  - Panels/cards corrected: yes
  - Tables and headers corrected: not applicable in changed files
  - Read-only inputs corrected: not applicable
  - Row hover/selected states corrected: yes
  - Muted text contrast reviewed: not applicable in changed files
- Verification:
  - Targeted literal search: pass
  - `git diff --check`: pass
  - `npm run build`: pending by user
  - Browser route check: pending by user
- Notes:
  - Changes are limited to Chakra color props and color-mode hooks.
  - Account loading, filtering, mock fallback, pagination, and asiento calculations were not modified.

### Module: `MasterDirectives`

- Status: ✅ Migrado
- Files changed:
  - `src/pages/MasterDirectives/MasterDirectivesPage.tsx`
- Light-mode compatibility:
  - Preserved previous light values through semantic token defaults or `useColorModeValue` light arguments.
- Dark-mode checks:
  - Panels/cards corrected: not applicable
  - Tables and headers corrected: not applicable in changed files
  - Read-only inputs corrected: not applicable
  - Row hover/selected states corrected: not applicable
  - Muted text contrast reviewed: yes
- Verification:
  - Targeted literal search: pass
  - `git diff --check`: pass
  - `npm run build`: pending by user
  - Browser route check: pending by user
- Notes:
  - Changes are limited to Chakra color props and color-mode hooks.
  - Directive fetching, validation, dirty-state detection, save/cancel behavior, and context refresh were not modified.

### Module: `LoginPage`

- Status: ✅ Migrado
- Files changed:
  - `src/pages/LoginPage/LoginPanel.tsx`
- Light-mode compatibility:
  - Preserved previous light values through `useColorModeValue` light arguments.
- Dark-mode checks:
  - Panels/cards corrected: yes
  - Tables and headers corrected: not applicable
  - Read-only inputs corrected: not applicable
  - Row hover/selected states corrected: not applicable
  - Muted text contrast reviewed: yes
- Verification:
  - Targeted literal search: pass
  - `git diff --check`: pass
  - `npm run build`: pending by user
  - Browser route check: pending by user
- Notes:
  - Changes are limited to Chakra color props and color-mode hooks.
  - Authentication, password-reset request rate limiting, navigation, toasts, reset password validation colors, and cooldown progress colors were not modified.
