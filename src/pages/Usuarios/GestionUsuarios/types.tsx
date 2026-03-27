// Path: src/pages/Usuarios/GestionUsuarios/types.tsx
// Used in: src/App.tsx; src/pages/Home.tsx; src/pages/Usuarios/InfoNiveles.tsx; src/pages/GestionAreasOperativas/CrearAreaProduccion/CrearAreaProduccionTab.tsx; src/api/ModulesNotifications.tsx; src/context/NotificationsContext.tsx; src/components/Pickers/UserPickerGeneric/UserPickerGeneric.tsx; src/components/Pickers/UserPickerGeneric/UserPickerGeneric.stories.tsx; src/pages/Ventas/TabsContent/CrearVendedor.tsx
// Summary: Tipos compartidos para usuarios, roles y módulos usados en navegación, notificaciones y pickers de usuario.


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
    fechaNacimiento?: string; // ISO format, e.g., '2025-05-06'
    estado: number;
    moduloAccesos?: ModuloAccesoFE[];
}


// src/types/Modulo.tsx
export enum Modulo {
    USUARIOS = "USUARIOS", // ruta /usuarios
    PRODUCTOS = "PRODUCTOS", // ruta /productos
    PRODUCCION = "PRODUCCION", // ruta /produccion
    STOCK = "STOCK", // ruta /stock
    PROVEEDORES = "PROVEEDORES", // ruta /Proveedores
    COMPRAS = "COMPRAS", // ruta /compras
    SEGUIMIENTO_PRODUCCION = "SEGUIMIENTO_PRODUCCION", // ruta /gestion_areas_operativas
    CLIENTES = "CLIENTES", // ruta /clientes
    VENTAS = "VENTAS", // ruta /ventas
    TRANSACCIONES_ALMACEN = "TRANSACCIONES_ALMACEN", // ruta /transacciones_almacen
    ACTIVOS = "ACTIVOS", // ruta /Activos
    CONTABILIDAD = "CONTABILIDAD", //ruta /Contabilidad
    PERSONAL_PLANTA = "PERSONAL_PLANTA", // ruta /personal
    BINTELLIGENCE = "BINTELLIGENCE", // ruta /Bintelligence
    //CARGA_MASIVA = "CARGA_MASIVA", // ruta /carga_masiva
    ADMINISTRACION_ALERTAS = "ADMINISTRACION_ALERTAS", // ruta /administracion_alertas
    //MASTER_DIRECTIVES = "MASTER_DIRECTIVES", // ruta /master_directives
    CRONOGRAMA = "CRONOGRAMA", // ruta /cronograma
    ORGANIGRAMA = "ORGANIGRAMA", // ruta /organigrama
    PAGOS_PROVEEDORES = "PAGOS_PROVEEDORES" // ruta /pagos-proveedores
}
