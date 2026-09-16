import { Modulo } from "../types.tsx";

export type AccessLevelDocumentation = {
    nivel: number;
    titulo: string;
    permite: readonly string[];
    noIncluye?: readonly string[];
};

export type AccessTabDocumentation = {
    tabId: string;
    label: string;
    resumen: string;
    niveles: readonly AccessLevelDocumentation[];
    condiciones?: readonly string[];
    observaciones?: readonly string[];
};

export type AccessModuleDocumentation = {
    modulo: Modulo;
    label: string;
    resumen: string;
    tabs: readonly AccessTabDocumentation[];
    condiciones?: readonly string[];
};

const level = (
    nivel: number,
    titulo: string,
    permite: readonly string[],
    noIncluye?: readonly string[],
): AccessLevelDocumentation => ({ nivel, titulo, permite, noIncluye });

function sameScopeLevels(
    maxNivel: number,
    baseCapability: string,
    noIncluye?: readonly string[],
): readonly AccessLevelDocumentation[] {
    return Array.from({ length: maxNivel }, (_, index) => {
        const nivel = index + 1;
        if (nivel === 1) {
            return level(1, "Acceso disponible", [baseCapability], noIncluye);
        }
        return level(
            nivel,
            "Mismo alcance funcional",
            [`Mantiene el mismo alcance descrito para el nivel 1: ${baseCapability}`],
            ["La implementación actual no añade una operación diferente por asignar este nivel."],
        );
    });
}

const tab = (
    tabId: string,
    label: string,
    resumen: string,
    niveles: readonly AccessLevelDocumentation[],
    condiciones?: readonly string[],
    observaciones?: readonly string[],
): AccessTabDocumentation => ({ tabId, label, resumen, niveles, condiciones, observaciones });

const sameScopeTab = (
    tabId: string,
    label: string,
    resumen: string,
    capability: string,
    maxNivel = 4,
    condiciones?: readonly string[],
    observaciones?: readonly string[],
): AccessTabDocumentation => tab(
    tabId,
    label,
    resumen,
    sameScopeLevels(maxNivel, capability),
    condiciones,
    observaciones,
);

export const ACCESS_DOCUMENTATION_CATALOG: Record<Modulo, AccessModuleDocumentation> = {
    [Modulo.USUARIOS]: {
        modulo: Modulo.USUARIOS,
        label: "Usuarios",
        resumen: "Administración de usuarios, permisos, firmas visuales y grupos de notificación.",
        condiciones: [
            "Las pestañas se muestran por su permiso específico; un permiso general conservado de versiones anteriores también puede hacerlas visibles.",
            "Las cuentas especiales Master y Super Master tienen restricciones propias de edición desde la interfaz.",
        ],
        tabs: [
            tab(
                "GESTION_USUARIOS",
                "Gestión de usuarios",
                "Controla la pantalla de usuarios y la configuración de sus accesos.",
                [
                    level(1, "Gestión operativa", [
                        "Consultar, crear, editar, activar, desactivar y eliminar usuarios desde la pantalla actual.",
                        "Abrir el editor y reemplazar los accesos por módulo y pestaña de un usuario.",
                    ], ["Administrar la firma visual de los usuarios."]),
                    level(2, "Gestión y firmas", [
                        "Incluye las operaciones disponibles en el nivel 1.",
                        "Configurar o reemplazar la firma visual de un usuario.",
                    ]),
                    level(3, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 2."], [
                        "La interfaz actual no añade una operación diferente frente al nivel 2.",
                    ]),
                    level(4, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 2."], [
                        "La interfaz actual no añade una operación diferente frente a los niveles 2 y 3.",
                    ]),
                ],
                ["La administración de firmas exige nivel 2 tanto en la interfaz como en su servicio protegido."],
            ),
            sameScopeTab(
                "INFO_NIVELES",
                "Info Niveles de Acceso",
                "Referencia consultiva sobre el funcionamiento actual de los permisos.",
                "Consultar la documentación de módulos, pestañas y niveles de acceso.",
            ),
            sameScopeTab(
                "NOTIFICACIONES",
                "Notificaciones",
                "Administra los usuarios asociados a cada grupo de notificación.",
                "Consultar los grupos de notificación y agregar o retirar usuarios de ellos.",
            ),
        ],
    },
    [Modulo.PRODUCTOS]: {
        modulo: Modulo.PRODUCTOS,
        label: "Productos",
        resumen: "Catálogo de materiales, productos terminados, semiterminados y procesos de producción.",
        condiciones: ["El módulo utiliza un único permiso general y compara su nivel para habilitar funciones internas."],
        tabs: [
            tab(
                "MAIN",
                "Acceso general",
                "El nivel del permiso general determina qué operaciones del catálogo de productos quedan disponibles.",
                [
                    level(1, "Consulta", [
                        "Ingresar al módulo y consultar materiales y productos existentes.",
                        "Abrir las áreas de operaciones básicas y definición de terminados o semiterminados.",
                    ], ["Codificar materiales, administrar definiciones o modificar productos existentes."]),
                    level(2, "Creación y definición", [
                        "Incluye la consulta del nivel 1.",
                        "Codificar materiales, terminados y semiterminados.",
                        "Administrar categorías, crear desde plantilla y definir procesos de producción.",
                    ], ["Editar desde las vistas de detalle o usar la pestaña de modificaciones avanzadas."]),
                    level(3, "Modificación", [
                        "Incluye los niveles anteriores.",
                        "Editar productos existentes y acceder a modificaciones avanzadas.",
                    ]),
                    level(4, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 3."], [
                        "La implementación actual no añade una operación diferente frente al nivel 3.",
                    ]),
                ],
            ),
        ],
    },
    [Modulo.PRODUCCION]: {
        modulo: Modulo.PRODUCCION,
        label: "Dirección Técnica y de Planta",
        resumen: "Planeación, programación, órdenes, controles de proceso y trazabilidad productiva.",
        condiciones: [
            "La mayoría de las pestañas usa permiso propio; algunas rutas antiguas también reconocen el permiso general del módulo.",
            "Los controles de proceso y los expedientes digitales exigen permisos exactos y no heredan el permiso general.",
            "Las excepciones de las cuentas Master y Super Master cambian según la pestaña y se indican en cada caso.",
        ],
        tabs: [
            sameScopeTab(
                "PLANEACION_PRODUCCION",
                "Planificación mensual",
                "Permite trabajar con la planeación mensual de producción.",
                "Consultar y gestionar la planeación mensual con las operaciones disponibles en la pantalla.",
            ),
            sameScopeTab(
                "PROGRAMACION_PRODUCCION",
                "Programación semanal",
                "Permite trabajar con la programación semanal de producción.",
                "Consultar y gestionar la programación semanal y sus observaciones.",
                4,
                ["Algunas consultas también son compartidas con la pestaña de aprobación del MPS."],
            ),
            sameScopeTab(
                "APROBACION_MPS_WEEK",
                "Aprobación del MPS",
                "Permite revisar y ejecutar las decisiones del MPS semanal.",
                "Consultar la información necesaria y ejecutar las operaciones de aprobación disponibles en esta pestaña.",
                4,
                ["Algunas consultas son compartidas con Programación semanal."],
            ),
            tab(
                "CREAR_ODP_MANUALMENTE",
                "Nueva ODP",
                "Controla la creación manual de órdenes de producción y la edición del número de lote.",
                [
                    level(1, "Creación estándar", ["Crear órdenes de producción con los números de lote generados por el sistema."], [
                        "Desbloquear y cambiar manualmente el número de lote.",
                    ]),
                    level(2, "Mismo alcance funcional", ["Mantiene la creación estándar del nivel 1."], [
                        "La implementación actual no añade una operación diferente frente al nivel 1.",
                    ]),
                    level(3, "Edición de lote", [
                        "Incluye la creación de órdenes de producción.",
                        "Desbloquear, editar y volver a validar manualmente los números de lote antes de crear la orden.",
                    ]),
                    level(4, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 3."], [
                        "La implementación actual no añade una operación diferente frente al nivel 3.",
                    ]),
                ],
            ),
            tab(
                "CREAR_ORDEN_FABRICACION",
                "Órdenes de fabricación",
                "Consulta y administra órdenes de fabricación independientes asociadas al expediente digital.",
                [
                    level(1, "Consulta", ["Buscar, consultar y abrir el detalle de las órdenes de fabricación."], [
                        "Crear, liberar o cancelar órdenes de fabricación.",
                    ]),
                    level(2, "Gestión", [
                        "Incluye la consulta del nivel 1.",
                        "Crear órdenes de fabricación independientes y, según su estado, liberarlas o cancelarlas.",
                    ]),
                ],
                ["La creación y las transiciones dependen de que la directiva del flujo de Batch Record esté activa."],
            ),
            tab(
                "PLANES_CONTROL_PROCESO",
                "Planes de control de proceso",
                "Define los planes y versiones que gobiernan los controles durante fabricación.",
                [
                    level(1, "Consulta", ["Consultar planes, versiones, aplicabilidades y características."], [
                        "Crear o editar borradores, publicar versiones o administrar catálogos.",
                    ]),
                    level(2, "Preparación de borradores", [
                        "Incluye la consulta del nivel 1.",
                        "Crear planes, generar nuevas versiones y editar borradores.",
                    ], ["Publicar, retirar o administrar catálogos."]),
                    level(3, "Administración", [
                        "Incluye los niveles anteriores.",
                        "Publicar o retirar versiones y administrar magnitudes físicas y unidades.",
                    ]),
                ],
                ["Las cuentas Master y Super Master reciben acceso automático con nivel máximo; los demás usuarios requieren una asignación explícita."],
            ),
            tab(
                "REGISTRAR_CONTROL_PROCESO",
                "Registro de controles de proceso",
                "Gestiona controles pendientes y ejecuciones durante fabricación.",
                [
                    level(1, "Consulta", ["Buscar y consultar controles de proceso pendientes."], [
                        "Registrar, repetir o revalidar una medición.",
                    ]),
                    level(2, "Ejecución", [
                        "Incluye la consulta del nivel 1.",
                        "Registrar controles, repetir o revalidar ejecuciones asociadas a un expediente.",
                    ]),
                ],
                ["Para usuarios ordinarios, el permiso y su nivel deben estar asignados explícitamente. Master y Super Master reciben acceso automático."],
            ),
            tab(
                "DESVIACIONES_CONTROL_PROCESO",
                "Desviaciones de proceso",
                "Investiga y resuelve resultados no conformes de controles de proceso.",
                [
                    level(1, "Consulta", ["Consultar desviaciones y abrir su detalle de investigación."], [
                        "Modificar la investigación, definir la disposición o resolver la desviación.",
                    ]),
                    level(2, "Resolución", [
                        "Incluye la consulta del nivel 1.",
                        "Registrar investigación, resolución, disposición y resolver desviaciones abiertas.",
                    ]),
                ],
                ["Para usuarios ordinarios, el permiso y su nivel deben estar asignados explícitamente. Master y Super Master reciben acceso automático."],
            ),
            sameScopeTab(
                "HISTORIAL_CONTROL_PROCESO",
                "Historial de controles de proceso",
                "Presenta las ejecuciones y lecturas conservadas de controles de proceso.",
                "Consultar el historial, detalle, resultados y observaciones de las ejecuciones de proceso.",
                1,
                ["Para usuarios ordinarios, el permiso y su nivel deben estar asignados explícitamente. Master y Super Master reciben acceso automático."],
            ),
            tab(
                "MONITOREAR_AREAS_OPERATIVAS",
                "Monitoreo operativo",
                "Permite consultar el estado de las áreas y operaciones en ejecución.",
                [
                    level(1, "Monitoreo", ["Consultar el tablero y el detalle operativo de las áreas de producción."], [
                        "Corregir administrativamente el estado de una operación.",
                    ]),
                    level(2, "Mismo alcance funcional", ["Mantiene las capacidades de monitoreo del nivel 1."], [
                        "La implementación actual no añade una operación diferente frente al nivel 1.",
                    ]),
                    level(3, "Corrección administrativa", [
                        "Incluye el monitoreo de los niveles anteriores.",
                        "Corregir el estado de una operación desde el detalle de una orden de fabricación.",
                    ]),
                    level(4, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 3."], [
                        "La implementación actual no añade una operación diferente frente al nivel 3.",
                    ]),
                ],
                [
                    "La corrección administrativa exige que la directiva correspondiente esté habilitada.",
                    "También se conservan asignaciones equivalentes procedentes de versiones anteriores.",
                ],
            ),
            tab(
                "HISTORIAL",
                "Historial de ODP",
                "Consulta las órdenes de producción y permite cancelar las que cumplan las condiciones del proceso.",
                [
                    level(1, "Consulta", ["Buscar órdenes de producción y consultar su detalle."], ["Cancelar órdenes de producción."]),
                    level(2, "Consulta y cancelación", [
                        "Incluye la consulta del nivel 1.",
                        "Cancelar una orden cuando su estado y las validaciones del backend lo permitan.",
                    ]),
                    level(3, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 2."], [
                        "La implementación actual no añade una operación diferente frente al nivel 2.",
                    ]),
                    level(4, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 2."], [
                        "La implementación actual no añade una operación diferente frente a los niveles 2 y 3.",
                    ]),
                ],
            ),
            tab(
                "CONSULTAR_BATCH_RECORD",
                "Expedientes digitales",
                "Consulta el expediente de fabricación y gestiona su envío o devolución documental.",
                [
                    level(1, "Consulta del expediente", [
                        "Buscar expedientes, consultar su detalle, prevalidación, evidencias y secciones documentales.",
                    ], ["Atender devoluciones o enviar y reenviar el expediente a Calidad."]),
                    level(2, "Gestión documental", [
                        "Incluye la consulta del nivel 1.",
                        "Atender secciones devueltas y enviar o reenviar el expediente a revisión de Calidad.",
                    ]),
                ],
                [
                    "La evidencia de controles de proceso se consulta o ejecuta según los permisos separados de Registro e Historial de controles.",
                    "Las cuentas Master y Super Master reciben acceso automático a este permiso de expediente.",
                ],
            ),
            tab(
                "PARAMETROS_POR_CATEGORIA",
                "Parámetros y rutas",
                "Administra parámetros por categoría y rutas maestras de producción.",
                [
                    level(1, "Sin acceso visible", [], ["La pestaña requiere nivel 3 y no se muestra con este nivel."]),
                    level(2, "Sin acceso visible", [], ["La pestaña requiere nivel 3 y no se muestra con este nivel."]),
                    level(3, "Configuración", ["Abrir y administrar los parámetros por categoría y las rutas de producción disponibles." ]),
                    level(4, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 3."], [
                        "La implementación actual no añade una operación diferente frente al nivel 3.",
                    ]),
                ],
            ),
        ],
    },
    [Modulo.STOCK]: {
        modulo: Modulo.STOCK,
        label: "Stock",
        resumen: "Consulta de existencias, kardex e historial de movimientos de almacén.",
        condiciones: ["Cada pestaña se muestra con su permiso propio; el permiso general conservado de versiones anteriores puede actuar como respaldo."],
        tabs: [
            sameScopeTab("CONSOLIDADO", "Consolidado", "Presenta existencias consolidadas y sus alcances de almacén.", "Consultar saldos consolidados, detalles y herramientas de análisis disponibles."),
            sameScopeTab("KARDEX", "Kardex", "Presenta los movimientos cronológicos de inventario.", "Consultar y filtrar el kardex de materiales y productos."),
            sameScopeTab("HISTORIAL_TRANSACCIONES_ALMACEN", "Historial de transacciones de almacén", "Presenta las transacciones históricas y sus detalles.", "Consultar, filtrar y abrir el detalle de las transacciones de almacén."),
        ],
    },
    [Modulo.PROVEEDORES]: {
        modulo: Modulo.PROVEEDORES,
        label: "Proveedores",
        resumen: "Registro, consulta y mantenimiento de proveedores.",
        condiciones: ["La pantalla usa el nivel máximo de todo el módulo; los permisos de las dos pestañas no quedan aislados entre sí."],
        tabs: [
            tab("CODIFICAR_PROVEEDOR", "Codificar proveedor", "Su nivel contribuye al nivel máximo con el que opera todo el módulo.", [
                level(1, "Consulta del módulo", ["Hace visible la consulta de proveedores."], ["Abrir la pestaña de codificación o editar proveedores."]),
                level(2, "Registro", ["Incluye la consulta y hace visible la pestaña para registrar proveedores."], ["Editar proveedores existentes desde su detalle."]),
                level(3, "Edición", ["Incluye los niveles anteriores y permite editar proveedores existentes." ]),
                level(4, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 3."], ["No añade una operación diferente frente al nivel 3."]),
            ]),
            tab("CONSULTAR_PROVEEDORES", "Consultar proveedores", "Su nivel contribuye al nivel máximo con el que opera todo el módulo.", [
                level(1, "Consulta", ["Consultar proveedores y abrir su detalle."], ["Registrar o editar proveedores."]),
                level(2, "Consulta y registro", ["Incluye la consulta y hace visible también la pestaña para registrar proveedores."], ["Editar proveedores existentes desde su detalle."]),
                level(3, "Edición", ["Incluye los niveles anteriores y permite editar proveedores existentes." ]),
                level(4, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 3."], ["No añade una operación diferente frente al nivel 3."]),
            ]),
        ],
    },
    [Modulo.COMPRAS]: {
        modulo: Modulo.COMPRAS,
        label: "Compras",
        resumen: "Creación, consulta y gestión de órdenes de compra de materiales.",
        condiciones: [
            "La visibilidad de las pestañas usa su permiso propio; el permiso general conservado de versiones anteriores puede actuar como respaldo.",
            "Varias acciones sobre órdenes existentes usan el nivel máximo del módulo, pero la liberación exige nivel 2 en Reportes.",
        ],
        tabs: [
            tab("CREAR_OCM", "Crear OC-M", "Permite crear órdenes de compra de materiales y contribuye al nivel máximo del módulo.", [
                level(1, "Creación", ["Abrir el formulario y crear órdenes de compra de materiales." ]),
                level(2, "Creación y gestión compartida", [
                    "Mantiene la creación de órdenes.",
                    "Su nivel máximo puede habilitar edición, cancelación y cambios de estado sobre órdenes visibles en Reportes.",
                ], ["Liberar una orden en estado inicial sin nivel 2 específico en Reportes."]),
                level(3, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 2."], ["No añade una operación diferente frente al nivel 2."]),
                level(4, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 2."], ["No añade una operación diferente frente a los niveles 2 y 3."]),
            ]),
            tab("REPORTES_ORDENES_COMPRA", "Reportes de órdenes de compra", "Consulta órdenes y controla sus acciones de seguimiento.", [
                level(1, "Consulta", ["Buscar, consultar y abrir el detalle de órdenes de compra."], ["Editar, cancelar, liberar o cambiar su estado."]),
                level(2, "Gestión de órdenes", [
                    "Incluye la consulta del nivel 1.",
                    "Editar órdenes no liberadas, cancelarlas, liberarlas y ejecutar los cambios de estado permitidos.",
                ]),
                level(3, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 2."], ["No añade una operación diferente frente al nivel 2."]),
                level(4, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 2."], ["No añade una operación diferente frente a los niveles 2 y 3."]),
            ]),
        ],
    },
    [Modulo.SEGUIMIENTO_PRODUCCION]: {
        modulo: Modulo.SEGUIMIENTO_PRODUCCION,
        label: "Gestión de áreas operativas",
        resumen: "Creación, consulta y configuración de áreas operativas de producción.",
        condiciones: ["Cada pestaña se muestra con su permiso propio; el permiso general conservado de versiones anteriores puede actuar como respaldo."],
        tabs: [
            sameScopeTab("CREAR_AREA_PRODUCCION", "Crear área de producción", "Permite registrar la estructura de una nueva área operativa.", "Crear áreas operativas con la configuración disponible en el formulario."),
            sameScopeTab("CONSULTA_AREAS_OPERATIVAS", "Consulta de áreas operativas", "Permite consultar y gestionar la configuración de áreas existentes.", "Consultar el detalle de áreas operativas y usar las acciones disponibles en esa pantalla."),
        ],
    },
    [Modulo.CLIENTES]: {
        modulo: Modulo.CLIENTES,
        label: "Clientes",
        resumen: "Registro, consulta y mantenimiento de clientes.",
        condiciones: ["La pantalla usa el nivel máximo de todo el módulo; los permisos de las dos pestañas no quedan aislados entre sí."],
        tabs: [
            tab("REGISTRAR_CLIENTE", "Registrar cliente", "Su nivel contribuye al nivel máximo con el que opera todo el módulo.", [
                level(1, "Consulta del módulo", ["Hace visible la consulta de clientes."], ["Abrir la pestaña de registro o editar clientes."]),
                level(2, "Registro", ["Incluye la consulta y hace visible la pestaña para registrar clientes."], ["Editar clientes existentes desde su detalle."]),
                level(3, "Edición", ["Incluye los niveles anteriores y permite editar clientes existentes." ]),
                level(4, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 3."], ["No añade una operación diferente frente al nivel 3."]),
            ]),
            tab("CONSULTAR_CLIENTES", "Consultar clientes", "Su nivel contribuye al nivel máximo con el que opera todo el módulo.", [
                level(1, "Consulta", ["Consultar clientes y abrir su detalle."], ["Registrar o editar clientes."]),
                level(2, "Consulta y registro", ["Incluye la consulta y hace visible también la pestaña para registrar clientes."], ["Editar clientes existentes desde su detalle."]),
                level(3, "Edición", ["Incluye los niveles anteriores y permite editar clientes existentes." ]),
                level(4, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 3."], ["No añade una operación diferente frente al nivel 3."]),
            ]),
        ],
    },
    [Modulo.VENTAS]: {
        modulo: Modulo.VENTAS,
        label: "Ventas",
        resumen: "Pantallas de registro, historial, reportes de ventas y creación de vendedores.",
        condiciones: ["La pantalla usa el nivel máximo de todo el módulo; los permisos de sus pestañas no quedan aislados entre sí."],
        tabs: [
            ...[
                ["CREAR_VENTA", "Crear venta", "Da acceso a las pantallas generales de ventas."],
                ["HISTORIAL_VENTAS", "Historial de ventas", "Da acceso a las pantallas generales de ventas."],
                ["REPORTES", "Reportes", "Da acceso a las pantallas generales de ventas."],
                ["CREAR_VENDEDOR_NUEVO", "Crear vendedor nuevo", "Su nivel puede habilitar la creación de vendedores."],
            ].map(([tabId, label, resumen]) => tab(tabId, label, resumen, [
                level(1, "Acceso general", ["Mostrar Crear venta, Historial de ventas y Reportes."], ["Mostrar la creación de vendedores."]),
                level(2, "Mismo alcance funcional", ["Mantiene las pantallas generales del nivel 1."], ["No muestra todavía la creación de vendedores."]),
                level(3, "Creación de vendedores", ["Incluye las pantallas generales y muestra la creación de vendedores." ]),
                level(4, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 3."], ["No añade una operación diferente frente al nivel 3."]),
            ])),
        ],
    },
    [Modulo.TRANSACCIONES_ALMACEN]: {
        modulo: Modulo.TRANSACCIONES_ALMACEN,
        label: "Transacciones de almacén",
        resumen: "Ingresos, dispensaciones, averías, historial y ajustes de inventario.",
        condiciones: [
            "Cada pestaña se muestra con su permiso propio; el permiso general conservado de versiones anteriores puede actuar como respaldo.",
            "Algunas excepciones operativas toman el nivel máximo de todo el módulo.",
        ],
        tabs: [
            sameScopeTab("INGRESO_OCM", "Ingreso OCM", "Registra el ingreso de mercancía asociado a órdenes de compra.", "Consultar órdenes pendientes y completar el asistente de ingreso de mercancía."),
            tab("HACER_DISPENSACION", "Hacer dispensación", "Permite preparar y registrar dispensaciones de materiales.", [
                level(1, "Dispensación estándar", ["Ejecutar el flujo normal de dispensación sin superar la cantidad requerida por la receta." ]),
                level(2, "Mismo alcance funcional", ["Mantiene la dispensación estándar del nivel 1."], ["No autoriza superar la cantidad requerida por la receta."]),
                level(3, "Excepción de cantidad", ["Incluye el flujo normal y permite continuar cuando la suma dispensada supera la receta." ]),
                level(4, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 3."], ["No añade una operación diferente frente al nivel 3."]),
            ], ["La excepción usa el nivel máximo del módulo, no únicamente el nivel de esta pestaña."]),
            sameScopeTab("DISPENSACION_V2", "Dispensación v2", "Ejecuta la versión actualizada del flujo de dispensación.", "Consultar y completar las operaciones disponibles en el asistente de Dispensación v2."),
            sameScopeTab("HISTORIAL_DISPENSACIONES", "Historial de dispensaciones", "Presenta dispensaciones históricas y sus detalles.", "Consultar, filtrar y abrir el detalle de dispensaciones registradas."),
            tab("INGRESO_PRODUCTO_TERMINADO", "Ingreso de producto terminado", "Consulta reportes pendientes y controla el cierre de ingreso a almacén.", [
                level(1, "Consulta", ["Consultar fechas y reportes de producción pendientes de ingreso."], ["Confirmar el cierre e ingresar producto terminado al almacén."]),
                level(2, "Cierre e ingreso", ["Incluye la consulta del nivel 1 y permite completar el asistente de cierre e ingreso a almacén." ]),
                level(3, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 2."], ["No añade una operación diferente frente al nivel 2."]),
                level(4, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 2."], ["No añade una operación diferente frente a los niveles 2 y 3."]),
            ]),
            sameScopeTab("GESTION_AVERIAS", "Gestión de averías", "Gestiona materiales y movimientos relacionados con averías.", "Consultar y ejecutar las operaciones de averías disponibles en la pestaña."),
            sameScopeTab(
                "AJUSTES_INVENTARIO",
                "Ajustes de inventario",
                "Permite registrar ajustes controlados sobre las existencias.",
                "Consultar y ejecutar los flujos de ajuste de inventario disponibles.",
                4,
                ["La pestaña solo se muestra cuando la directiva global «Habilitar ajustes de inventario» está activa."],
            ),
        ],
    },
    [Modulo.ACTIVOS]: {
        modulo: Modulo.ACTIVOS,
        label: "Activos fijos",
        resumen: "Incorporación de activos, órdenes de compra y reportes asociados.",
        condiciones: [
            "Cada pestaña se muestra con su permiso propio; el permiso general conservado de versiones anteriores puede actuar como respaldo.",
            "Las acciones de órdenes de compra de activos usan el nivel máximo de todo el módulo.",
        ],
        tabs: [
            sameScopeTab("INCORPORACION", "Incorporación", "Registra la incorporación de activos fijos.", "Consultar y completar el flujo de incorporación de activos."),
            sameScopeTab("CREAR_OC_AF", "Crear OC-AF", "Crea órdenes de compra para activos fijos.", "Consultar y completar el formulario de creación de órdenes de compra de activos."),
            tab("REPORTES_OC_AF", "Reportes OC-AF", "Consulta y administra órdenes de compra de activos fijos.", [
                level(1, "Consulta", ["Buscar, consultar, abrir el detalle y descargar órdenes de compra de activos."], ["Editar, liberar, enviar o cancelar órdenes."]),
                level(2, "Gestión", ["Incluye la consulta y permite editar órdenes elegibles, liberarlas, enviarlas o cancelarlas." ]),
                level(3, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 2."], ["No añade una operación diferente frente al nivel 2."]),
                level(4, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 2."], ["No añade una operación diferente frente a los niveles 2 y 3."]),
            ], ["El nivel 2 puede provenir de cualquier pestaña del módulo porque estas acciones usan el máximo del módulo."]),
            sameScopeTab("REPORTES_ACTIVOS_FIJOS", "Reportes de activos fijos", "Presenta los reportes generales de activos y equipamiento.", "Consultar y filtrar la información disponible de activos fijos."),
        ],
    },
    [Modulo.CONTABILIDAD]: {
        modulo: Modulo.CONTABILIDAD,
        label: "Contabilidad",
        resumen: "Acceso al catálogo de cuentas contables.",
        condiciones: ["El módulo utiliza un único permiso general y no diferencia operaciones por nivel en la interfaz actual."],
        tabs: [sameScopeTab("MAIN", "Acceso general", "Abre las funciones actuales de contabilidad.", "Consultar y utilizar el catálogo de cuentas contables disponible.")],
    },
    [Modulo.PERSONAL_PLANTA]: {
        modulo: Modulo.PERSONAL_PLANTA,
        label: "Personal de planta",
        resumen: "Incorporación, consulta y gestión de información del personal.",
        condiciones: ["Cada pestaña se muestra con su permiso propio; el permiso general conservado de versiones anteriores puede actuar como respaldo."],
        tabs: [
            sameScopeTab("INCORPORACION", "Incorporación", "Registra nuevos integrantes del personal.", "Consultar y completar el flujo de incorporación de personal."),
            sameScopeTab("CONSULTA", "Consulta", "Consulta personal y da acceso también a Horas extra.", "Consultar información del personal y utilizar la pestaña de Horas extra."),
        ],
    },
    [Modulo.BINTELLIGENCE]: {
        modulo: Modulo.BINTELLIGENCE,
        label: "Business Intelligence",
        resumen: "Informes operativos, series de tiempo, personal y análisis de aprovisionamiento.",
        condiciones: [
            "Los cuatro informes principales usan permiso de pestaña; el permiso general conservado de versiones anteriores puede actuar como respaldo.",
            "Aprovisionamiento se muestra cuando existe cualquier acceso al módulo y no exige su permiso exacto.",
        ],
        tabs: [
            sameScopeTab("INFORMES_DIARIOS", "Informes diarios", "Presenta indicadores y reportes diarios.", "Consultar y utilizar los informes diarios disponibles."),
            sameScopeTab("INFORMES_GLOBALES", "Informes globales", "Presenta análisis consolidados e indicadores globales.", "Consultar y utilizar los informes globales disponibles."),
            sameScopeTab("SERIES_TIEMPO_PROYECCIONES", "Series de tiempo y proyecciones", "Presenta análisis históricos y proyecciones.", "Consultar y utilizar las series de tiempo y proyecciones disponibles."),
            sameScopeTab("PERSONAL", "Personal", "Presenta indicadores y análisis relacionados con el personal.", "Consultar y utilizar los análisis de personal disponibles."),
            sameScopeTab(
                "APROVISIONAMIENTO",
                "Aprovisionamiento",
                "Analiza lead time y aprovisionamiento para combinaciones de material y proveedor.",
                "Seleccionar materiales y proveedores y consultar los análisis de aprovisionamiento disponibles.",
                4,
                undefined,
                ["El nivel mostrado en la pantalla corresponde al máximo del módulo, pero actualmente no habilita acciones adicionales."],
            ),
        ],
    },
    [Modulo.OPERACIONES_CRITICAS_BD]: {
        modulo: Modulo.OPERACIONES_CRITICAS_BD,
        label: "Operaciones críticas en BD",
        resumen: "Herramientas sensibles de carga, eliminación y exportación de datos.",
        condiciones: [
            "La ruta completa exige una cuenta Master o Super Master además del permiso del módulo.",
            "Los niveles numéricos no diferencian operaciones dentro de las pestañas actuales.",
        ],
        tabs: [
            sameScopeTab("CARGAS_MASIVAS", "Cargas masivas", "Ejecuta las cargas masivas habilitadas por el sistema.", "Abrir y ejecutar las operaciones de carga masiva disponibles.", 4, ["Exige que la directiva «Habilitar carga masiva» esté activa."]),
            sameScopeTab("ELIMINACIONES_FORZADAS", "Eliminaciones forzadas", "Ejecuta asistentes controlados de eliminación forzada.", "Abrir y ejecutar las operaciones de eliminación forzada disponibles.", 4, ["Exige que la directiva «Habilitar eliminación forzada» esté activa."]),
            sameScopeTab("EXPORTACION_DATOS", "Exportación de datos", "Genera exportaciones de los datos habilitados.", "Abrir y ejecutar las operaciones de exportación disponibles."),
        ],
    },
    [Modulo.ADMINISTRACION_ALERTAS]: {
        modulo: Modulo.ADMINISTRACION_ALERTAS,
        label: "Administración de alertas",
        resumen: "Reserva de acceso para la administración de alertas del sistema.",
        condiciones: ["La página actual es informativa y todavía no diferencia operaciones por nivel."],
        tabs: [sameScopeTab("MAIN", "Acceso general", "Abre la página actual de administración de alertas.", "Ingresar a la página informativa de Administración de alertas.")],
    },
    [Modulo.ADMINISTRACION_GLOBAL]: {
        modulo: Modulo.ADMINISTRACION_GLOBAL,
        label: "Administración global",
        resumen: "Parametrizaciones corporativas de identidad legal y jornada laboral.",
        condiciones: ["Cada pestaña usa su permiso propio; las cuentas Master y Super Master reciben acceso automático a estas parametrizaciones."],
        tabs: [
            tab("IDENTIDAD_LEGAL", "Identidad legal", "Consulta y versiona la identidad legal y el logo documental de la empresa.", [
                level(1, "Consulta", ["Consultar la versión vigente y los historiales de identidad legal y logo documental."], ["Guardar nuevas versiones vigentes."]),
                level(2, "Versionado", ["Incluye la consulta y permite guardar nuevas versiones de identidad legal y logo documental." ]),
                level(3, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 2."], ["No añade una operación diferente frente al nivel 2."]),
                level(4, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 2."], ["No añade una operación diferente frente a los niveles 2 y 3."]),
            ]),
            tab("JORNADA_LABORAL", "Jornada laboral", "Consulta y versiona la configuración de la jornada laboral.", [
                level(1, "Consulta", ["Consultar la jornada vigente y su historial de versiones."], ["Guardar una nueva versión vigente."]),
                level(2, "Versionado", ["Incluye la consulta y permite guardar una nueva versión de la jornada laboral." ]),
                level(3, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 2."], ["No añade una operación diferente frente al nivel 2."]),
                level(4, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 2."], ["No añade una operación diferente frente a los niveles 2 y 3."]),
            ]),
        ],
    },
    [Modulo.MASTER_DIRECTIVES]: {
        modulo: Modulo.MASTER_DIRECTIVES,
        label: "Directivas Super Master",
        resumen: "Configuración de directivas globales y habilitadores de operaciones sensibles.",
        condiciones: [
            "La asignación de este módulo no concede por sí sola acceso a la pantalla.",
            "La cuenta Super Master puede ingresar; la cuenta Master depende además de la directiva que habilita su acceso a las Directivas Super Master.",
        ],
        tabs: [sameScopeTab(
            "MAIN",
            "Acceso general",
            "El valor numérico almacenado no cambia las operaciones de esta pantalla.",
            "No añade privilegios por nivel; el acceso efectivo depende de la identidad reservada y de la directiva global.",
        )],
    },
    [Modulo.ORGANIGRAMA]: {
        modulo: Modulo.ORGANIGRAMA,
        label: "Organigrama",
        resumen: "Estructura de cargos y versiones de misión, visión y valores.",
        condiciones: ["Cada pestaña usa su permiso propio; las cuentas Master y Super Master reciben acceso automático."],
        tabs: [
            tab("ORGANIGRAMA", "Organigrama", "Consulta y edita cargos y relaciones de la estructura organizacional.", [
                level(1, "Consulta", ["Consultar el organigrama y el detalle de sus cargos."], ["Crear, editar o reorganizar cargos y relaciones."]),
                level(2, "Edición", ["Incluye la consulta y permite crear, editar y reorganizar cargos y relaciones." ]),
                level(3, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 2."], ["No añade una operación diferente frente al nivel 2."]),
                level(4, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 2."], ["No añade una operación diferente frente a los niveles 2 y 3."]),
            ]),
            tab("MISION_VISION", "Misión y visión", "Consulta y versiona misión, visión y valores corporativos.", [
                level(1, "Consulta", ["Consultar las versiones vigentes y el historial de misión, visión y valores."], ["Crear o restaurar versiones."]),
                level(2, "Versionado", ["Incluye la consulta y permite crear nuevas versiones y restaurar versiones anteriores." ]),
                level(3, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 2."], ["No añade una operación diferente frente al nivel 2."]),
                level(4, "Mismo alcance funcional", ["Mantiene las capacidades del nivel 2."], ["No añade una operación diferente frente a los niveles 2 y 3."]),
            ]),
        ],
    },
    [Modulo.CALIDAD]: {
        modulo: Modulo.CALIDAD,
        label: "Calidad",
        resumen: "Planes, ensayos, desviaciones, historial y decisiones de liberación de lotes.",
        condiciones: [
            "Todas las pestañas actuales exigen permiso exacto y no heredan el permiso general del módulo.",
            "Las cuentas Master y Super Master reciben acceso automático a las pestañas actuales de Calidad.",
        ],
        tabs: [
            tab("PLANES_CONTROL_CALIDAD", "Planes de control de calidad", "Define los planes y versiones que gobiernan los ensayos de Calidad.", [
                level(1, "Consulta", ["Consultar planes, versiones, aplicabilidades y características."], ["Crear o editar borradores, publicar versiones o administrar catálogos."]),
                level(2, "Preparación de borradores", ["Incluye la consulta, permite crear planes, generar nuevas versiones y editar borradores."], ["Publicar, retirar o administrar catálogos."]),
                level(3, "Administración", ["Incluye los niveles anteriores y permite publicar o retirar versiones y administrar magnitudes físicas y unidades." ]),
            ]),
            tab("REGISTRAR_CONTROL_CALIDAD", "Registro de ensayos", "Gestiona ensayos pendientes y ejecuciones de Calidad.", [
                level(1, "Consulta", ["Buscar y consultar ensayos pendientes."], ["Registrar, repetir o revalidar un ensayo."]),
                level(2, "Ejecución", ["Incluye la consulta y permite registrar, repetir o revalidar ensayos asociados a un expediente." ]),
            ]),
            tab("DESVIACIONES_CONTROL_CALIDAD", "Desviaciones de calidad", "Investiga, resuelve y cierra resultados no conformes de Calidad.", [
                level(1, "Consulta", ["Consultar desviaciones y abrir su detalle."], ["Modificar la investigación, resolver o cerrar la desviación."]),
                level(2, "Resolución", ["Incluye la consulta y permite registrar investigación, resolución y disposición, y resolver desviaciones abiertas."], ["Cerrar con segregación una desviación ya resuelta."]),
                level(3, "Cierre", ["Incluye los niveles anteriores y permite cerrar con segregación una desviación resuelta." ]),
            ]),
            sameScopeTab("HISTORIAL_CONTROL_CALIDAD", "Historial de ensayos", "Presenta las ejecuciones y lecturas conservadas de ensayos de Calidad.", "Consultar el historial, detalle, resultados y observaciones de los ensayos.", 1),
            tab("REVISION_LIBERACION_LOTES", "Revisión y liberación de lotes", "Revisa expedientes, toma decisiones de Calidad y gestiona reaperturas excepcionales.", [
                level(1, "Revisión", ["Consultar bandejas, expedientes, evidencias, bloqueos y documentos."], ["Devolver, rechazar, liberar o solicitar reaperturas."]),
                level(2, "Decisión operativa", [
                    "Incluye la revisión del nivel 1.",
                    "Devolver alcances a Producción, rechazar lotes y solicitar la reapertura de un rechazo.",
                ], ["Liberar lotes o aprobar solicitudes de reapertura."]),
                level(3, "Liberación y aprobación", [
                    "Incluye los niveles anteriores.",
                    "Liberar lotes que superen las validaciones y aprobar, como segundo usuario, solicitudes de reapertura.",
                ]),
            ], [
                "El registro de ensayos dentro del expediente depende además de Registro de ensayos nivel 2.",
                "La consulta de evidencia histórica depende de Historial de ensayos nivel 1.",
                "La liberación continúa sujeta a bloqueos automáticos, estados del expediente y separación de funciones.",
            ]),
        ],
    },
    [Modulo.PAGOS_PROVEEDORES]: {
        modulo: Modulo.PAGOS_PROVEEDORES,
        label: "Pagos a proveedores",
        resumen: "Asentamiento contable de transacciones y consulta de facturas vencidas.",
        condiciones: ["Cada pestaña se muestra con su permiso propio; el permiso general conservado de versiones anteriores puede actuar como respaldo."],
        tabs: [
            sameScopeTab("ASENTAR_TRANSACCIONES_ALMACEN", "Asentar transacciones de almacén", "Busca y asienta transacciones pendientes originadas por compras.", "Consultar transacciones pendientes y ejecutar el asentamiento contable disponible."),
            sameScopeTab("FACTURAS_VENCIDAS", "Facturas vencidas", "Reserva de acceso para la consulta de facturas vencidas.", "Abrir la pestaña actualmente disponible de Facturas vencidas.", 4, undefined, ["La pestaña actual todavía contiene contenido informativo y no implementa operaciones diferenciadas."]),
        ],
    },
};

export const ACCESS_DOCUMENTATION_MODULES = Object.values(Modulo).map(
    (modulo) => ACCESS_DOCUMENTATION_CATALOG[modulo],
);

export function getAccessModuleDocumentation(modulo: Modulo): AccessModuleDocumentation {
    return ACCESS_DOCUMENTATION_CATALOG[modulo];
}

export function getAccessTabDocumentation(
    modulo: Modulo,
    tabId: string,
): AccessTabDocumentation | undefined {
    return ACCESS_DOCUMENTATION_CATALOG[modulo].tabs.find((item) => item.tabId === tabId);
}

export function maxDocumentedLevel(tabDocumentation: AccessTabDocumentation): number {
    return Math.max(...tabDocumentation.niveles.map((item) => item.nivel));
}
