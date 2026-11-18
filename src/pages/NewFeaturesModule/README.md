# Novedades

Módulo autocontenido: catálogo, filtros, persistencia, observación de rutas,
diálogo e indicadores viven aquí. Fuera solo se monta el proveedor en
`RootLayout.tsx` y el botón/envoltorios de tarjetas en `Home.tsx`.
No añadir efectos ni handlers a los módulos anunciados ni a `SectionCard`.
Entradas de la aplicación: sesión autenticada, React Router y valores del contexto
de directivas. La política de vigencia sigue encapsulada aquí, con helpers propios.
El proveedor ofrece también el botón en el panel de responsables si hay entradas
con `access.kind: "area"`; no necesita modificar ese panel.

Mientras la novedad esté dentro de su plazo de vigencia:

| Consultó la novedad | Entró al módulo | Etiqueta «Nuevo» |
| --- | --- | --- |
| No | No | Permanece |
| Sí | No | Permanece |
| No | Sí | Permanece |
| Sí | Sí | Desaparece |

- `NEW_FEATURES_NOTIFICATION_DAYS`: entero 0–365, inicial/fallback 7; 0 desactiva
  etiquetas y contadores. Vence en `publishedAt + días × 24 h` incluso sin leer.
  El carrusel autorizado sigue consultable. Aumentar/reducir el plazo recalcula
  sobre la misma fecha; no reinicia lecturas ni visitas. Se actualiza al vencer
  y al recuperar foco/visibilidad. Sesiones abiertas reciben cambios al refrescar
  las directivas o recargar; no hay sincronización push entre dispositivos.
- `publishedAt` es una fecha explícita con zona por entrada/revisión. No generarla
  al compilar ni al abrir sesión, ni moverla al editar imágenes o textos menores.
  Las 14 entradas anteriores comienzan el 2026-11-17; conservan sus ids/revisiones.
- El aviso administrativo usa `access.kind: "supermaster"`: super_master o master
  con acceso efectivo a Directivas; nunca se muestra a una cuenta ordinaria.

- Ambas condiciones se registran por usuario y novedad/revisión, en cualquier
  orden. La visita debe corresponder a la revisión vigente y una ruta autorizada;
  también cuentan entradas directas. Abrir una entrada no consulta las demás.
- El botón cuenta entradas vigentes sin consultar. La tarjeta conserva «Nuevo»
  mientras alguna entrada aplicable y vigente no cumpla ambas condiciones.
  El diálogo sigue disponible.
- Carrusel manual, una entrada por diapositiva. Flechas, puntos, teclado y gesto
  horizontal; sin avance automático. Las tarjetas laterales son decorativas y no
  cuentan como consultadas. Respeta movimiento reducido y oculta controles si hay una entrada.
- `localStorage` propio por usuario e instalación (`BASE_URL`); si falla, memoria.
  No sincroniza entre dispositivos. Solo conserva identificadores del catálogo activo.
- Actualizar `currentFeatures.ts` **solo por petición explícita del usuario**.
  Un commit o despliegue no obliga a renovar el contenido. Mantener un catálogo
  activo, sin historial; lenguaje de usuario, resumen, ubicación e imagen opcional con `alt`.
  Conservar `id` y `revision` hasta solicitar un nuevo aviso; no reiniciarlos por un refactor.
- Filtros privados, sin reutilizar helpers de otros módulos. Mantener equivalencia
  con permisos reales: módulo/tab/nivel, `MAIN`, alias y excepción master.
  `exactTab: true` impide heredar `MAIN` (p. ej. Gestión Humana/PERMISOS).
  `requiredTabs` exige además todos los permisos indicados del mismo módulo
  (editar desde el catálogo: Modificaciones ≥ 3 y Process Designer ≥ 2).
  Para funciones con condiciones adicionales, incorporarlas al filtro antes de anunciarlas.
- El catálogo del frontend controla visibilidad, no confidencialidad ni autorización
  del backend. No incluir datos privados en textos o imágenes.
- Catálogo revisado el 2026-11-17: cambios de usuario de los cuatro commits frontend
  `72fb3fc`, `bc5b92f`, `aeff8a3`, `66c7772`. Se omiten ajustes internos y pantallas vacías.
  La historia aislada usa ejemplos propios; el catálogo real es `currentFeatures.ts`.
- Imágenes: capturar componentes reales en navegador oculto con datos ficticios,
  sin escritorio, cuentas personales ni escrituras de negocio. Conservar origen y
  guía numerada en `assets/`; revisar que la edición no cambie textos ni controles.
  Cada entrada tiene guía propia con `alt` y explicación de los números.
  Pares `<id>-captura.jpg` (origen) / `<id>-guia.png` (edición con imagegen);
  Productos conserva el prefijo `productos-modificaciones` aprobado inicialmente.
  Capturas de componentes actuales con API/sesión en memoria: acreditan la interfaz,
  no una prueba integrada del backend. Las guías son ediciones gráficas; el JPG
  original conserva la evidencia. 3D muestra el inicio sin modelo y el asistente
  una vista previa sin conexión; no simular resultados ni consultas ejecutadas.
  Renovar capturas solo cuando el usuario lo solicite, junto con el catálogo.
- Gaphor: no había un diagrama específico; cualquier representación nueva es manual.
