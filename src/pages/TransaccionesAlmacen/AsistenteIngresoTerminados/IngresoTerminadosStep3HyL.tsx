import {
    Alert,
    AlertIcon,
    Badge,
    Box,
    HStack,
    SimpleGrid,
    Text,
    VStack,
} from "@chakra-ui/react";
import { CheckCircleIcon } from "@chakra-ui/icons";
import ReporteHyLButton from "./ReporteHyLButton";
import type {
    EdicionReporteProduccion,
    ReporteProduccionPendiente,
} from "./types";
import { consolidarProductos, formatCantidad } from "./produccionCierreUtils";

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
        <VStack align="stretch" spacing={5}>
            <Alert status={generado ? "success" : "warning"} borderRadius="md">
                <AlertIcon />
                {generado
                    ? "El reporte HyL corresponde a las cantidades confirmadas actuales."
                    : "Debe descargar el reporte HyL antes de continuar al cierre."}
            </Alert>

            <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={3}>
                {consolidados.map((producto) => (
                    <Box key={producto.productoId} borderWidth="1px" borderRadius="md" px={4} py={3}>
                        <Text fontWeight="semibold" noOfLines={2}>{producto.productoNombre}</Text>
                        <HStack mt={2} justify="space-between">
                            <Text fontSize="sm" color="app.textSubtle">{producto.lotes} lote(s)</Text>
                            <Badge colorScheme="teal">
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
                    <CheckCircleIcon />
                    <Text>HyL listo para este cierre.</Text>
                </HStack>
            ) : null}
        </VStack>
    );
}
