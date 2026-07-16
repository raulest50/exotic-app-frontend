import {
    Alert,
    AlertIcon,
    Badge,
    Box,
    Button,
    FormControl,
    FormLabel,
    HStack,
    Input,
    SimpleGrid,
    Text,
    VStack,
} from "@chakra-ui/react";
import { CheckIcon } from "@chakra-ui/icons";
import type {
    EdicionReporteProduccion,
    ReporteProduccionPendiente,
} from "./types";
import { consolidarProductos, formatCantidad } from "./produccionCierreUtils";

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
        <VStack align="stretch" spacing={5}>
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

            <VStack align="stretch" spacing={2}>
                {reportes.map((reporte) => (
                    <HStack
                        key={reporte.reporteId}
                        justify="space-between"
                        borderBottomWidth="1px"
                        py={2}
                        align="flex-start"
                    >
                        <Box minW={0}>
                            <Text fontWeight="medium" noOfLines={1}>{reporte.productoNombre}</Text>
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
                <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    Se requiere nivel 2 para confirmar el cierre y registrar el ingreso a inventario.
                </Alert>
            ) : (
                <Box maxW="360px">
                    <FormControl isRequired>
                        <FormLabel>Digite el código {codigo} para confirmar</FormLabel>
                        <Input
                            value={codigoIngresado}
                            onChange={(event) => onCodigoChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
                            inputMode="numeric"
                            autoComplete="off"
                            maxLength={4}
                            fontSize="lg"
                            letterSpacing="0"
                        />
                    </FormControl>
                    <Button
                        mt={4}
                        leftIcon={<CheckIcon />}
                        colorScheme="teal"
                        w={{ base: "100%", sm: "auto" }}
                        minH="48px"
                        onClick={onSubmit}
                        isLoading={enviando}
                        loadingText="Confirmando..."
                        isDisabled={codigoIngresado !== codigo}
                    >
                        Confirmar cierre
                    </Button>
                </Box>
            )}
        </VStack>
    );
}
