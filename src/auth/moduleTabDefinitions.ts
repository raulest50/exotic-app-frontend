import { Modulo } from "../pages/Usuarios/GestionUsuarios/types.tsx";

export type TabDefinition = { tabId: string; label: string };

/** Debe coincidir con MapaAccesos en el backend */
export const TABS_BY_MODULO: Record<Modulo, TabDefinition[]> = {
    [Modulo.USUARIOS]: [
        { tabId: "GESTION_USUARIOS", label: "Gestion de Usuarios" },
        { tabId: "INFO_NIVELES", label: "Info Niveles de Acceso" },
        { tabId: "NOTIFICACIONES", label: "Notificaciones" },
    ],
    [Modulo.PRODUCTOS]: [{ tabId: "MAIN", label: "General" }],
    [Modulo.PRODUCCION]: [
        { tabId: "CREAR_ODP_MANUALMENTE", label: "Crear ODP Manualmente" },
        { tabId: "HISTORIAL", label: "Historial" },
        { tabId: "PARAMETROS_POR_CATEGORIA", label: "Parametros por Categoria" },
        { tabId: "PLANEACION_PRODUCCION", label: "Planeacion Produccion" },
    ],
    [Modulo.STOCK]: [
        { tabId: "CONSOLIDADO", label: "Consolidado" },
        { tabId: "KARDEX", label: "Kardex" },
        { tabId: "HISTORIAL_TRANSACCIONES_ALMACEN", label: "Historial Transacciones de Almacen" },
    ],
    [Modulo.PROVEEDORES]: [
        { tabId: "CODIFICAR_PROVEEDOR", label: "Codificar Proveedor" },
        { tabId: "CONSULTAR_PROVEEDORES", label: "Consultar Proveedores" },
    ],
    [Modulo.COMPRAS]: [
        { tabId: "CREAR_OCM", label: "Crear OC-M" },
        { tabId: "REPORTES_ORDENES_COMPRA", label: "Reportes Ordenes de Compra" },
    ],
    [Modulo.SEGUIMIENTO_PRODUCCION]: [
        { tabId: "CREAR_AREA_PRODUCCION", label: "Crear Area de Produccion" },
        { tabId: "CONSULTA_AREAS_OPERATIVAS", label: "Consulta Areas Operativas" },
    ],
    [Modulo.CLIENTES]: [
        { tabId: "REGISTRAR_CLIENTE", label: "Registrar Cliente" },
        { tabId: "CONSULTAR_CLIENTES", label: "Consultar Clientes" },
    ],
    [Modulo.VENTAS]: [
        { tabId: "CREAR_VENTA", label: "Crear Venta" },
        { tabId: "HISTORIAL_VENTAS", label: "Historial de Ventas" },
        { tabId: "REPORTES", label: "Reportes" },
        { tabId: "CREAR_VENDEDOR_NUEVO", label: "Crear vendedor nuevo" },
    ],
    [Modulo.TRANSACCIONES_ALMACEN]: [
        { tabId: "INGRESO_OCM", label: "Ingreso OCM" },
        { tabId: "HACER_DISPENSACION", label: "Hacer Dispensacion" },
        { tabId: "HISTORIAL_DISPENSACIONES", label: "Historial Dispensaciones" },
        { tabId: "INGRESO_PRODUCTO_TERMINADO", label: "Ingreso Producto Terminado" },
        { tabId: "GESTION_AVERIAS", label: "Gestion Averias" },
        { tabId: "AJUSTES_INVENTARIO", label: "Ajustes de Inventario" },
    ],
    [Modulo.ACTIVOS]: [
        { tabId: "INCORPORACION", label: "Incorporacion" },
        { tabId: "CREAR_OC_AF", label: "Crear OC-AF" },
        { tabId: "REPORTES_OC_AF", label: "Reportes OC-AF" },
        { tabId: "REPORTES_ACTIVOS_FIJOS", label: "Reportes Activos Fijos" },
    ],
    [Modulo.CONTABILIDAD]: [{ tabId: "MAIN", label: "General" }],
    [Modulo.PERSONAL_PLANTA]: [
        { tabId: "INCORPORACION", label: "Incorporacion" },
        { tabId: "CONSULTA", label: "Consulta" },
    ],
    [Modulo.BINTELLIGENCE]: [
        { tabId: "INFORMES_DIARIOS", label: "Informes Diarios" },
        { tabId: "SERIES_TIEMPO_PROYECCIONES", label: "Series De Tiempo y Proyecciones" },
    ],
    [Modulo.OPERACIONES_CRITICAS_BD]: [
        { tabId: "CARGA_MASIVA_ALMACEN", label: "Carga Masiva Almacen" },
        { tabId: "CARGA_MASIVA_MATERIALES", label: "Carga Masiva Materiales" },
        { tabId: "CARGA_MASIVA_TERMINADOS", label: "Carga Masiva Terminados" },
        { tabId: "ELIMINACIONES_FORZADAS", label: "Eliminaciones Forzadas" },
        { tabId: "EXPORTACION_DATOS", label: "Exportacion Datos" },
    ],
    [Modulo.ADMINISTRACION_ALERTAS]: [{ tabId: "MAIN", label: "General" }],
    [Modulo.MASTER_DIRECTIVES]: [{ tabId: "MAIN", label: "General" }],
    [Modulo.CRONOGRAMA]: [{ tabId: "MAIN", label: "General" }],
    [Modulo.ORGANIGRAMA]: [
        { tabId: "ORGANIGRAMA", label: "Organigrama" },
        { tabId: "MISION_VISION", label: "Mision y Vision" },
    ],
    [Modulo.PAGOS_PROVEEDORES]: [
        { tabId: "ASENTAR_TRANSACCIONES_ALMACEN", label: "Asentar Transacciones Almacen" },
        { tabId: "FACTURAS_VENCIDAS", label: "Facturas Vencidas" },
    ],
};

export function tabsForModule(modulo: Modulo): TabDefinition[] {
    return TABS_BY_MODULO[modulo] ?? [{ tabId: "MAIN", label: "General" }];
}
