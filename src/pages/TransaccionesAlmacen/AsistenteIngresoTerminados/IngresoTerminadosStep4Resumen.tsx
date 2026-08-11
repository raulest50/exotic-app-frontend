import {
    Steps,
    Alert,
    Badge,
    Box,
    Button,
    HStack,
    Input,
    SimpleGrid,
    Text,
    VStack,
    Field,
} from "@chakra-ui/react";
import type {
    EdicionReporteProduccion,
    ReporteProduccionPendiente,
} from "./types";
import { consolidarProductos, formatCantidad } from "./produccionCierreUtils";
import { LuCheck } from 'react-icons/lu';

interface Props {
    reportes: ReporteProduccionPendiente[];
    ediciones: Record<number, EdicionReporteProduccion>;
    codigo: string;
    codigoIngresado: string;
    puedeCerrar: boolean;
    enviando: boolean;
    onCodigoChange: (codigo: string) => void;
    onSubmit: () => void;
}

export default function IngresoTerminadosStep4Resumen({
    reportes,
    ediciones,
    codigo,
    codigoIngresado,
    puedeCerrar,
    enviando,
    onCodigoChange,
    onSubmit,
}: Props) {
    const consolidados = consolidarProductos(reportes, ediciones);

    return (
        <VStack align="stretch" gap={5}>
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

            <VStack align="stretch" gap={2}>
                {reportes.map((reporte) => (
                    <HStack
                        key={reporte.reporteId}
                        justify="space-between"
                        borderBottomWidth="1px"
                        py={2}
                        align="flex-start"
                    >
                        <Box minW={0}>
                            <Text fontWeight="medium" lineClamp={1}>{reporte.productoNombre}</Text>
                            <Text fontSize="sm" color="app.textSubtle">
                                {reporte.lote} · OP {reporte.ordenProduccionId}
                            </Text>
                        </Box>
                        <Text whiteSpace="nowrap" fontWeight="semibold">
                            {formatCantidad(ediciones[reporte.reporteId].cantidadConfirmada)}
                        </Text>
                    </HStack>
                ))}
            </VStack>

            {!puedeCerrar ? (
                <Alert.Root status="info" borderRadius="md">
                    <Alert.Indicator />
                    Se requiere nivel 2 para confirmar el cierre y registrar el ingreso a inventario.
                </Alert.Root>
            ) : (
                <Box maxW="360px">
                    <Field.Root required>
                        <Field.Label>Digite el código {codigo} para confirmar</Field.Label>
                        <Input
                            value={codigoIngresado}
                            onValueChange={(event) => onCodigoChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
                            inputMode="numeric"
                            autoComplete="off"
                            maxLength={4}
                            fontSize="lg"
                            letterSpacing="0"
                        />
                    </Field.Root>
                    <Button
                        mt={4}
                        colorPalette="teal"
                        w={{ base: "100%", sm: "auto" }}
                        minH="48px"
                        onClick={onSubmit}
                        loading={enviando}
                        loadingText="Confirmando..."
                        disabled={codigoIngresado !== codigo}><LuCheck />Confirmar cierre
                                            </Button>
                </Box>
            )}
        </VStack>
    );
}
