import visitantesGuia from "./assets/visitantes-filtros-motivo-guia.png";
import semiterminadosAreaGuia from "./assets/areas-semiterminados-manufacturados-guia.png";
import recursosAreaGuia from "./assets/areas-recursos-produccion-guia.png";
import loteOfGuia from "./assets/semiterminados-lote-of-guia.png";
import reordenGuia from "./assets/reorden-seguimiento-correo-guia.png";
import permisosEspacioGuia from "./assets/permisos-espacio-propio-guia.png";
import aprobacionesGuia from "./assets/aprobaciones-bandeja-asignadas-guia.png";
import puntosReordenGuia from "./assets/puntos-reorden-calculo-guia.png";
import designerRecursosGuia from "./assets/designer-recursos-operacion-guia.png";
import codigoEquipoGuia from "./assets/recursos-codigo-equipo-guia.png";
import areaRegistroGuia from "./assets/areas-equipo-reporte-guia.png";
import loteAutomaticoGuia from "./assets/of-lote-automatico-guia.png";
import identificacionLoteGuia from "./assets/of-identificacion-lote-guia.png";
import reporteEtapaGuia from "./assets/etapas-cantidades-observadas-guia.png";
import consultaEtapasGuia from "./assets/produccion-observaciones-etapas-guia.png";
import fechaLoteGuia from "./assets/directivas-fecha-lote-of-guia.png";

export type NewFeatureAccess =
    | { kind: "home" }
    | { kind: "area"; requiresOf?: boolean }
    | { kind: "supermaster" }
    | {
        kind: "module"; module: string; tabId?: string; minLevel?: number; exactTab?: boolean; masterOnly?: boolean; requiresBatchRecord?: boolean;
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
// Reviewed through frontend 34c3a10 / backend 1d8a351 and local work on 2026-11-20.
// Never restore presented notices; local developments must ship with this catalogue.
// Update ONLY on explicit user request, never automatically for a commit/deploy.
// Keep one active catalogue; preserve id/revision unless a new notice is requested.
export const currentFeatures: readonly NewFeature[] = [
    {
        id: "puntos-reorden-calculo",
        revision: "1",
        publishedAt: "2026-11-20T15:50:00-05:00",
        moduleLabel: "Compras",
        modulePath: "/compras",
        title: "Calcula y revisa tus puntos de reorden",
        description: "Prepara una propuesta con el consumo registrado, el plazo del proveedor y un porcentaje de seguridad. Excluye días atípicos y revisa los materiales y proveedores. Con nivel 2 puedes aplicar los valores tras dos confirmaciones y descargar el comprobante PDF; calcular no modifica el inventario ni los umbrales.",
        location: ["Compras", "Puntos de reorden", "Configurar y seleccionar", "Revisar y confirmar", "Resultado y PDF"],
        access: { kind: "module", module: "COMPRAS", tabId: "PUNTOS_REORDEN", minLevel: 1, exactTab: true },
        image: {
            src: puntosReordenGuia,
            alt: "Propuesta de reorden: 1 materiales seleccionados; 2 comparación PR actual y nuevo; 3 Continuar con 2 materiales. Datos ficticios, sin aplicar valores.",
            caption: "1 Selecciona los materiales. 2 Compara los umbrales. 3 Con nivel 2, continúa a las confirmaciones. Guía de demostración sin cambios guardados.",
        },
    },
    {
        id: "designer-recursos-operacion",
        revision: "1",
        publishedAt: "2026-11-20T15:50:00-05:00",
        moduleLabel: "Productos",
        modulePath: "/producto",
        title: "Prepara los recursos de cada operación OF",
        description: "En un semiterminado que requiere OF, selecciona una operación y elige los tipos de recurso previstos entre los asociados a su área. Aplica la selección al nodo y guarda el producto. Una etapa manual puede quedar sin recursos; esta selección no asigna equipos físicos ni reserva capacidad.",
        location: ["Productos", "Process Designer", "Process Designer v2", "Seleccionar operación", "Recursos previstos OF"],
        access: { kind: "module", module: "PRODUCTOS", tabId: "PROCESS_DESIGNER", minLevel: 2 },
        image: {
            src: designerRecursosGuia,
            alt: "Recursos previstos para la operación: 1 proceso y área; 2 Mezcladores seleccionado y Balanzas sin seleccionar; 3 Aplicar al nodo. Datos ficticios.",
            caption: "1 Revisa la operación y su área. 2 Elige tipos de recurso. 3 Aplica al nodo; después guarda el producto. Guía con datos de demostración.",
        },
    },
    {
        id: "recursos-codigo-equipo",
        revision: "1",
        publishedAt: "2026-11-20T15:50:00-05:00",
        moduleLabel: "Productos",
        modulePath: "/producto",
        title: "Dale un código al equipo de fabricación",
        description: "Los activos asociados a un recurso tienen ahora Código de lote OF. Para identificar el equipo en un lote, usa un código único de dos dígitos, incluidos los ceros iniciales: por ejemplo, 01. Guardar código aplica ese dato inmediatamente, sin esperar a guardar el resto del recurso.",
        location: ["Productos", "Process Designer", "Consultar recursos", "Ver Detalles", "Editar", "Código de lote OF", "Guardar código"],
        access: { kind: "module", module: "PRODUCTOS", tabId: "CONSULTAR_RECURSOS_PRODUCCION", minLevel: 2 },
        image: {
            src: codigoEquipoGuia,
            alt: "Activos asociados al recurso: 1 código del equipo 01; 2 Guardar código deshabilitado porque no hay cambios. Equipo ficticio.",
            caption: "1 Indica dos dígitos para identificar lotes OF. 2 Guarda el código al cambiarlo; el guardado es inmediato. Ejemplo sin cambios pendientes.",
        },
    },
    {
        id: "areas-equipo-reporte",
        revision: "1",
        publishedAt: "2026-11-20T15:50:00-05:00",
        moduleLabel: "Gestión de Áreas Operativas",
        modulePath: "/gestion_areas_operativas",
        title: "Define qué registra el área al completar",
        description: "En Información puedes exigir equipo al completar la salida de una OF. En Semiterminados puedes exigir las cantidades observadas por producto al completar la etapa. Guarda con Guardar datos del área. Aplica a nuevas órdenes; las existentes conservan su configuración. El equipo no aplica a Solo OP y Almacén General es de solo lectura.",
        location: ["Gestión de Áreas Operativas", "Consulta Áreas Operativas", "Ver Detalle", "Editar área", "Información / Semiterminados", "Guardar datos del área"],
        access: { kind: "module", module: "SEGUIMIENTO_PRODUCCION", tabId: "CONSULTA_AREAS_OPERATIVAS", minLevel: 1 },
        image: {
            src: areaRegistroGuia,
            alt: "Dos vistas distintas del área: 1 Información, exigir equipo OF; 2 Semiterminados, exigir cantidades observadas; 3 Guardar datos del área, deshabilitado sin cambios. Datos ficticios.",
            caption: "1 Equipo en Información. 2 Cantidades en Semiterminados. 3 Guarda con Guardar datos del área, cuando haya cambios. Son dos pestañas distintas.",
        },
    },
    {
        id: "of-lote-automatico",
        revision: "1",
        publishedAt: "2026-11-20T15:50:00-05:00",
        moduleLabel: "Producción",
        modulePath: "/produccion",
        title: "Crea tu OF con numeración automática",
        description: "Al crear una OF puedes dejar vacío Lote manual (opcional) para reservar su numeración automática. El lote se identifica como Provisional hasta completar la salida. Si necesitas un lote manual, escríbelo en ese campo. La reserva del número no asigna equipos ni capacidad.",
        location: ["Producción", "Gestión de órdenes", "Órdenes de fabricación", "Lote manual (opcional)"],
        access: { kind: "module", module: "PRODUCCION", tabId: "CREAR_ORDEN_FABRICACION", minLevel: 2, exactTab: true, requiresBatchRecord: true },
        image: {
            src: loteAutomaticoGuia,
            alt: "Órdenes de fabricación: 1 Lote manual opcional vacío con ayuda de numeración automática; 2 una OF ficticia ya listada con etiqueta Provisional. No se creó una orden.",
            caption: "1 Déjalo vacío para numeración automática o escribe un lote manual. 2 Provisional identifica el número pendiente de confirmar en la salida. Datos de demostración.",
        },
    },
    {
        id: "of-identificacion-lote",
        revision: "1",
        publishedAt: "2026-11-20T15:50:00-05:00",
        moduleLabel: "Panel Operativo",
        modulePath: "/area-operativa",
        title: "Confirma el equipo y el lote de la OF",
        description: "Al completar la operación de salida de una OF, elige el equipo utilizado y revisa el lote previsto antes de guardar. El área puede exigir un equipo con código válido de dos dígitos. En lotes automáticos, seleccionarlo permite incorporar equipo y fecha; si es opcional y lo omites, se conserva el número actual. Los lotes manuales no se renumeran.",
        location: ["Panel Operativo", "Tablero operativo", "OF", "Completar operación de salida", "Equipo utilizado para fabricación", "Lote previsto"],
        access: { kind: "area", requiresOf: true },
        image: {
            src: identificacionLoteGuia,
            alt: "Completar OF: 1 equipo Mezcladora de demostración con código 01; 2 lote previsto y fecha. Cantidad de ejemplo 100; operación sin confirmar.",
            caption: "1 Selecciona el equipo utilizado. 2 Revisa el lote previsto antes de confirmar. La guía muestra una vista previa con datos ficticios, sin guardar el cierre.",
        },
    },
    {
        id: "etapas-cantidades-observadas",
        revision: "1",
        publishedAt: "2026-11-20T15:50:00-05:00",
        moduleLabel: "Panel Operativo",
        modulePath: "/area-operativa",
        title: "Deja registrada la cantidad de cada etapa",
        description: "Cuando la orden exige reporte, Completar solicita la cantidad observada de cada producto de referencia, en su unidad y con hasta cuatro decimales. En la salida se reutiliza la cantidad final del producto final. Estas observaciones no generan ingreso a inventario ni se suman a la producción final de la orden.",
        location: ["Panel Operativo", "Tablero operativo", "Completar", "Cantidad observada en esta etapa"],
        access: { kind: "area" },
        image: {
            src: reporteEtapaGuia,
            alt: "Cantidad observada en esta etapa: 1 producto de referencia y unidad KG; 2 cantidad 25.5 y ayuda de hasta cuatro decimales. Datos ficticios.",
            caption: "1 Revisa el producto y su unidad. 2 Registra la cantidad observada, mayor que cero. Componente real con datos de demostración, sin completar una orden.",
        },
    },
    {
        id: "produccion-observaciones-etapas",
        revision: "1",
        publishedAt: "2026-11-20T15:50:00-05:00",
        moduleLabel: "Producción",
        modulePath: "/produccion",
        title: "Consulta lo reportado en cada etapa",
        description: "El detalle de la operación muestra las cantidades observadas por producto, su unidad, responsable y fecha. Si se han reemplazado reportes, abre Reportes anteriores para consultar su historial. Son observaciones de la etapa, independientes de la cantidad final y de los movimientos de inventario.",
        location: ["Producción", "Seguimiento y trazabilidad", "Monitoreo operativo", "Detalle de la operación", "Cantidad observada en esta etapa", "Reportes anteriores"],
        access: { kind: "module", module: "PRODUCCION", tabId: "MONITOREAR_AREAS_OPERATIVAS", minLevel: 1 },
        image: {
            src: consultaEtapasGuia,
            alt: "Resumen de observaciones: 1 reporte vigente de 25.5 KG con fecha y usuario; 2 Reportes anteriores desplegado con 24 KG. Datos ficticios.",
            caption: "1 Consulta el reporte vigente. 2 Despliega los anteriores si existen. Componente real del detalle, con datos de demostración.",
        },
    },
    {
        id: "directivas-fecha-lote-of",
        revision: "1",
        publishedAt: "2026-11-20T15:50:00-05:00",
        moduleLabel: "Directivas Super Master",
        modulePath: "/super_master_directives",
        title: "Elige la fecha que identifica el lote OF",
        description: "Fecha de fabricación del lote OF permite escoger el inicio real o la terminación real de la orden; inicialmente usa terminación. El criterio queda fijado al emitir nuevas OF. Las existentes conservan su criterio y los lotes manuales no se renumeran. La vista previa de terminación se confirma con la fecha real al guardar el cierre.",
        location: ["Directivas Super Master", "Producción", "Fecha de fabricación del lote OF", "Guardar cambios"],
        access: { kind: "supermaster" },
        image: {
            src: fechaLoteGuia,
            alt: "Directiva de producción: 1 Fecha de fabricación del lote OF; 2 selector en Terminación real de la OF. Valor inicial de demostración.",
            caption: "1 Localiza la directiva. 2 Escoge inicio o terminación real y guarda los cambios. El criterio se fija para nuevas OF.",
        },
    },
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
    {
        id: "permisos-espacio-propio",
        revision: "1",
        publishedAt: "2026-11-19T19:39:53-05:00",
        moduleLabel: "Gestión Humana",
        modulePath: "/GestionHumana",
        title: "Tus solicitudes tienen su propio espacio",
        description: "Permisos reúne ahora únicamente tus solicitudes. La revisión de solicitudes de otras personas pasa a Aprobaciones, con acceso independiente. En tus borradores y solicitudes pendientes, la acción para retirarlas se llama Retirar solicitud.",
        location: ["Gestión Humana", "Permisos", "Mis solicitudes", "Ver solicitud"],
        access: { kind: "module", module: "PERSONAL_PLANTA", tabId: "PERMISOS", minLevel: 1, exactTab: true },
        image: {
            src: permisosEspacioGuia,
            alt: "Gestión Humana: 1 pestaña Permisos; 2 Mis solicitudes; 3 Ver solicitud en un borrador propio. Datos ficticios.",
            caption: "1 Entra a Permisos. 2 Consulta tus solicitudes. 3 Abre su expediente. Guía con datos de demostración.",
        },
    },
    {
        id: "aprobaciones-bandeja-asignadas",
        revision: "1",
        publishedAt: "2026-11-19T19:39:53-05:00",
        moduleLabel: "Gestión Humana",
        modulePath: "/GestionHumana",
        title: "La revisión ahora está en Aprobaciones",
        description: "Consulta las solicitudes pendientes que tienes asignadas desde una bandeja independiente de tus solicitudes personales. Abre cada expediente con Ver solicitud. Las acciones para resolverlo dependen de tu autorización y de que seas el jefe asignado, distinto del solicitante.",
        location: ["Gestión Humana", "Aprobaciones", "Pendientes asignadas", "Ver solicitud"],
        access: { kind: "module", module: "PERSONAL_PLANTA", tabId: "APROBACIONES", minLevel: 1, exactTab: true },
        image: {
            src: aprobacionesGuia,
            alt: "Gestión Humana: 1 pestaña Aprobaciones; 2 Pendientes asignadas; 3 Ver solicitud. Perfil de consulta, sin botones de decisión. Datos ficticios.",
            caption: "1 Abre Aprobaciones. 2 Revisa tus pendientes asignadas. 3 Consulta el expediente. Guía con datos de demostración.",
        },
    },
];
