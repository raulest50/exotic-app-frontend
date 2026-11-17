# Novedades

Módulo autocontenido: catálogo, filtros, persistencia, observación de rutas,
diálogo e indicadores viven aquí. Fuera solo se monta el proveedor en
`RootLayout.tsx` y el botón/envoltorios de tarjetas en `Home.tsx`.
No añadir efectos ni handlers a los módulos anunciados ni a `SectionCard`.
Únicas entradas de la aplicación: sesión autenticada y React Router.
El proveedor ofrece también el botón en el panel de responsables si hay entradas
con `access.kind: "area"`; no necesita modificar ese panel.

| Consultó la novedad | Entró al módulo | Etiqueta «Nuevo» |
| --- | --- | --- |
| No | No | Permanece |
| Sí | No | Permanece |
| No | Sí | Permanece |
| Sí | Sí | Desaparece |

- Ambas condiciones se registran por usuario y novedad/revisión, en cualquier
  orden. La visita debe corresponder a la revisión vigente y una ruta autorizada;
  también cuentan entradas directas. Abrir una entrada no consulta las demás.
- El botón cuenta entradas sin consultar. La tarjeta conserva «Nuevo» mientras
  alguna entrada aplicable no cumpla ambas condiciones. El diálogo sigue disponible.
- Carrusel manual, una entrada por diapositiva. Flechas, puntos, teclado y gesto
  horizontal; sin avance automático. Las tarjetas laterales son decorativas y no
  cuentan como consultadas. Respeta movimiento reducido y oculta controles si hay una entrada.
- `localStorage` propio por usuario e instalación (`BASE_URL`); si falla, memoria.
  No sincroniza entre dispositivos. Solo conserva identificadores del catálogo activo.
- Reemplazar `currentFeatures.ts` con cada entrega: lenguaje de usuario, resumen,
  ubicación exacta e imagen local opcional con `alt`. Sin historial de novedades.
  Cambiar `revision` para volver a anunciar una entrada; no cambiarla por un refactor.
- Filtros privados, sin reutilizar helpers de otros módulos. Mantener equivalencia
  con permisos reales: módulo/tab/nivel, `MAIN`, alias y excepción master.
  `exactTab: true` impide heredar `MAIN` (p. ej. Personal/PERMISOS).
  Para funciones con condiciones adicionales, incorporarlas al filtro antes de anunciarlas.
- El catálogo del frontend controla visibilidad, no confidencialidad ni autorización
  del backend. No incluir datos privados en textos o imágenes.
- Catálogo inicial: presentación de Novedades en Inicio. Los ejemplos de varios
  módulos están exclusivamente en la historia aislada para revisión manual.
- Gaphor: no había un diagrama específico; cualquier representación nueva es manual.
