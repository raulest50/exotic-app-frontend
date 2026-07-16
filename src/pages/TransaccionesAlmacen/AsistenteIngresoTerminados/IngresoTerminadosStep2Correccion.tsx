import {
    Alert,
    AlertIcon,
    Badge,
    Box,
    FormControl,
    FormLabel,
    HStack,
    Input,
    NumberInput,
    NumberInputField,
    SimpleGrid,
    Text,
    VStack,
} from "@chakra-ui/react";
import type {
    EdicionReporteProduccion,
    ReporteProduccionPendiente,
} from "./types";
import {
    consolidarProductos,
    formatCantidad,
    sameCantidad,
} from "./produccionCierreUtils";

interface Props {
    reportes: ReporteProduccionPendiente[];
    ediciones: Record<number, EdicionReporteProduccion>;
    editable: boolean;
    onChange: (reporteId: number, value: EdicionReporteProduccion) => void;
}

export default function IngresoTerminadosStep2Correccion({
    reportes,
    ediciones,
    editable,
    onChange,
}: Props) {
    const consolidados = consolidarProductos(reportes, ediciones);

    return (
        <VStack align="stretch" spacing={5}>
            {!editable ? (
                <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    Su nivel de acceso permite consultar y generar HyL, pero no corregir cantidades.
                </Alert>
            ) : null}

            <SimpleGrid columns={{ base: 1, sm: 2, xl: 3 }} spacing={3}>
                {consolidados.map((producto) => (
                    <Box key={producto.productoId} borderWidth="1px" borderRadius="md" px={4} py={3}>
                        <Text fontWeight="semibold" noOfLines={1}>{producto.productoNombre}</Text>
                        <HStack mt={2} justify="space-between">
                            <Text fontSize="sm" color="app.textSubtle">{producto.lotes} lote(s)</Text>
                            <Badge colorScheme={sameCantidad(producto.cantidadReportada, producto.cantidadConfirmada) ? "gray" : "orange"}>
                                {formatCantidad(producto.cantidadConfirmada)} {producto.tipoUnidades || "unidades"}
                            </Badge>
                        </HStack>
                    </Box>
                ))}
            </SimpleGrid>

            <VStack align="stretch" spacing={3}>
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

                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                                <FormControl isRequired>
                                    <FormLabel>Cantidad confirmada</FormLabel>
                                    <NumberInput
                                        value={edicion.cantidadConfirmada}
                                        min={0.0001}
                                        precision={4}
                                        clampValueOnBlur={false}
                                        isDisabled={!editable}
                                        onChange={(_, value) => onChange(reporte.reporteId, {
                                            ...edicion,
                                            cantidadConfirmada: value,
                                        })}
                                    >
                                        <NumberInputField inputMode="decimal" />
                                    </NumberInput>
                                </FormControl>

                                <FormControl isRequired={changed} isDisabled={!editable || !changed}>
                                    <FormLabel>Motivo de corrección</FormLabel>
                                    <Input
                                        value={edicion.motivoCorreccion}
                                        maxLength={500}
                                        placeholder={changed ? "Describa la diferencia" : "Sin cambios"}
                                        onChange={(event) => onChange(reporte.reporteId, {
                                            ...edicion,
                                            motivoCorreccion: event.target.value,
                                        })}
                                    />
                                </FormControl>
                            </SimpleGrid>
                        </Box>
                    );
                })}
            </VStack>
        </VStack>
    );
}
