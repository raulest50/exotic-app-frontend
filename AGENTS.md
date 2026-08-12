# Instrucciones para agentes — frontend

Estas instrucciones aplican a todo el repositorio `exotic-app-frontend`.

## Contexto del proyecto

- Este repositorio contiene únicamente el frontend. El backend Spring Boot está
  en un repositorio separado.
- La aplicación usa React 19.2.8, TypeScript, Vite, Chakra UI v3 y Bun.
- El frontend de producción se despliega actualmente como un Static Site de
  Render. Render ejecuta `vite build` y publica el directorio `dist`.
- El `Dockerfile` no participa en el despliegue actual del Static Site. No usar
  Docker como validación predeterminada salvo que la tarea afecte explícitamente
  el `Dockerfile` o la configuración de despliegue cambie.

## Gestor de paquetes

- Usar Bun exclusivamente.
- `bun.lock` es el lockfile autoritativo.
- No ejecutar `npm install`, `npm ci`, `npm run`, `npx`, Yarn ni pnpm.
- No crear `package-lock.json`, `yarn.lock` ni `pnpm-lock.yaml`.
- Instalar dependencias con `bun install --frozen-lockfile` solamente cuando sea
  necesario.

## Ejecución local

- Iniciar el frontend con:

  ```powershell
  bun run dev
  ```

- Abrir la URL local indicada por Vite, normalmente `http://localhost:5173`.
- En `localhost` o `127.0.0.1`, el frontend consume el backend local en
  `http://localhost:8080`.
- Una prueba funcional que dependa de API requiere que el backend local esté
  disponible y que existan credenciales, permisos y datos adecuados.
- No modificar el backend ni apuntar el frontend local a producción para hacer
  pasar una prueba, salvo solicitud explícita.
- Si no están disponibles el backend, las credenciales o los datos requeridos,
  efectuar las verificaciones posibles y declarar claramente la limitación.
- No dejar servidores iniciados por el agente ejecutándose después de terminar
  la verificación. No iniciar un segundo servidor si ya existe uno reutilizable.

## Validación obligatoria después de cambios de código

Ejecutar desde la raíz del repositorio:

```powershell
bun run lint
bun run vite build
```

`bun run lint` es un gate de regresión: usa la configuración plana de ESLint 10
y la línea base explícita de `eslint-suppressions.json`. No añadir supresiones
para hacer pasar violaciones nuevas sin justificarlo dentro del alcance de la
tarea. Cuando se corrija código previamente suprimido, ejecutar
`bun run lint:suppressions:prune` y conservar la reducción resultante.

`bun run vite build` es el control de paridad con el build actual de Render.
Ambos comandos constituyen la validación automatizada mínima para cambios de
código del frontend.

Para cambios visibles o interactivos:

1. Iniciar la aplicación con `bun run dev`.
2. Hacer una prueba manual de humo de la ruta, pantalla o flujo afectado.
3. Revisar errores relevantes en la consola del navegador y solicitudes de red.
4. Cuando exista una historia aplicable, usar `bun run ladle` para validar el
   componente de forma aislada.

Si la tarea solo cambia documentación o instrucciones y no altera código,
configuración de ejecución ni dependencias, no es necesario ejecutar el build.

## Controles que actualmente no son gates

- No ejecutar `bun test` como verificación predeterminada. El repositorio no
  contiene actualmente una suite de pruebas compatible y el comando termina con
  `No tests found`.
- No exigir que `bun run build` pase. Ese script ejecuta `tsc && vite build`, y
  el type-check completo contiene errores heredados no relacionados con muchas
  tareas locales.
- No ejecutar `tsc` contra archivos `.ts` o `.tsx` individuales. Esto omite
  parte de la configuración del proyecto y puede generar diagnósticos falsos.

Cuando sea útil ejecutar el type-check global, usar exactamente:

```powershell
bunx tsc --noEmit --project tsconfig.json
```

Tratar su resultado como diagnóstico hasta que se sanee la línea base:

- distinguir los errores de archivos modificados de los errores heredados;
- corregir regresiones introducidas por la tarea;
- no ampliar el alcance para corregir deuda no relacionada sin autorización;
- informar por separado los fallos preexistentes.

## Criterio de finalización

Antes de entregar un cambio de código:

- el gate de regresión `bun run lint` debe pasar sin advertencias nuevas;
- el build equivalente a Render, `bun run vite build`, debe pasar;
- el flujo afectado debe probarse manualmente cuando sus dependencias estén
  disponibles;
- no deben introducirse lockfiles de otros gestores;
- deben preservarse los cambios locales ajenos a la tarea;
- el informe final debe enumerar los comandos ejecutados, sus resultados y
  cualquier verificación que no haya sido posible completar.
