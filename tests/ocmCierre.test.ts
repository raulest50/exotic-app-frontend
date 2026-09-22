import { describe, expect, test } from "bun:test";
import { formatOcmDate, parseOcmDays } from "../src/features/ocmCierre/format";

describe("configuración de cierre de OCM", () => {
    test("exige días enteros positivos sin redondear decimales ni interpretar exponentes", () => {
        for (const value of ["", "0", "-1", "1.5", "1e2", "2147483648", "diez"]) {
            expect(parseOcmDays(value)).toBeNull();
        }
        expect(parseOcmDays(" 2 ")).toBe(2);
    });

    test("presenta las fechas del backend como hora de Colombia y distingue las desconocidas", () => {
        expect(formatOcmDate(null)).toBe("No registrada");
        expect(formatOcmDate("2026-09-22T10:30:00")).toBe(formatOcmDate("2026-09-22T15:30:00Z"));
    });
});
