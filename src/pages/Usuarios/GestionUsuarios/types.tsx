// Path: src/pages/Usuarios/GestionUsuarios/types.tsx
// Used in: src/App.tsx; src/pages/Home.tsx; src/pages/Usuarios/InfoNiveles.tsx; src/pages/GestionAreasOperativas/CrearAreaProduccion/CrearAreaProduccionTab.tsx; src/api/ModulesNotifications.tsx; src/context/NotificationsContext.tsx; src/components/Pickers/UserPickerGeneric/UserPickerGeneric.tsx; src/components/Pickers/UserPickerGeneric/UserPickerGeneric.stories.tsx; src/pages/Ventas/TabsContent/CrearVendedor.tsx
// Summary: Tipos compartidos para usuarios, accesos y modulos usados en navegacion, notificaciones y pickers de usuario.

export interface Role {
    id: number;
    name: string;
}

export interface TabAccesoFE {
    id: number;
    tabId: string;
    nivel: number;
}

export interface ModuloAccesoFE {
    id: number;
    modulo: Modulo | string;
    tabs: TabAccesoFE[];
}

export interface User {
    id: number;
    cedula: number;
    username: string;
    nombreCompleto?: string;
    password?: string;
    email?: string;
    cel?: string;
    direccion?: string;
    fechaNacimiento?: string;
    estado: number;
    moduloAccesos?: ModuloAccesoFE[];
}

export enum Modulo {
    USUARIOS = "USUARIOS",
    PRODUCTOS = "PRODUCTOS",
    PRODUCCION = "PRODUCCION",
    STOCK = "STOCK",
    PROVEEDORES = "PROVEEDORES",
    COMPRAS = "COMPRAS",
    SEGUIMIENTO_PRODUCCION = "SEGUIMIENTO_PRODUCCION",
    CLIENTES = "CLIENTES",
    VENTAS = "VENTAS",
    TRANSACCIONES_ALMACEN = "TRANSACCIONES_ALMACEN",
    ACTIVOS = "ACTIVOS",
    CONTABILIDAD = "CONTABILIDAD",
    PERSONAL_PLANTA = "PERSONAL_PLANTA",
    BINTELLIGENCE = "BINTELLIGENCE",
    OPERACIONES_CRITICAS_BD = "OPERACIONES_CRITICAS_BD",
    ADMINISTRACION_ALERTAS = "ADMINISTRACION_ALERTAS",
    MASTER_DIRECTIVES = "MASTER_DIRECTIVES",
    CRONOGRAMA = "CRONOGRAMA",
    ORGANIGRAMA = "ORGANIGRAMA",
    PAGOS_PROVEEDORES = "PAGOS_PROVEEDORES",
}
