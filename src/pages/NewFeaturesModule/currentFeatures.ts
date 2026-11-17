export type NewFeatureAccess =
    | { kind: "home" }
    | { kind: "area" }
    | {
        kind: "module"; module: string; tabId?: string; minLevel?: number; exactTab?: boolean; masterOnly?: boolean;
        requiredTabs?: readonly { tabId: string; minLevel: number; exactTab?: boolean }[];
    };

export type NewFeature = {
    id: string;
    revision: string;
    moduleLabel: string;
    modulePath: string;
    title: string;
    description: string;
    location: readonly string[];
    access: NewFeatureAccess;
    image?: { src: string; alt: string; caption?: string };
};

// Curated from frontend commits 72fb3fc, bc5b92f, aeff8a3 and 66c7772.
// Update ONLY on explicit user request, never automatically for a commit/deploy.
// Keep one active catalogue; preserve id/revision unless a new notice is requested.
export const currentFeatures: readonly NewFeature[] = [
    {
        id: "novedades-personalizadas",
        revision: "1",
        moduleLabel: "Inicio",
        modulePath: "/",
        title: "Lo nuevo, al alcance de tu mano",
        description: "Las mejoras que te sirven, en un solo lugar. Descubre qué cambió y dónde encontrarlo, según tus accesos.",
        location: ["Inicio", "Novedades"],
        access: { kind: "home" },
    },
    {
        id: "personal-permisos-laborales",
        revision: "1",
        moduleLabel: "Personal",
        modulePath: "/Personal",
        title: "Tus permisos laborales, en un solo lugar",
        description: "Prepara una solicitud, adjunta el soporte y revisa el expediente antes de firmar. En Mis solicitudes puedes consultar su estado e historial. Para enviarla, tu cuenta debe tener trabajador y jefe asignados.",
        location: ["Personal", "Permisos", "Mis solicitudes / Nueva solicitud"],
        access: { kind: "module", module: "PERSONAL_PLANTA", tabId: "PERMISOS", minLevel: 1, exactTab: true },
    },
    {
        id: "materiales-costo-inicial",
        revision: "1",
        moduleLabel: "Productos",
        modulePath: "/producto",
        title: "Registra el costo desde el primer día",
        description: "Al codificar un material, ya puedes indicar su costo unitario inicial en pesos colombianos, sin IVA y por unidad de inventario. Si aún no lo conoces, deja el valor en 0.",
        location: ["Productos", "Básicos", "Codificar material", "Costo unitario inicial"],
        access: { kind: "module", module: "PRODUCTOS", tabId: "CODIFICAR_MATERIAL", minLevel: 2 },
    },
    {
        id: "productos-edicion-desde-catalogo",
        revision: "1",
        moduleLabel: "Productos",
        modulePath: "/producto",
        title: "Del catálogo al diseño, sin perder tu búsqueda",
        description: "Modificaciones ahora está en Básicos. Abre el detalle de un terminado o semiterminado y usa Modificar en Process Designer v2 para ajustar sus insumos y procesos. Al volver al listado conservas la búsqueda, los filtros y la página.",
        location: ["Productos", "Básicos", "Modificaciones", "Ver Detalle", "Modificar en Process Designer v2"],
        access: {
            kind: "module", module: "PRODUCTOS", tabId: "MODIFICACIONES_PRODUCTOS", minLevel: 3,
            requiredTabs: [{ tabId: "PROCESS_DESIGNER", minLevel: 2 }],
        },
    },
    {
        id: "terminados-modelo-3d",
        revision: "1",
        moduleLabel: "Productos",
        modulePath: "/producto",
        title: "Explora una vista 3D de tu terminado",
        description: "El diseñador incorpora un asistente opcional para reconstruir y revisar un modelo a partir de fotografías. Primero guarda el terminado; después podrás guardar su modelo 3D por separado. Mantén la página abierta mientras trabajas.",
        location: ["Productos", "Process Designer", "Process Designer v2", "Modelo 3D del terminado"],
        access: { kind: "module", module: "PRODUCTOS", tabId: "PROCESS_DESIGNER", minLevel: 2 },
    },
    {
        id: "proveedores-registrar-plazo-negociado",
        revision: "1",
        moduleLabel: "Proveedores",
        modulePath: "/Proveedores",
        title: "Guarda el plazo acordado con tu proveedor",
        description: "Al registrar un proveedor, puedes indicar el plazo de entrega negociado en días calendario. Es opcional: déjalo vacío si aún no se acordó; 0 significa entrega el mismo día.",
        location: ["Proveedores", "Codificar Proveedor", "Lead time negociado (días calendario)"],
        access: { kind: "module", module: "PROVEEDORES", minLevel: 2 },
    },
    {
        id: "proveedores-consultar-plazo-negociado",
        revision: "1",
        moduleLabel: "Proveedores",
        modulePath: "/Proveedores",
        title: "El plazo de entrega, a la vista",
        description: "La consulta y el detalle del proveedor muestran su plazo de entrega negociado en días calendario. Cuando no se ha registrado, aparece como No definido para distinguirlo de una entrega el mismo día.",
        location: ["Proveedores", "Consultar Proveedores", "Detalle del proveedor"],
        access: { kind: "module", module: "PROVEEDORES", minLevel: 1 },
    },
    {
        id: "compras-plazo-proveedor",
        revision: "1",
        moduleLabel: "Compras",
        modulePath: "/compras",
        title: "Consulta el plazo antes de comprar",
        description: "Al seleccionar el proveedor de una orden de compra, su tarjeta muestra el plazo de entrega negociado. Si no se ha registrado, verás No definido. Así puedes revisar esta referencia antes de continuar con la orden.",
        location: ["Compras", "Crear OC-M", "Tarjeta del proveedor"],
        access: { kind: "module", module: "COMPRAS", tabId: "CREAR_OCM", minLevel: 1 },
    },
    {
        id: "areas-crear-alcance-ejecucion",
        revision: "1",
        moduleLabel: "Gestión de Áreas Operativas",
        modulePath: "/gestion_areas_operativas",
        title: "Define qué órdenes ejecutará cada área",
        description: "Al crear un área, elige si ejecutará órdenes de producción (OP), de fabricación (OF) o ambas. Esta elección es independiente de los planes MPS que el área puede consultar y de los productos que ve en ellos.",
        location: ["Gestión de Áreas Operativas", "Crear Area de Produccion", "Órdenes que ejecuta el área"],
        access: { kind: "module", module: "SEGUIMIENTO_PRODUCCION", tabId: "CREAR_AREA_PRODUCCION", minLevel: 1 },
    },
    {
        id: "areas-consultar-alcance-ejecucion",
        revision: "1",
        moduleLabel: "Gestión de Áreas Operativas",
        modulePath: "/gestion_areas_operativas",
        title: "Identifica las áreas que ejecutan OP y OF",
        description: "La nueva columna Ejecución indica qué órdenes atiende cada área. En Ver Detalle → Información puedes revisar y ajustar esta configuración. Los cambios aplican a nuevas órdenes; las existentes conservan su flujo.",
        location: ["Gestión de Áreas Operativas", "Consulta Areas Operativas", "Ver Detalle", "Información"],
        access: { kind: "module", module: "SEGUIMIENTO_PRODUCCION", tabId: "CONSULTA_AREAS_OPERATIVAS", minLevel: 1 },
    },
    {
        id: "areas-multiples-plantillas-despeje",
        revision: "1",
        moduleLabel: "Gestión de Áreas Operativas",
        modulePath: "/gestion_areas_operativas",
        title: "Varios formularios de despeje por área",
        description: "Configura varias plantillas de despeje para una misma área. Cada una conserva su propio borrador y versión vigente: publicar una versión de una plantilla mantiene vigentes las demás.",
        location: ["Gestión de Áreas Operativas", "Consulta Areas Operativas", "Ver Detalle", "Despeje"],
        access: { kind: "module", module: "SEGUIMIENTO_PRODUCCION", tabId: "CONSULTA_AREAS_OPERATIVAS", minLevel: 1 },
    },
    {
        id: "panel-operativo-conjunto-despejes",
        revision: "1",
        moduleLabel: "Panel de Área Operativa",
        modulePath: "/area-operativa",
        title: "Revisa todos los despejes antes de iniciar",
        description: "Cuando tu área exige despeje, verás los formularios requeridos y cuántos están listos. Puedes desplegarlos y guardar cada borrador. Completar los formularios no inicia la operación: confirma el inicio cuando todo esté listo.",
        location: ["Panel de Área Operativa", "Iniciar operación", "Formularios de despeje"],
        access: { kind: "area" },
    },
    {
        id: "bi-menu-simplificado",
        revision: "1",
        moduleLabel: "BI",
        modulePath: "/Bintelligence",
        title: "Un menú de BI más simple",
        description: "Las opciones Aprovisionamiento y Series De Tiempo y Proyecciones se retiraron del menú. Los informes disponibles continúan apareciendo según tus permisos de acceso.",
        location: ["BI", "Pestañas del módulo"],
        access: { kind: "module", module: "BINTELLIGENCE", minLevel: 1 },
    },
    {
        id: "asistente-movible-consultas",
        revision: "1",
        moduleLabel: "Asistente Exotic",
        modulePath: "/",
        title: "El asistente se acomoda a tu trabajo",
        description: "Arrastra el personaje hacia otra esquina para despejar tu pantalla, o usa Alt y las flechas al enfocarlo. También puedes preguntar sobre productos y materiales y revisar la consulta propuesta antes de ejecutarla. Esta etapa solo permite lectura.",
        location: ["Inicio", "Personaje del Asistente Exotic"],
        access: { kind: "module", module: "AGENT_ASSISTANT", tabId: "MAIN", minLevel: 1, exactTab: true },
    },
];
