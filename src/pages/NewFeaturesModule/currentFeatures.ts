import productosModificacionesGuia from "./assets/productos-modificaciones-guia.png";
import duracionNovedadesGuia from "./assets/novedades-duracion-directiva-guia.png";
import novedadesGuia from "./assets/novedades-personalizadas-guia.png";
import permisosGuia from "./assets/personal-permisos-laborales-guia.png";
import costoInicialGuia from "./assets/materiales-costo-inicial-guia.png";
import modelo3dGuia from "./assets/terminados-modelo-3d-guia.png";
import registrarPlazoGuia from "./assets/proveedores-registrar-plazo-negociado-guia.png";
import consultarPlazoGuia from "./assets/proveedores-consultar-plazo-negociado-guia.png";
import comprasPlazoGuia from "./assets/compras-plazo-proveedor-guia.png";
import crearAreaGuia from "./assets/areas-crear-alcance-ejecucion-guia.png";
import consultarAreaGuia from "./assets/areas-consultar-alcance-ejecucion-guia.png";
import plantillasGuia from "./assets/areas-multiples-plantillas-despeje-guia.png";
import conjuntoDespejesGuia from "./assets/panel-operativo-conjunto-despejes-guia.png";
import biGuia from "./assets/bi-menu-simplificado-guia.png";
import asistenteGuia from "./assets/asistente-movible-consultas-guia.png";

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

// Curated from frontend commits 72fb3fc, bc5b92f, aeff8a3 and 66c7772.
// Update ONLY on explicit user request, never automatically for a commit/deploy.
// Keep one active catalogue; preserve id/revision unless a new notice is requested.
export const currentFeatures: readonly NewFeature[] = [
    {
        id: "novedades-duracion-directiva",
        revision: "1",
        publishedAt: "2026-11-17T23:24:12Z",
        moduleLabel: "Directivas Super Master",
        modulePath: "/super_master_directives",
        title: "Decide cuántos días se muestra Nuevo",
        description: "En General puedes definir la duración máxima de los avisos: de 0 a 365 días desde la publicación de cada novedad. El valor inicial es 7; usa 0 para desactivar los indicadores. También se retiran antes cuando el usuario lee la novedad y entra al módulo. El carrusel sigue disponible para consulta.",
        location: ["Directivas Super Master", "General", "Directivas numéricas", "Duración de la notificación Nuevo"],
        access: { kind: "supermaster" },
        image: {
            src: duracionNovedadesGuia,
            alt: "Directivas Super Master: 1 duración de Nuevo con ejemplo de 14 días; 2 reglas de vigencia y valor 0; 3 Guardar cambios. Datos de demostración.",
            caption: "1 Define los días. 2 Revisa las reglas; 0 desactiva los indicadores. 3 Guarda los cambios. Guía anotada con datos de demostración.",
        },
    },
    {
        id: "novedades-personalizadas",
        revision: "1",
        publishedAt: "2026-11-17T00:00:00-05:00",
        moduleLabel: "Inicio",
        modulePath: "/",
        title: "Lo nuevo, al alcance de tu mano",
        description: "Las mejoras que te sirven, en un solo lugar. Descubre qué cambió y dónde encontrarlo, según tus accesos.",
        location: ["Inicio", "Novedades"],
        access: { kind: "home" },
        image: {
            src: novedadesGuia,
            alt: "Inicio: 1 botón Novedades; 2 etiqueta Nuevo en Productos. Datos de demostración.",
            caption: "1 Abre Novedades. 2 Las tarjetas señalan dónde hay mejoras. Guía anotada con datos de demostración.",
        },
    },
    {
        id: "personal-permisos-laborales",
        revision: "1",
        publishedAt: "2026-11-17T00:00:00-05:00",
        moduleLabel: "Gestión Humana",
        modulePath: "/GestionHumana",
        title: "Tus permisos laborales, en un solo lugar",
        description: "Prepara una solicitud, adjunta el soporte y revisa el expediente antes de firmar. En Mis solicitudes puedes consultar su estado e historial. Para enviarla, tu cuenta debe tener trabajador y jefe asignados.",
        location: ["Gestión Humana", "Permisos", "Mis solicitudes / Nueva solicitud"],
        access: { kind: "module", module: "PERSONAL_PLANTA", tabId: "PERMISOS", minLevel: 1, exactTab: true },
        image: {
            src: permisosGuia,
            alt: "Permisos laborales: 1 Nueva solicitud, 2 Mis solicitudes y 3 Ver solicitud. Datos ficticios.",
            caption: "1 Crea una solicitud. 2 Consulta las tuyas. 3 Abre su expediente. Guía anotada con datos de demostración.",
        },
    },
    {
        id: "materiales-costo-inicial",
        revision: "1",
        publishedAt: "2026-11-17T00:00:00-05:00",
        moduleLabel: "Productos",
        modulePath: "/producto",
        title: "Registra el costo desde el primer día",
        description: "Al codificar un material, ya puedes indicar su costo unitario inicial en pesos colombianos, sin IVA y por unidad de inventario. Si aún no lo conoces, deja el valor en 0.",
        location: ["Productos", "Básicos", "Codificar material", "Costo unitario inicial"],
        access: { kind: "module", module: "PRODUCTOS", tabId: "CODIFICAR_MATERIAL", minLevel: 2 },
        image: {
            src: costoInicialGuia,
            alt: "Codificar material: 1 costo unitario inicial con ejemplo de 2500 COP por KG; 2 ayuda de unidades y valor desconocido.",
            caption: "1 Indica el costo inicial sin IVA, en la unidad mostrada. 2 Si no lo conoces, usa 0. Ejemplo de demostración.",
        },
    },
    {
        id: "productos-edicion-desde-catalogo",
        revision: "1",
        publishedAt: "2026-11-17T00:00:00-05:00",
        moduleLabel: "Productos",
        modulePath: "/producto",
        title: "Del catálogo al diseño, sin perder tu búsqueda",
        description: "Modificaciones ahora está en Básicos. Abre el detalle de un terminado o semiterminado y usa Modificar en Process Designer v2 para ajustar sus insumos y procesos. Al volver al listado conservas la búsqueda, los filtros y la página.",
        location: ["Productos", "Básicos", "Modificaciones", "Ver Detalle", "Modificar en Process Designer v2"],
        access: {
            kind: "module", module: "PRODUCTOS", tabId: "MODIFICACIONES_PRODUCTOS", minLevel: 3,
            requiredTabs: [{ tabId: "PROCESS_DESIGNER", minLevel: 2 }],
        },
        image: {
            src: productosModificacionesGuia,
            alt: "Guía de Productos: 1 señala Básicos, 2 Modificaciones y 3 el botón Modificar en Process Designer v2. Datos de demostración.",
            caption: "1 Básicos → 2 Modificaciones → Ver Detalle → 3 Modificar en Process Designer v2. Guía anotada basada en una captura con datos de demostración.",
        },
    },
    {
        id: "terminados-modelo-3d",
        revision: "1",
        publishedAt: "2026-11-17T00:00:00-05:00",
        moduleLabel: "Productos",
        modulePath: "/producto",
        title: "Explora una vista 3D de tu terminado",
        description: "El diseñador incorpora un asistente opcional para reconstruir y revisar un modelo a partir de fotografías. Primero guarda el terminado; después podrás guardar su modelo 3D por separado. Mantén la página abierta mientras trabajas.",
        location: ["Productos", "Process Designer", "Process Designer v2", "Modelo 3D del terminado"],
        access: { kind: "module", module: "PRODUCTOS", tabId: "PROCESS_DESIGNER", minLevel: 2 },
        image: {
            src: modelo3dGuia,
            alt: "Asistente 3D: 1 sección opcional, 2 Seleccionar fotografías y 3 Reconstruir modelo, todavía deshabilitado sin fotografías.",
            caption: "1 Asistente opcional. 2 Agrega fotografías. 3 Reconstruye cuando estén preparadas. Vista inicial de demostración, sin modelo calculado.",
        },
    },
    {
        id: "proveedores-registrar-plazo-negociado",
        revision: "1",
        publishedAt: "2026-11-17T00:00:00-05:00",
        moduleLabel: "Proveedores",
        modulePath: "/Proveedores",
        title: "Guarda el plazo acordado con tu proveedor",
        description: "Al registrar un proveedor, puedes indicar el plazo de entrega negociado en días calendario. Es opcional: déjalo vacío si aún no se acordó; 0 significa entrega el mismo día.",
        location: ["Proveedores", "Codificar Proveedor", "Lead time negociado (días calendario)"],
        access: { kind: "module", module: "PROVEEDORES", minLevel: 2 },
        image: {
            src: registrarPlazoGuia,
            alt: "Codificar proveedor: 1 plazo negociado con ejemplo de 7 días calendario; 2 ayuda del campo opcional.",
            caption: "1 Registra los días calendario acordados. 2 Es opcional; 0 significa entrega el mismo día. Ejemplo de demostración.",
        },
    },
    {
        id: "proveedores-consultar-plazo-negociado",
        revision: "1",
        publishedAt: "2026-11-17T00:00:00-05:00",
        moduleLabel: "Proveedores",
        modulePath: "/Proveedores",
        title: "El plazo de entrega, a la vista",
        description: "La consulta y el detalle del proveedor muestran su plazo de entrega negociado en días calendario. Cuando no se ha registrado, aparece como No definido para distinguirlo de una entrega el mismo día.",
        location: ["Proveedores", "Consultar Proveedores", "Detalle del proveedor"],
        access: { kind: "module", module: "PROVEEDORES", minLevel: 1 },
        image: {
            src: consultarPlazoGuia,
            alt: "Detalle de un proveedor ficticio: 1 Lead time negociado, 7 días calendario.",
            caption: "1 Consulta el plazo negociado en el detalle del proveedor. Guía anotada con datos de demostración.",
        },
    },
    {
        id: "compras-plazo-proveedor",
        revision: "1",
        publishedAt: "2026-11-17T00:00:00-05:00",
        moduleLabel: "Compras",
        modulePath: "/compras",
        title: "Consulta el plazo antes de comprar",
        description: "Al seleccionar el proveedor de una orden de compra, su tarjeta muestra el plazo de entrega negociado. Si no se ha registrado, verás No definido. Así puedes revisar esta referencia antes de continuar con la orden.",
        location: ["Compras", "Crear OC-M", "Tarjeta del proveedor"],
        access: { kind: "module", module: "COMPRAS", tabId: "CREAR_OCM", minLevel: 1 },
        image: {
            src: comprasPlazoGuia,
            alt: "Crear OC-M: 1 proveedor seleccionado y 2 su plazo negociado de 7 días calendario. Datos ficticios.",
            caption: "1 Revisa el proveedor seleccionado. 2 Consulta su plazo antes de continuar con la compra. Ejemplo de demostración.",
        },
    },
    {
        id: "areas-crear-alcance-ejecucion",
        revision: "1",
        publishedAt: "2026-11-17T00:00:00-05:00",
        moduleLabel: "Gestión de Áreas Operativas",
        modulePath: "/gestion_areas_operativas",
        title: "Define qué órdenes ejecutará cada área",
        description: "Al crear un área, elige si ejecutará órdenes de producción (OP), de fabricación (OF) o ambas. Esta elección es independiente de los planes MPS que el área puede consultar y de los productos que ve en ellos.",
        location: ["Gestión de Áreas Operativas", "Crear Area de Produccion", "Órdenes que ejecuta el área"],
        access: { kind: "module", module: "SEGUIMIENTO_PRODUCCION", tabId: "CREAR_AREA_PRODUCCION", minLevel: 1 },
        image: {
            src: crearAreaGuia,
            alt: "Crear área: 1 órdenes que ejecuta el área, Solo OF en el ejemplo; 2 consulta de MPS independiente.",
            caption: "1 Define qué órdenes ejecutará. 2 Configura por separado qué planificación consulta. Guía anotada de demostración.",
        },
    },
    {
        id: "areas-consultar-alcance-ejecucion",
        revision: "1",
        publishedAt: "2026-11-17T00:00:00-05:00",
        moduleLabel: "Gestión de Áreas Operativas",
        modulePath: "/gestion_areas_operativas",
        title: "Identifica las áreas que ejecutan OP y OF",
        description: "La nueva columna Ejecución indica qué órdenes atiende cada área. En Ver Detalle → Información puedes revisar y ajustar esta configuración. Los cambios aplican a nuevas órdenes; las existentes conservan su flujo.",
        location: ["Gestión de Áreas Operativas", "Consulta Areas Operativas", "Ver Detalle", "Información"],
        access: { kind: "module", module: "SEGUIMIENTO_PRODUCCION", tabId: "CONSULTA_AREAS_OPERATIVAS", minLevel: 1 },
        image: {
            src: consultarAreaGuia,
            alt: "Consulta de áreas: 1 columna Ejecución con Solo OF, Solo OP y OP y OF; 2 Ver Detalle. Datos ficticios.",
            caption: "1 Identifica las órdenes que atiende cada área. 2 Abre su detalle para revisar la configuración. Ejemplo de demostración.",
        },
    },
    {
        id: "areas-multiples-plantillas-despeje",
        revision: "1",
        publishedAt: "2026-11-17T00:00:00-05:00",
        moduleLabel: "Gestión de Áreas Operativas",
        modulePath: "/gestion_areas_operativas",
        title: "Varios formularios de despeje por área",
        description: "Configura varias plantillas de despeje para una misma área. Cada una conserva su propio borrador y versión vigente: publicar una versión de una plantilla mantiene vigentes las demás.",
        location: ["Gestión de Áreas Operativas", "Consulta Areas Operativas", "Ver Detalle", "Despeje"],
        access: { kind: "module", module: "SEGUIMIENTO_PRODUCCION", tabId: "CONSULTA_AREAS_OPERATIVAS", minLevel: 1 },
        image: {
            src: plantillasGuia,
            alt: "Dos plantillas independientes: 1 Limpieza y preparación vigente v1; 2 Identificación y materiales vigente v2. Datos ficticios.",
            caption: "1 y 2 Cada plantilla mantiene su propia versión vigente. Publicar una no retira la otra. Ejemplo de demostración.",
        },
    },
    {
        id: "panel-operativo-conjunto-despejes",
        revision: "1",
        publishedAt: "2026-11-17T00:00:00-05:00",
        moduleLabel: "Panel de Área Operativa",
        modulePath: "/area-operativa",
        title: "Revisa todos los despejes antes de iniciar",
        description: "Cuando tu área exige despeje, verás los formularios requeridos y cuántos están listos. Puedes desplegarlos y guardar cada borrador. Completar los formularios no inicia la operación: confirma el inicio cuando todo esté listo.",
        location: ["Panel de Área Operativa", "Iniciar operación", "Formularios de despeje"],
        access: { kind: "area" },
        image: {
            src: conjuntoDespejesGuia,
            alt: "Conjunto de despejes: 1 uno de dos listo; 2 formulario aprobado; 3 formulario en borrador pendiente. Datos ficticios.",
            caption: "1 Revisa cuántos están listos. 2 Aprobado. 3 Pendiente. Completar los formularios no inicia la operación. Ejemplo de demostración.",
        },
    },
    {
        id: "bi-menu-simplificado",
        revision: "1",
        publishedAt: "2026-11-17T00:00:00-05:00",
        moduleLabel: "BI",
        modulePath: "/Bintelligence",
        title: "Un menú de BI más simple",
        description: "Las opciones Aprovisionamiento y Series De Tiempo y Proyecciones se retiraron del menú. Los informes disponibles continúan apareciendo según tus permisos de acceso.",
        location: ["BI", "Pestañas del módulo"],
        access: { kind: "module", module: "BINTELLIGENCE", minLevel: 1 },
        image: {
            src: biGuia,
            alt: "BI: 1 menú con Informes Diarios, Informes Globales, Trazabilidad y Personal en una cuenta de demostración.",
            caption: "1 Menú actual de BI. Las opciones que ves dependen de tus permisos. Guía anotada en una cuenta de demostración.",
        },
    },
    {
        id: "asistente-movible-consultas",
        revision: "1",
        publishedAt: "2026-11-17T00:00:00-05:00",
        moduleLabel: "Asistente Exotic",
        modulePath: "/",
        title: "El asistente se acomoda a tu trabajo",
        description: "Arrastra el personaje hacia otra esquina para despejar tu pantalla, o usa Alt y las flechas al enfocarlo. También puedes preguntar sobre productos y materiales y revisar la consulta propuesta antes de ejecutarla. Esta etapa solo permite lectura.",
        location: ["Inicio", "Personaje del Asistente Exotic"],
        access: { kind: "module", module: "AGENT_ASSISTANT", tabId: "MAIN", minLevel: 1, exactTab: true },
        image: {
            src: asistenteGuia,
            alt: "Asistente Exotic: 1 personaje que puedes mover, 2 campo de pregunta y 3 alcance de solo lectura. Vista previa sin conexión.",
            caption: "1 Mueve el personaje a otra esquina. 2 Escribe tu pregunta. 3 Solo permite lectura. Vista previa de demostración sin conexión.",
        },
    },
];
