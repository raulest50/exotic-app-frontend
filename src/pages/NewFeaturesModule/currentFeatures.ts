import visitantesGuia from "./assets/visitantes-filtros-motivo-guia.png";
import semiterminadosAreaGuia from "./assets/areas-semiterminados-manufacturados-guia.png";
import recursosAreaGuia from "./assets/areas-recursos-produccion-guia.png";
import loteOfGuia from "./assets/semiterminados-lote-of-guia.png";
import reordenGuia from "./assets/reorden-seguimiento-correo-guia.png";

export type NewFeatureAccess =
    | { kind: "home" }
    | { kind: "area" }
    | { kind: "supermaster" }
    | {
        kind: "module"; module: string; tabId?: string; minLevel?: number; exactTab?: boolean; masterOnly?: boolean;
        requiredTabs?: readonly { tabId: string; minLevel: number; exactTab?: boolean }[];
    };

export type NewFeature = {
    id: string;
    revision: string;
    publishedAt: string;
    moduleLabel: string;
    modulePath: string;
    title: string;
    description: string;
    location: readonly string[];
    access: NewFeatureAccess;
    image?: { src: string; alt: string; caption?: string };
};

// Active cut after the presentation on 2026-11-19 (America/Bogota).
// Curated from frontend 9259494 and backend d0520bc; never restore presented notices.
// Update ONLY on explicit user request, never automatically for a commit/deploy.
// Keep one active catalogue; preserve id/revision unless a new notice is requested.
export const currentFeatures: readonly NewFeature[] = [
    {
        id: "visitantes-filtros-motivo",
        revision: "1",
        publishedAt: "2026-11-19T17:27:13-05:00",
        moduleLabel: "Gestión Humana",
        modulePath: "/GestionHumana",
        title: "Encuentra la visita que necesitas",
        description: "Busca visitas por fecha, horario y nombre, y ordena las llegadas. El formulario de ingreso ahora pide el motivo de la visita, que también verás en el listado. La opción Otros permite describir un motivo diferente.",
        location: ["Gestión Humana", "Control visitantes", "Visitas registradas → Aplicar filtros / Abrir formulario"],
        access: { kind: "module", module: "PERSONAL_PLANTA", tabId: "CONTROL_VISITANTES", minLevel: 1, exactTab: true },
        image: {
            src: visitantesGuia,
            alt: "Control visitantes: 1 filtros de fecha, horario y nombre; 2 Aplicar filtros; 3 motivo de la visita en el listado. Datos ficticios.",
            caption: "1 Prepara la búsqueda. 2 Aplica los filtros. 3 Consulta el motivo registrado. Guía con datos de demostración.",
        },
    },
    {
        id: "areas-semiterminados-manufacturados",
        revision: "1",
        publishedAt: "2026-11-19T17:27:13-05:00",
        moduleLabel: "Gestión de Áreas Operativas",
        modulePath: "/gestion_areas_operativas",
        title: "Lo que fabrica cada área, en un solo lugar",
        description: "Busca semiterminados por nombre o código, agrégalos o retíralos y guarda cuáles fabrica cada área. Puedes asociar productos con y sin orden de fabricación propia. En Almacén General, estas asociaciones son de solo lectura.",
        location: ["Gestión de Áreas Operativas", "Consulta Áreas Operativas", "Ver Detalle", "Semiterminados", "Guardar asociaciones"],
        access: { kind: "module", module: "SEGUIMIENTO_PRODUCCION", tabId: "CONSULTA_AREAS_OPERATIVAS", minLevel: 1 },
        image: {
            src: semiterminadosAreaGuia,
            alt: "Detalle del área: 1 pestaña Semiterminados; 2 buscar y agregar productos; 3 Guardar asociaciones, deshabilitado cuando no hay cambios. Datos ficticios.",
            caption: "1 Abre Semiterminados. 2 Busca y agrega. 3 Guarda cuando hayas realizado cambios. Guía con datos de demostración.",
        },
    },
    {
        id: "areas-recursos-produccion",
        revision: "1",
        publishedAt: "2026-11-19T17:27:13-05:00",
        moduleLabel: "Gestión de Áreas Operativas",
        modulePath: "/gestion_areas_operativas",
        title: "Organiza los recursos de cada área",
        description: "Busca y asocia los tipos de recursos que puede utilizar el área. Un mismo recurso puede estar vinculado a varias áreas; esta lista no reserva equipos ni capacidad. Guarda los cambios con Guardar asociaciones. Almacén General es de solo lectura.",
        location: ["Gestión de Áreas Operativas", "Consulta Áreas Operativas", "Ver Detalle", "Recursos", "Guardar asociaciones"],
        access: { kind: "module", module: "SEGUIMIENTO_PRODUCCION", tabId: "CONSULTA_AREAS_OPERATIVAS", minLevel: 1 },
        image: {
            src: recursosAreaGuia,
            alt: "Detalle del área: 1 pestaña Recursos; 2 buscar y agregar tipos de recursos; 3 Guardar asociaciones, deshabilitado sin cambios. Datos ficticios.",
            caption: "1 Abre Recursos. 2 Busca y agrega tipos de recursos. 3 Guarda los cambios. Guía con datos de demostración.",
        },
    },
    {
        id: "semiterminados-lote-of",
        revision: "1",
        publishedAt: "2026-11-19T17:27:13-05:00",
        moduleLabel: "Productos",
        modulePath: "/producto",
        title: "Guarda el tamaño habitual de cada tanda",
        description: "Si el semiterminado requiere orden de fabricación, puedes registrar su tamaño estándar de lote OF en la unidad del producto. Es opcional, admite hasta cuatro decimales y se guarda como referencia independiente de la cantidad de salida de la receta.",
        location: ["Productos", "Process Designer", "Process Designer v2", "Datos del producto", "Configuración", "Tamaño estándar de lote OF"],
        access: { kind: "module", module: "PRODUCTOS", tabId: "PROCESS_DESIGNER", minLevel: 2 },
        image: {
            src: loteOfGuia,
            alt: "Datos del semiterminado: 1 Aplica para Orden Fabricacion; 2 Tamaño estándar de lote OF con ejemplo de 100 KG y ayuda de cuatro decimales. Datos ficticios.",
            caption: "1 El semiterminado debe aplicar para OF. 2 Indica su cantidad nominal por tanda. Guía con datos de demostración.",
        },
    },
    {
        id: "reorden-seguimiento-correo",
        revision: "1",
        publishedAt: "2026-11-19T17:27:13-05:00",
        moduleLabel: "Directivas Super Master",
        modulePath: "/super_master_directives",
        title: "Anticipa el seguimiento al proveedor",
        description: "Para materiales en su punto de reorden o por debajo, el correo separa las órdenes pendientes en seguimiento y con plazo superado. Ajusta cuándo empieza el seguimiento anticipado con el porcentaje del plazo negociado y el plazo mínimo del proveedor; inicialmente 80 % y 10 días. Requiere correo habilitado y destinatarios configurados.",
        location: ["Directivas Super Master", "General", "Directivas numéricas", "Correo de reorden: inicio del seguimiento (%) / plazo mínimo del proveedor (días)"],
        access: { kind: "supermaster" },
        image: {
            src: reordenGuia,
            alt: "Directivas numéricas: 1 porcentaje inicial de seguimiento, ejemplo 80; 2 plazo mínimo del proveedor, ejemplo 10 días; 3 Guardar cambios. Vista de demostración.",
            caption: "1 Ajusta el porcentaje. 2 Define el plazo mínimo para seguimiento anticipado. 3 Guarda los cambios. Valores iniciales de demostración.",
        },
    },
];
