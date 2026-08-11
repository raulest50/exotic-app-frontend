import { Alert, Badge, Box, HStack, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import ReporteHyLButton from "./ReporteHyLButton";
import type {
    EdicionReporteProduccion,
    ReporteProduccionPendiente,
} from "./types";
import { consolidarProductos, formatCantidad } from "./produccionCierreUtils";
import { LuCircleCheck } from 'react-icons/lu';

interface Props {
    fechaProduccion: string;
    reportes: ReporteProduccionPendiente[];
    ediciones: Record<number, EdicionReporteProduccion>;
    generado: boolean;
    onGenerated: () => void;
    onInvalidated: () => void;
}

export default function IngresoTerminadosStep3HyL({
    fechaProduccion,
    reportes,
    ediciones,
    generado,
    onGenerated,
    onInvalidated,
}: Props) {
    const consolidados = consolidarProductos(reportes, ediciones);

    return (
        <VStack align="stretch" gap={5}>
            <Alert.Root status={generado ? "success" : "warning"} borderRadius="md">
                <Alert.Indicator />
                {generado
                    ? "El reporte HyL corresponde a las cantidades confirmadas actuales."
                    : "Debe descargar el reporte HyL antes de continuar al cierre."}
            </Alert.Root>

            <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={3}>
                {consolidados.map((producto) => (
                    <Box key={producto.productoId} borderWidth="1px" borderRadius="md" px={4} py={3}>
                        <Text fontWeight="semibold" lineClamp={2}>{producto.productoNombre}</Text>
                        <HStack mt={2} justify="space-between">
                            <Text fontSize="sm" color="app.textSubtle">{producto.lotes} lote(s)</Text>
                            <Badge colorPalette="teal">
                                {formatCantidad(producto.cantidadConfirmada)} {producto.tipoUnidades || "unidades"}
                            </Badge>
                        </HStack>
                    </Box>
                ))}
            </SimpleGrid>

            <Box maxW={{ base: "100%", md: "420px" }}>
                <ReporteHyLButton
                    fechaReporte={fechaProduccion}
                    ingresos={consolidados.map((producto) => ({
                        productoId: producto.productoId,
                        productoNombre: producto.productoNombre,
                        cantidadProducida: producto.cantidadConfirmada,
                    }))}
                    onGenerated={onGenerated}
                    onInvalidated={onInvalidated}
                />
            </Box>

            {generado ? (
                <HStack color="green.600" fontSize="sm">
                    <LuCircleCheck />
                    <Text>HyL listo para este cierre.</Text>
                </HStack>
            ) : null}
        </VStack>
    );
}
