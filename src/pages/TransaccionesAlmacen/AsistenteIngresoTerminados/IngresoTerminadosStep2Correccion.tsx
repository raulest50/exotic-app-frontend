import { Alert, Badge, Box, HStack, Input, NumberInput, SimpleGrid, Text, VStack, Field } from "@chakra-ui/react";
import type {
    EdicionReporteProduccion,
    ReporteProduccionPendiente,
} from "./types";
import {
    consolidarProductos,
    formatCantidad,
    sameCantidad,
} from "./produccionCierreUtils";

const UNIDAD_LABEL: Record<"DIAS" | "MESES" | "ANIOS", string> = {
    DIAS: "dias",
    MESES: "meses",
    ANIOS: "anios",
};

function getVencimientoHelper(reporte: ReporteProduccionPendiente): string {
    if (reporte.fechaVencimientoSugerida && reporte.vidaUtilUnidadAplicada) {
        return `Sugerida por la categoria: ${reporte.fechaVencimientoSugerida} (${reporte.vidaUtilCantidadAplicada} ${UNIDAD_LABEL[reporte.vidaUtilUnidadAplicada]}). Puede modificarla.`;
    }
    if (reporte.fechaVencimientoSugerida) {
        return "El lote ya tenia esta fecha registrada.";
    }
    return "El lote no tiene vida util automatica. Ingrese la fecha manualmente.";
}

interface Props {
    fechaProduccion: string;
    reportes: ReporteProduccionPendiente[];
    ediciones: Record<number, EdicionReporteProduccion>;
    editable: boolean;
    onChange: (reporteId: number, value: EdicionReporteProduccion) => void;
}

export default function IngresoTerminadosStep2Correccion({
    fechaProduccion,
    reportes,
    ediciones,
    editable,
    onChange,
}: Props) {
    const consolidados = consolidarProductos(reportes, ediciones);
    const fechaMinimaVencimiento = (() => {
        const fecha = new Date(`${fechaProduccion}T00:00:00Z`);
        fecha.setUTCDate(fecha.getUTCDate() + 1);
        return fecha.toISOString().slice(0, 10);
    })();

    return (
        <VStack align="stretch" gap={5}>
            {!editable ? (
                <Alert.Root status="info" borderRadius="md">
                    <Alert.Indicator />
                    Su nivel de acceso permite consultar y generar HyL, pero no modificar los datos del cierre.
                </Alert.Root>
            ) : null}

            <SimpleGrid columns={{ base: 1, sm: 2, xl: 3 }} gap={3}>
                {consolidados.map((producto) => (
                    <Box key={producto.productoId} borderWidth="1px" borderRadius="md" px={4} py={3}>
                        <Text fontWeight="semibold" lineClamp={1}>{producto.productoNombre}</Text>
                        <HStack mt={2} justify="space-between">
                            <Text fontSize="sm" color="app.textSubtle">{producto.lotes} lote(s)</Text>
                            <Badge colorPalette={sameCantidad(producto.cantidadReportada, producto.cantidadConfirmada) ? "gray" : "orange"}>
                                {formatCantidad(producto.cantidadConfirmada)} {producto.tipoUnidades || "unidades"}
                            </Badge>
                        </HStack>
                    </Box>
                ))}
            </SimpleGrid>

            <VStack align="stretch" gap={3}>
                {reportes.map((reporte) => {
                    const edicion = ediciones[reporte.reporteId];
                    const changed = !sameCantidad(edicion.cantidadConfirmada, reporte.cantidadReportada);
                    return (
                        <Box key={reporte.reporteId} borderWidth="1px" borderRadius="md" p={{ base: 3, md: 4 }}>
                            <HStack
                                justify="space-between"
                                align={{ base: "flex-start", md: "center" }}
                                flexDir={{ base: "column", md: "row" }}
                                mb={4}
                            >
                                <Box>
                                    <Text fontWeight="semibold">{reporte.productoNombre}</Text>
                                    <Text fontSize="sm" color="app.textSubtle">
                                        {reporte.lote} · OP {reporte.ordenProduccionId}
                                    </Text>
                                </Box>
                                <Text fontSize="sm">
                                    Reportado: <strong>{formatCantidad(reporte.cantidadReportada)}</strong>
                                </Text>
                            </HStack>

                            <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
                                <Field.Root required>
                                    <Field.Label>Cantidad confirmada</Field.Label>
                                    <NumberInput.Root
                                        value={String(edicion.cantidadConfirmada)}
                                        min={0.0001}
                                        formatOptions={{ maximumFractionDigits: 4 }}
                                        clampValueOnBlur={false}
                                        disabled={!editable}
                                        onValueChange={({ valueAsNumber }) => onChange(reporte.reporteId, {
                                            ...edicion,
                                            cantidadConfirmada: valueAsNumber,
                                        })}
                                    >
                                        <NumberInput.Input inputMode="decimal" />
                                    </NumberInput.Root>
                                </Field.Root>

                                <Field.Root required={changed} disabled={!editable || !changed}>
                                    <Field.Label>Motivo de corrección</Field.Label>
                                    <Input
                                        value={edicion.motivoCorreccion}
                                        maxLength={500}
                                        placeholder={changed ? "Describa la diferencia" : "Sin cambios"}
                                        onChange={(event) => onChange(reporte.reporteId, {
                                            ...edicion,
                                            motivoCorreccion: event.target.value,
                                        })}
                                    />
                                </Field.Root>

                                <Field.Root required disabled={!editable}>
                                    <Field.Label>Fecha de vencimiento</Field.Label>
                                    <Input
                                        type="date"
                                        value={edicion.fechaVencimiento}
                                        min={fechaMinimaVencimiento}
                                        onChange={(event) => onChange(reporte.reporteId, {
                                            ...edicion,
                                            fechaVencimiento: event.target.value,
                                        })}
                                    />
                                    <Field.HelperText>
                                        {getVencimientoHelper(reporte)}
                                    </Field.HelperText>
                                </Field.Root>
                            </SimpleGrid>
                        </Box>
                    );
                })}
            </VStack>
        </VStack>
    );
}
