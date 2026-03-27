import { Modulo } from "../pages/Usuarios/GestionUsuarios/types.tsx";

export type TabDefinition = { tabId: string; label: string };

/** Debe coincidir con ModuloTabCatalog en el backend */
export const TABS_BY_MODULO: Record<Modulo, TabDefinition[]> = {
    [Modulo.USUARIOS]: [
        { tabId: "GESTION_USUARIOS", label: "Gestión de Usuarios" },
        { tabId: "INFO_NIVELES", label: "Info Niveles de Acceso" },
        { tabId: "NOTIFICACIONES", label: "Notificaciones" },
    ],
    [Modulo.PRODUCTOS]: [{ tabId: "MAIN", label: "General" }],
    [Modulo.PRODUCCION]: [{ tabId: "MAIN", label: "General" }],
    [Modulo.STOCK]: [{ tabId: "MAIN", label: "General" }],
    [Modulo.PROVEEDORES]: [{ tabId: "MAIN", label: "General" }],
    [Modulo.COMPRAS]: [{ tabId: "MAIN", label: "General" }],
    [Modulo.SEGUIMIENTO_PRODUCCION]: [{ tabId: "MAIN", label: "General" }],
    [Modulo.CLIENTES]: [{ tabId: "MAIN", label: "General" }],
    [Modulo.VENTAS]: [{ tabId: "MAIN", label: "General" }],
    [Modulo.TRANSACCIONES_ALMACEN]: [{ tabId: "MAIN", label: "General" }],
    [Modulo.ACTIVOS]: [{ tabId: "MAIN", label: "General" }],
    [Modulo.CONTABILIDAD]: [{ tabId: "MAIN", label: "General" }],
    [Modulo.PERSONAL_PLANTA]: [{ tabId: "MAIN", label: "General" }],
    [Modulo.BINTELLIGENCE]: [{ tabId: "MAIN", label: "General" }],
    [Modulo.ADMINISTRACION_ALERTAS]: [{ tabId: "MAIN", label: "General" }],
    [Modulo.CRONOGRAMA]: [{ tabId: "MAIN", label: "General" }],
    [Modulo.ORGANIGRAMA]: [{ tabId: "MAIN", label: "General" }],
    [Modulo.PAGOS_PROVEEDORES]: [{ tabId: "MAIN", label: "General" }],
};

export function tabsForModule(modulo: Modulo): TabDefinition[] {
    return TABS_BY_MODULO[modulo] ?? [{ tabId: "MAIN", label: "General" }];
}
