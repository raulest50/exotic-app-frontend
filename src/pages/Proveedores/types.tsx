// Path: src/pages/Proveedores/types.tsx
// Used in: src/pages/Proveedores/CodificarProveedor.tsx; src/pages/Proveedores/consultar/*; src/pages/Compras/types.tsx; src/pages/TransaccionesAlmacen/types.tsx
// Summary: Definiciones de proveedor y contacto usadas en formularios y búsquedas de proveedores.
export interface Contacto {
    fullName: string;
    cargo: string;
    cel: string;
    email: string;
}

export interface Proveedor {
    id: string;
    tipoIdentificacion: number;
    nombre: string;
    direccion?: string;
    regimenTributario: number;
    ciudad?: string;
    departamento?: string;
    contactos: Contacto[];
    url?: string;
    observacion?: string;
    categorias:number[];
    condicionPago: string;
    limiteRecepcionesParcialesOcm?: number;
    rutFile?: File;         // Optional file for RUT
    camaraFile?: File;      // Optional file for Cámara y Comercio
}

export interface DTO_SearchProveedor {
    id:string;
    nombre:string;
    categorias: number[];
    searchType: string; // "id" or "combined"
}

export const TIPO_BUSQUEDA = {
    ID: 'ID',
    NOMBRE_Y_CATEGORIA: 'NOMBRE_Y_CATEGORIA'
}
