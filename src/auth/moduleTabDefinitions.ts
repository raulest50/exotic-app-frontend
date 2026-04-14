import { Modulo } from "../pages/Usuarios/GestionUsuarios/types.tsx";

export type TabDefinition = { tabId: string; label: string; maxNivel: number };

function tab(tabId: string, label: string, maxNivel: number = 4): TabDefinition {
    return { tabId, label, maxNivel };
}

/** Debe coincidir con MapaAccesos en el backend */
export const TABS_BY_MODULO: Record<Modulo, TabDefinition[]> = {
    [Modulo.USUARIOS]: [
        tab("GESTION_USUARIOS", "Gestion de Usuarios"),
        tab("INFO_NIVELES", "Info Niveles de Acceso"),
        tab("NOTIFICACIONES", "Notificaciones"),
    ],
    [Modulo.PRODUCTOS]: [tab("MAIN", "General")],
    [Modulo.PRODUCCION]: [
        tab("CREAR_ODP_MANUALMENTE", "Crear ODP Manualmente"),
        tab("HISTORIAL", "Historial"),
        tab("PARAMETROS_POR_CATEGORIA", "Parametros por Categoria"),
        tab("PLANEACION_PRODUCCION", "Planeacion Produccion"),
        tab("MONITOREAR_AREAS_OPERATIVAS", "Monitorear Areas Operativas"),
        tab("APROBACION_MPS_WEEK", "Aprobacion MPS Week"),
    ],
    [Modulo.STOCK]: [
        tab("CONSOLIDADO", "Consolidado"),
        tab("KARDEX", "Kardex"),
        tab("HISTORIAL_TRANSACCIONES_ALMACEN", "Historial Transacciones de Almacen"),
    ],
    [Modulo.PROVEEDORES]: [
        tab("CODIFICAR_PROVEEDOR", "Codificar Proveedor"),
        tab("CONSULTAR_PROVEEDORES", "Consultar Proveedores"),
    ],
    [Modulo.COMPRAS]: [
        tab("CREAR_OCM", "Crear OC-M"),
        tab("REPORTES_ORDENES_COMPRA", "Reportes Ordenes de Compra"),
    ],
    [Modulo.SEGUIMIENTO_PRODUCCION]: [
        tab("CREAR_AREA_PRODUCCION", "Crear Area de Produccion"),
        tab("CONSULTA_AREAS_OPERATIVAS", "Consulta Areas Operativas"),
    ],
    [Modulo.CLIENTES]: [
        tab("REGISTRAR_CLIENTE", "Registrar Cliente"),
        tab("CONSULTAR_CLIENTES", "Consultar Clientes"),
    ],
    [Modulo.VENTAS]: [
        tab("CREAR_VENTA", "Crear Venta"),
        tab("HISTORIAL_VENTAS", "Historial de Ventas"),
        tab("REPORTES", "Reportes"),
        tab("CREAR_VENDEDOR_NUEVO", "Crear vendedor nuevo"),
    ],
    [Modulo.TRANSACCIONES_ALMACEN]: [
        tab("INGRESO_OCM", "Ingreso OCM"),
        tab("HACER_DISPENSACION", "Hacer Dispensacion"),
        tab("HISTORIAL_DISPENSACIONES", "Historial Dispensaciones"),
        tab("INGRESO_PRODUCTO_TERMINADO", "Ingreso Producto Terminado"),
        tab("GESTION_AVERIAS", "Gestion Averias"),
        tab("AJUSTES_INVENTARIO", "Ajustes de Inventario"),
    ],
    [Modulo.ACTIVOS]: [
        tab("INCORPORACION", "Incorporacion"),
        tab("CREAR_OC_AF", "Crear OC-AF"),
        tab("REPORTES_OC_AF", "Reportes OC-AF"),
        tab("REPORTES_ACTIVOS_FIJOS", "Reportes Activos Fijos"),
    ],
    [Modulo.CONTABILIDAD]: [tab("MAIN", "General")],
    [Modulo.PERSONAL_PLANTA]: [
        tab("INCORPORACION", "Incorporacion"),
        tab("CONSULTA", "Consulta"),
    ],
    [Modulo.BINTELLIGENCE]: [
        tab("INFORMES_DIARIOS", "Informes Diarios"),
        tab("SERIES_TIEMPO_PROYECCIONES", "Series De Tiempo y Proyecciones"),
    ],
    [Modulo.OPERACIONES_CRITICAS_BD]: [
        tab("CARGA_MASIVA_ALMACEN", "Carga Masiva Almacen"),
        tab("CARGA_MASIVA_MATERIALES", "Carga Masiva Materiales"),
        tab("CARGA_MASIVA_TERMINADOS", "Carga Masiva Terminados"),
        tab("ELIMINACIONES_FORZADAS", "Eliminaciones Forzadas"),
        tab("EXPORTACION_DATOS", "Exportacion Datos"),
    ],
    [Modulo.ADMINISTRACION_ALERTAS]: [tab("MAIN", "General")],
    [Modulo.MASTER_DIRECTIVES]: [tab("MAIN", "General")],
    [Modulo.CRONOGRAMA]: [tab("MAIN", "General")],
    [Modulo.ORGANIGRAMA]: [
        tab("ORGANIGRAMA", "Organigrama"),
        tab("MISION_VISION", "Mision y Vision"),
    ],
    [Modulo.PAGOS_PROVEEDORES]: [
        tab("ASENTAR_TRANSACCIONES_ALMACEN", "Asentar Transacciones Almacen"),
        tab("FACTURAS_VENCIDAS", "Facturas Vencidas"),
    ],
};

export function tabsForModule(modulo: Modulo): TabDefinition[] {
    return TABS_BY_MODULO[modulo] ?? [tab("MAIN", "General")];
}
