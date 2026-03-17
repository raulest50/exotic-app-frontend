export const soloInsumosSchema = {
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "exportedAt", "terminados"],
    properties: {
        schemaVersion: { type: "integer", const: 1 },
        // Jackson serializa LocalDateTime sin zona horaria; aceptamos ese formato exacto del export actual.
        exportedAt: {
            type: "string",
            pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,9})?$",
        },
        terminados: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                required: [
                    "productoId",
                    "nombre",
                    "observaciones",
                    "costo",
                    "ivaPercentual",
                    "tipoUnidades",
                    "cantidadUnidad",
                    "stockMinimo",
                    "inventareable",
                    "status",
                    "categoria",
                    "fotoUrl",
                    "prefijoLote",
                    "insumos",
                ],
                properties: {
                    productoId: { type: "string", minLength: 1 },
                    nombre: { type: "string", minLength: 1 },
                    observaciones: { type: ["string", "null"] },
                    costo: { type: "number" },
                    ivaPercentual: { type: "number", enum: [0, 5, 19] },
                    tipoUnidades: { type: "string", enum: ["L", "KG", "U"] },
                    cantidadUnidad: { type: "number" },
                    stockMinimo: { type: "number" },
                    inventareable: { type: "boolean" },
                    status: { type: "integer", enum: [0, 1] },
                    categoria: {
                        type: ["object", "null"],
                        additionalProperties: false,
                        required: ["categoriaId", "categoriaNombre"],
                        properties: {
                            categoriaId: { type: "integer" },
                            categoriaNombre: { type: ["string", "null"] },
                        },
                    },
                    fotoUrl: { type: ["string", "null"] },
                    prefijoLote: { type: ["string", "null"] },
                    insumos: {
                        type: "array",
                        items: {
                            type: "object",
                            additionalProperties: false,
                            required: ["insumoId", "cantidadRequerida", "producto"],
                            properties: {
                                insumoId: { type: "integer" },
                                cantidadRequerida: { type: "number" },
                                producto: {
                                    type: ["object", "null"],
                                    additionalProperties: false,
                                    required: ["productoId", "nombre", "tipoProducto"],
                                    properties: {
                                        productoId: { type: "string", minLength: 1 },
                                        nombre: { type: "string", minLength: 1 },
                                        tipoProducto: { type: "string", enum: ["M", "S", "T"] },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
} as const;
