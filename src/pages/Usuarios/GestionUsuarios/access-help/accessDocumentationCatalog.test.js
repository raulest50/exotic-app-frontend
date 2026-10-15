import { describe, expect, test } from "bun:test";
import { TABS_BY_MODULO } from "../../../../auth/moduleTabDefinitions.ts";
import { Modulo } from "../types.tsx";
import {
    ACCESS_DOCUMENTATION_CATALOG,
    ACCESS_DOCUMENTATION_MODULES,
    maxDocumentedLevel,
} from "./accessDocumentationCatalog.ts";

describe("catálogo de documentación de accesos", () => {
    test("cubre todos los módulos y pestañas configurables", () => {
        expect(ACCESS_DOCUMENTATION_MODULES).toHaveLength(Object.values(Modulo).length);
        expect(ACCESS_DOCUMENTATION_MODULES.flatMap((module) => module.tabs)).toHaveLength(77);

        for (const modulo of Object.values(Modulo)) {
            expect(ACCESS_DOCUMENTATION_CATALOG[modulo].modulo).toBe(modulo);
            expect(ACCESS_DOCUMENTATION_CATALOG[modulo].tabs.length).toBeGreaterThan(0);
        }
    });

    test("mantiene identificadores únicos y niveles consecutivos desde 1", () => {
        for (const moduleDocumentation of ACCESS_DOCUMENTATION_MODULES) {
            const tabIds = moduleDocumentation.tabs.map((tab) => tab.tabId);
            expect(new Set(tabIds).size).toBe(tabIds.length);

            for (const tabDocumentation of moduleDocumentation.tabs) {
                const actualLevels = tabDocumentation.niveles.map((item) => item.nivel);
                const expectedLevels = Array.from(
                    { length: maxDocumentedLevel(tabDocumentation) },
                    (_, index) => index + 1,
                );
                expect(actualLevels).toEqual(expectedLevels);
                expect(tabDocumentation.label.trim()).not.toBe("");
                expect(tabDocumentation.resumen.trim()).not.toBe("");
                for (const levelDocumentation of tabDocumentation.niveles) {
                    expect(levelDocumentation.titulo.trim()).not.toBe("");
                    expect(
                        levelDocumentation.permite.length > 0
                        || (levelDocumentation.noIncluye?.length ?? 0) > 0,
                    ).toBe(true);
                }
            }
        }
    });

    test("deriva sin pérdidas el catálogo estructural usado por la aplicación", () => {
        for (const modulo of Object.values(Modulo)) {
            expect(TABS_BY_MODULO[modulo]).toEqual(
                ACCESS_DOCUMENTATION_CATALOG[modulo].tabs.map((tab) => ({
                    tabId: tab.tabId,
                    label: tab.label,
                    maxNivel: maxDocumentedLevel(tab),
                })),
            );
        }
    });

    test("conserva los rangos especializados de Producción y Calidad", () => {
        expect(TABS_BY_MODULO[Modulo.PRODUCCION].map(({ tabId, maxNivel }) => [tabId, maxNivel])).toEqual([
            ["PLANEACION_PRODUCCION", 4],
            ["PROGRAMACION_PRODUCCION", 4],
            ["APROBACION_MPS_WEEK", 4],
            ["CREAR_ODP_MANUALMENTE", 4],
            ["CREAR_ORDEN_FABRICACION", 2],
            ["PLANES_CONTROL_PROCESO", 3],
            ["REGISTRAR_CONTROL_PROCESO", 2],
            ["DESVIACIONES_CONTROL_PROCESO", 2],
            ["HISTORIAL_CONTROL_PROCESO", 1],
            ["MONITOREAR_AREAS_OPERATIVAS", 4],
            ["HISTORIAL", 4],
            ["CONSULTAR_BATCH_RECORD", 2],
            ["PARAMETROS_POR_CATEGORIA", 4],
        ]);
        expect(TABS_BY_MODULO[Modulo.CALIDAD].map(({ tabId, maxNivel }) => [tabId, maxNivel])).toEqual([
            ["PLANES_CONTROL_CALIDAD", 3],
            ["REGISTRAR_CONTROL_CALIDAD", 2],
            ["DESVIACIONES_CONTROL_CALIDAD", 3],
            ["HISTORIAL_CONTROL_CALIDAD", 1],
            ["REVISION_LIBERACION_LOTES", 3],
        ]);
    });
});
