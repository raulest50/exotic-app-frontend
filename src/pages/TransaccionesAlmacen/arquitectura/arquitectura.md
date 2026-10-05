# Arquitectura de Transacciones de Almacén

## Intención

## Modelo de entidades

Inventario inicial de 28 entidades persistidas relacionadas con los flujos actuales. Incluye entidades compartidas con otros módulos; no desarrolla sus dependencias internas completas. Los tipos y DTO de TypeScript se identifican en el inventario de archivos y no representan entidades persistidas adicionales.

Rutas relativas a `exotic-app-backend/src/main/java/exotic/app/planta/model/`.

| Entidad / archivo | Función en el módulo |
| --- | --- |
| `inventarios/TransaccionAlmacen.java` | Agrupa movimientos, origen, soporte, responsables y estado contable de una operación. |
| `inventarios/Movimiento.java` | Registra una cantidad de producto, lote, almacén y área dentro de una transacción. |
| `inventarios/Lote.java` | Identifica el lote del producto, sus fechas, calidad y orden de origen. |
| `producto/Producto.java` | Base común de los productos que intervienen en inventario. |
| `producto/Material.java` | Representa materiales recibidos, dispensados, averiados o ajustados. |
| `producto/SemiTerminado.java` | Representa productos intermedios involucrados en recetas y fabricación. |
| `producto/Terminado.java` | Representa productos terminados de las órdenes y del ingreso de producción. |
| `producto/manufacturing/receta/Insumo.java` | Relaciona un producto de la receta con su cantidad requerida. |
| `producto/manufacturing/packaging/CasePack.java` | Define la configuración de empaque usada en la dispensación. |
| `producto/manufacturing/packaging/InsumoEmpaque.java` | Define materiales y cantidades del empaque. |
| `compras/OrdenCompraMateriales.java` | Orden de compra que origina la recepción de materiales. |
| `compras/ItemOrdenCompra.java` | Material, cantidad y precio de cada renglón de la orden de compra. |
| `compras/Proveedor.java` | Proveedor asociado a la orden y a sus filtros de búsqueda. |
| `produccion/OrdenProduccion.java` | Orden vinculada con dispensaciones, averías e ingreso de terminados. |
| `produccion/SeguimientoOrdenArea.java` | Seguimiento de la orden por área, relacionado con avance y reportes de producción. |
| `produccion/fabricacion/OrdenFabricacion.java` | Orden de semiterminado atendida por el flujo de dispensación v2. |
| `produccion/fabricacion/OrdenFabricacionOperacion.java` | Operación y área de una orden de fabricación. |
| `produccion/batchrecord/BatchRecord.java` | Registro de fabricación consultado para preparar requerimientos de dispensación v2. |
| `produccion/ReporteProduccionLote.java` | Cantidad producida por lote que se revisa y confirma para su ingreso. |
| `produccion/CierreProduccion.java` | Agrupa reportes confirmados y registra el cierre de una fecha de producción. |
| `produccion/SemanaMPS.java` | Identifica la semana del programa de producción. |
| `produccion/MasterProductionScheduleSemanal.java` | Cabecera del programa semanal consultado en dispensación v2. |
| `produccion/MpsSemanalDia.java` | Agrupa los ítems del programa por día. |
| `produccion/MpsSemanalItem.java` | Producto y cantidades planificados dentro del programa semanal. |
| `produccion/MpsSemanalLotePlanificado.java` | Lote planificado y vínculo con la orden seleccionable para dispensar. |
| `organizacion/AreaOperativa.java` | Área de destino o de producción asociada a la operación. |
| `users/User.java` | Usuario responsable, aprobador o ejecutor según el flujo. |
| `contabilidad/AsientoContable.java` | Asiento vinculado con la transacción y su consulta contable. |

### Relación con las pestañas

Núcleo de inventario compartido: `TransaccionAlmacen`, `Movimiento`, `Lote` y `Producto`. La tabla indica entidades adicionales relevantes; no implica que cada pestaña las cree o modifique.

| Pestaña | Entidades adicionales relacionadas |
| --- | --- |
| Ingreso OCM | `OrdenCompraMateriales`, `ItemOrdenCompra`, `Proveedor`, `Material`, `User`. |
| Hacer Dispensación | `OrdenProduccion`, `SeguimientoOrdenArea`, `AreaOperativa`, `Material`, `SemiTerminado`, `Terminado`, `Insumo`, `CasePack`, `InsumoEmpaque`, `User`. |
| Dispensación v2 | Las entidades de receta, empaque y órdenes anteriores; `SemanaMPS`, `MasterProductionScheduleSemanal`, `MpsSemanalDia`, `MpsSemanalItem`, `MpsSemanalLotePlanificado`, `OrdenFabricacion`, `OrdenFabricacionOperacion`, `BatchRecord`. |
| Historial Dispensaciones | `OrdenProduccion`, `Terminado`, `User`, `AsientoContable`. |
| Ingreso Producto Terminado | `OrdenProduccion`, `SeguimientoOrdenArea`, `ReporteProduccionLote`, `CierreProduccion`, `Terminado`, `User`. |
| Gestión Averías | `OrdenProduccion`, `AreaOperativa`, `Material`, `User`. |
| Ajustes de Inventario | Subtipos de `Producto` y `User`; la causa del ajuste se representa mediante un enum. |

## Modelo de archivos

### Frontend: resumen

75 archivos `.ts`/`.tsx` dentro del módulo y 31 dependencias locales externas importadas directamente: 106 archivos de frontend identificados, sin contar este documento, paquetes de terceros ni dependencias transitivas externas.

| Ubicación / pestaña | Archivos propios |
| --- | ---: |
| Base del módulo y `components/` | 3 |
| Ingreso OCM | 17 |
| Hacer Dispensación | 11 |
| Dispensación v2 | 12 |
| Historial Dispensaciones | 5 |
| Ingreso Producto Terminado | 9 |
| Gestión Averías | 10 |
| Ajustes de Inventario | 8 |
| **Total** | **75** |

Las rutas de los siguientes apartados son relativas a `exotic-app-frontend/src/pages/TransaccionesAlmacen/`. Incluyen dos archivos presentes en la carpeta sin conexión mediante imports al árbol actual de `TransaccionesAlmacenPage.tsx`, señalados en su entrada.

### Base del módulo — 3 archivos

- `TransaccionesAlmacenPage.tsx`: compone las siete pestañas y determina su visibilidad por permisos y directivas.
- `types.tsx`: tipos comunes de compras, inventario, dispensación y recepción, junto con enums y funciones de presentación.
- `components/MateriaPrimaPicker.tsx`: selector de materias primas; sin conexión por imports con la página actual.

### Ingreso OCM — 17 archivos

Clave de pestaña: `ingreso-ocm`. Carpeta: `AsistenteIngresoOCM/`.

- `AsistenteIngresoOCM/AsistenteIngresoMercancia.tsx`: coordina el asistente de recepción de compras.
- `AsistenteIngresoOCM/IngresoOCMStep0SelectPurchaseOrder.tsx`: busca y selecciona la orden de compra.
- `AsistenteIngresoOCM/IngresoOCMStep1VerifyQuantities.tsx`: revisa cantidades y datos de los lotes por recibir.
- `AsistenteIngresoOCM/StepTwoComponent_IngOCM/IngresoOCMStep2UploadDocument.tsx`: gestiona el documento de soporte de la recepción.
- `AsistenteIngresoOCM/IngresoOCMStep3ReviewSubmit.tsx`: revisa y envía el ingreso.
- `AsistenteIngresoOCM/IngresoOCMStep4Confirmation.tsx`: presenta la confirmación y el estado de recepción.
- `AsistenteIngresoOCM/ocmIngresoApi.ts`: llamadas HTTP de órdenes pendientes, recepción, lotes y cierre de OCM.
- `AsistenteIngresoOCM/useOcmReceptionData.ts`: carga y mantiene transacciones y consolidado de una OCM.
- `AsistenteIngresoOCM/useOcmLotePreview.ts`: consulta y mantiene la previsualización de lotes.
- `AsistenteIngresoOCM/useIngresoOcmDraft.ts`: administra el borrador de materiales y lotes del ingreso.
- `AsistenteIngresoOCM/ingresoOcmTypes.ts`: contratos del borrador, validaciones, consultas y previsualización.
- `AsistenteIngresoOCM/ingresoOcmMappers.ts`: valida el borrador y construye movimientos y payloads de ingreso.
- `AsistenteIngresoOCM/componentes/CardIngresoMaterial.tsx`: presenta y permite editar un material del ingreso.
- `AsistenteIngresoOCM/StepTwoComponent_IngOCM/CerrarOrdenDialog.tsx`: diálogo para cerrar la orden de compra.
- `AsistenteIngresoOCM/StepTwoComponent_IngOCM/ListaMaterialesIngresoDesgloce.tsx`: presenta el consolidado de materiales recibidos.
- `AsistenteIngresoOCM/StepTwoComponent_IngOCM/ListaTransaccionesAlmacen.tsx`: presenta transacciones y movimientos de recepción.
- `AsistenteIngresoOCM/StepZeroComponent_v1.tsx`: versión alternativa del selector de OCM; sin conexión por imports con la página actual.

### Hacer Dispensación — 11 archivos

Clave de pestaña: `hacer-dispensacion`. Carpeta: `AsistenteDispensacion/`.

- `AsistenteDispensacion/AsistenteDispensacion.tsx`: coordina los pasos de dispensación.
- `AsistenteDispensacion/DispensacionStep1SelectOrder.tsx`: busca y selecciona una orden de producción.
- `AsistenteDispensacion/DispensacionStep2EditItems.tsx`: prepara y edita los insumos que se dispensarán.
- `AsistenteDispensacion/DispensacionStep3ReviewSubmit.tsx`: revisa responsables y cantidades y envía la dispensación.
- `AsistenteDispensacion/FiltroODP_AsistDisp.tsx`: filtros de órdenes de producción.
- `AsistenteDispensacion/TablaDispensacionInsumos.tsx`: tabla de cantidades e insumos de receta.
- `AsistenteDispensacion/TablaDispensacionInsumosEmpaque.tsx`: tabla de insumos de empaque.
- `AsistenteDispensacion/SeccionReposicionAverias.tsx`: selección de reposiciones por averías.
- `AsistenteDispensacion/ResumenHistorialDispensaciones.tsx`: consulta y presenta dispensaciones anteriores de la orden.
- `AsistenteDispensacion/AsistenteDispensacionComponents/LotePickerDispensacion.tsx`: consulta y asigna lotes disponibles.
- `AsistenteDispensacion/AsistenteDispensacionComponents/DispensacionPDF_Generator.tsx`: genera el documento PDF de dispensación; también lo usa el historial.

### Dispensación v2 — 12 archivos

Clave de pestaña: `dispensacion-v2`. Carpeta: `DispensacionV2/`.

- `DispensacionV2/DispensacionV2Tab.tsx`: coordina los pasos y la selección del flujo de dispensación.
- `DispensacionV2/DispensacionV2Step1SelectArea.tsx`: consulta y selecciona el área operativa.
- `DispensacionV2/DispensacionV2Step2MpsSemana.tsx`: consulta el programa de producción de la semana.
- `DispensacionV2/DispensacionV2Step3SeleccionOrdenes.tsx`: selecciona órdenes y lotes planificados del MPS.
- `DispensacionV2/DispensacionV2Step3Materiales.tsx`: prepara, selecciona y recalcula materiales de receta y empaque.
- `DispensacionV2/DispensacionV2Step4Resumen.tsx`: presenta el resumen previo a la confirmación.
- `DispensacionV2/DispensacionV2Step5Confirmacion.tsx`: confirma y finaliza la dispensación.
- `DispensacionV2/DispensacionV2OrdenFabricacionFlow.tsx`: gestiona la dispensación para órdenes de fabricación de semiterminados.
- `DispensacionV2/DispensacionV2DetalleLotesModal.tsx`: muestra y permite ajustar la asignación de lotes.
- `DispensacionV2/DispensacionV2Service.ts`: llamadas HTTP para preparar, asignar lotes y finalizar ambos flujos.
- `DispensacionV2/DispensacionV2Calculations.ts`: recalcula cantidades, totales y advertencias de dispensación.
- `DispensacionV2/DispensacionV2Types.ts`: contratos de selección, preparación, materiales, lotes y finalización.

### Historial Dispensaciones — 5 archivos

Clave de pestaña: `historial-dispensaciones`. Carpeta: `HistorialDispensaciones/`.

- `HistorialDispensaciones/HistorialDispensaciones.tsx`: consulta y pagina las dispensaciones y permite generar su PDF.
- `HistorialDispensaciones/FiltroHistorialDispensaciones.tsx`: filtros de búsqueda del historial.
- `HistorialDispensaciones/TablaDispensaciones.tsx`: tabla de resultados del historial.
- `HistorialDispensaciones/DetalleDispensacionDialog.tsx`: consulta y presenta el detalle de una dispensación.
- `HistorialDispensaciones/types.ts`: contratos de transacción resumida, filtros y respuesta paginada.

### Ingreso Producto Terminado — 9 archivos

Clave de pestaña: `ingreso-pt`. Carpeta: `AsistenteIngresoTerminados/`.

- `AsistenteIngresoTerminados/AsistenteIngresoTerminados.tsx`: coordina la revisión y el cierre de producción por fecha.
- `AsistenteIngresoTerminados/IngresoTerminadosStep1Lectura.tsx`: presenta los reportes pendientes de producción.
- `AsistenteIngresoTerminados/IngresoTerminadosStep2Correccion.tsx`: permite corregir los datos del ingreso.
- `AsistenteIngresoTerminados/IngresoTerminadosStep3HyL.tsx`: presenta el paso de reporte HyL.
- `AsistenteIngresoTerminados/IngresoTerminadosStep4Resumen.tsx`: presenta el resumen previo al cierre.
- `AsistenteIngresoTerminados/ReporteHyLButton.tsx`: consolida datos y descarga el reporte HyL.
- `AsistenteIngresoTerminados/ingresoTerminadosApi.ts`: consulta pendientes y confirma el cierre de producción.
- `AsistenteIngresoTerminados/produccionCierreUtils.ts`: consolida productos y compara y formatea cantidades.
- `AsistenteIngresoTerminados/types.ts`: contratos de reportes, ediciones, consolidado y cierre de producción.

### Gestión Averías — 10 archivos

Clave de pestaña: `gestion-averias`. Carpeta: `GestionAverias/`.

- `GestionAverias/GestionAveriasTab.tsx`: selecciona entre averías de almacén y de producción.
- `GestionAverias/WizardAveriaAlmacen/WizardAveriaAlmacen.tsx`: coordina el registro de averías de almacén y define sus ítems.
- `GestionAverias/WizardAveriaAlmacen/steps/AveriaAlmacenStep0SelectMaterial.tsx`: selecciona material y lote.
- `GestionAverias/WizardAveriaAlmacen/steps/AveriaAlmacenStep1Quantities.tsx`: captura las cantidades averiadas.
- `GestionAverias/WizardAveriaAlmacen/steps/AveriaAlmacenStep2ReviewSubmit.tsx`: revisa y registra la avería de almacén.
- `GestionAverias/WizardAveriaProduccion/WizardAveriaProduccion.tsx`: coordina averías de producción y define sus contratos locales.
- `GestionAverias/WizardAveriaProduccion/steps/AveriaProduccionStep0SelectArea.tsx`: selecciona el área operativa.
- `GestionAverias/WizardAveriaProduccion/steps/AveriaProduccionStep1SelectOrder.tsx`: selecciona la orden de producción.
- `GestionAverias/WizardAveriaProduccion/steps/AveriaProduccionStep2ListAverias.tsx`: consulta insumos dispensados e historial y captura las averías.
- `GestionAverias/WizardAveriaProduccion/steps/AveriaProduccionStep3ReviewSubmit.tsx`: revisa y registra las averías de producción.

### Ajustes de Inventario — 8 archivos

Clave de pestaña: `ajustes-inventario`. Carpeta: `AjustesInventario/`.

- `AjustesInventario/AjustesInventarioTab.tsx`: coordina selección, cantidades y envío del ajuste.
- `AjustesInventario/Step1_SelProd_AdjInv.tsx`: busca y selecciona los productos del ajuste.
- `AjustesInventario/Step2_FillData.tsx`: captura cantidades, causas y asignaciones de lotes.
- `AjustesInventario/Step3_SendAjuste.tsx`: presenta la revisión y confirmación del ajuste.
- `AjustesInventario/AjusteEntradaLotePicker.tsx`: selecciona los lotes para ajustes de entrada.
- `AjustesInventario/AjusteSalidaLotePicker.tsx`: distribuye las salidas entre lotes disponibles.
- `AjustesInventario/causasAjuste.ts`: catálogo tipado y etiquetas de causas de ajuste.
- `AjustesInventario/types.ts`: contratos de lotes y de ítems normalizados del ajuste.

### Dependencias compartidas directas de frontend — 31 archivos

Rutas relativas a `exotic-app-frontend/src/`. Cada archivo se cuenta una sola vez, aunque lo importen varias pestañas.

- `api/EndPointsURL.tsx`: rutas de API usadas por las consultas y operaciones del módulo.
- `api/EmpresaIdentidadDocumentalApi.ts`: consulta de identidad documental para el PDF de dispensación.
- `auth/accessHelpers.ts`: construcción de reglas de acceso por pestaña.
- `auth/accessModel.ts`: contratos de las reglas de acceso.
- `auth/usePermissions.ts`: consulta de permisos de las pestañas y sus operaciones.
- `context/AuthContext.tsx`: usuario autenticado.
- `context/MasterDirectivesContext.tsx`: directivas aplicadas en dispensación v2.
- `context/masterDirectiveConstants.ts`: claves de directivas usadas en recepción y dispensación v2.
- `components/MyHeader.tsx`: encabezado del módulo.
- `components/BetterPagination/BetterPagination.tsx`: paginación de OCM, áreas, órdenes e historial.
- `components/MyPagination.tsx`: paginación de productos en ajustes de inventario.
- `components/CustomDecimalInput/CustomDecimalInput.tsx`: captura de cantidades decimales.
- `components/MyDatePicker.tsx`: filtro de fechas del historial.
- `components/Pickers/MaterialByLotePicker/MaterialByLotePicker.tsx`: selección de materiales por lote para averías de almacén.
- `components/Pickers/TerminadoPicker/TerminadoPicker.tsx`: filtro de producto terminado en el historial.
- `components/Pickers/UserPickerGeneric/UserPickerGeneric.tsx`: selección de usuarios responsables de dispensación.
- `components/ui/color-mode.tsx`: adaptación visual al modo de color.
- `features/ocmCierre/OcmReceptionStatus.tsx`: presentación del estado de recepción de OCM.
- `features/ocmCierre/types.ts`: contratos de estado de recepción y cierre de OCM.
- `pages/Compras/components/ProveedorFilterOCM.tsx`: filtro de proveedor para órdenes de compra.
- `pages/Compras/components/ProveedorPicker.tsx`: selector de proveedor en ingreso OCM.
- `pages/Produccion/ProgProdSemanalTab/MpsReadonlyReviewPanel.tsx`: consulta visual del MPS en dispensación v2.
- `pages/Produccion/ProgProdSemanalTab/MpsSemanalService.ts`: consultas y contratos del MPS semanal.
- `pages/Produccion/ProgProdSemanalTab/semanaMps.utils.ts`: utilidades de semanas del MPS.
- `pages/Produccion/components/SeguimientoBoardUI.tsx`: presentación compartida del seguimiento de órdenes.
- `pages/Produccion/types.tsx`: contratos de producción usados en dispensación.
- `pages/Productos/types.tsx`: contratos de productos usados en ajustes de inventario.
- `pages/Proveedores/types.tsx`: contratos de proveedor utilizados por los tipos comunes del módulo.
- `pages/Usuarios/GestionUsuarios/types.tsx`: contratos de usuarios, módulos y permisos.
- `styles/styles_general.tsx`: estilos compartidos de pestañas.
- `utils/pdfBranding.ts`: identidad visual del PDF de dispensación.

### Backend

## Layout de interfaz

## Estrategia
