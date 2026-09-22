import { expect, test } from "bun:test";
import { ControlRequestKeys } from "../src/features/controles/controlRequestKeys";

test("reintentar el mismo envío conserva la clave incluso después de editar y restaurar los valores", () => {
    const keys = new ControlRequestKeys();
    const request = { controlRequeridoId: 11, lectura: "9.25" };
    const first = keys.forRequest("ejecutar-calidad", request);
    expect(first.length).toBeGreaterThan(0);
    expect(keys.forRequest("ejecutar-calidad", { ...request })).toBe(first);
    expect(keys.forRequest("ejecutar-calidad", { ...request, lectura: "9.50" })).not.toBe(first);
    expect(keys.forRequest("ejecutar-calidad", { ...request })).toBe(first);
});

test("otra operación, requisito o sesión de captura no reutiliza la clave anterior", () => {
    const keys = new ControlRequestKeys();
    const request = { controlRequeridoId: 11, justificacion: "Resultado vigente" };
    const first = keys.forRequest("ejecutar-calidad", request);
    expect(keys.forRequest("revalidar-calidad", request)).not.toBe(first);
    expect(keys.forRequest("ejecutar-calidad", { ...request, controlRequeridoId: 12 })).not.toBe(first);
    expect(new ControlRequestKeys().forRequest("ejecutar-calidad", request)).not.toBe(first);
});
