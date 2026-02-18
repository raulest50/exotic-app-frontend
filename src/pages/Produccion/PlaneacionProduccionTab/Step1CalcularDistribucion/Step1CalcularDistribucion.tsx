import { useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    ButtonGroup,
    Flex,
    Spinner,
    Text,
    VStack,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableContainer,
} from "@chakra-ui/react";
import BetterPagination from "../../../../components/BetterPagination/BetterPagination";
import {
    CargarDatosFilas,
    UnificarDatosFilas,
    AsociarTerminados,
    CalcularDistribucionVentas,
    type TerminadoConVentas,
    type ModoDistribucion,
} from "../PlaneacionProduccionService";

interface Step1CalcularDistribucionProps {
    excelFile: File | null;
    setActiveStep: (step: number) => void;
}

export default function Step1CalcularDistribucion({ excelFile, setActiveStep }: Step1CalcularDistribucionProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [rawData, setRawData] = useState<TerminadoConVentas[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [modo, setModo] = useState<ModoDistribucion>("valor");
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(20);

    useEffect(() => {
        if (!excelFile) {
            console.error("[Step1CalcularDistribucion] No se recibió archivo Excel.");
            setIsLoading(false);
            return;
        }

        let cancelled = false;

        const procesarExcel = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const filasRaw = await CargarDatosFilas(excelFile);
                if (cancelled) return;

                const filasUnificadas = UnificarDatosFilas(filasRaw);
                if (cancelled) return;

                const resultado = await AsociarTerminados(filasUnificadas);
                if (cancelled) return;

                setRawData(resultado);
                console.log("[Step1CalcularDistribucion] Total terminados asociados:", resultado.length);
            } catch (err) {
                console.error("[Step1CalcularDistribucion] Error al procesar:", err);
                if (!cancelled) setError(err instanceof Error ? err.message : String(err));
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        procesarExcel();

        return () => { cancelled = true; };
    }, [excelFile]);

    const distribucion = useMemo(
        () => CalcularDistribucionVentas(rawData, modo),
        [rawData, modo],
    );

    const acumulados = useMemo(() => {
        const arr: number[] = [];
        let acum = 0;
        for (const item of distribucion) {
            acum += item.porcentaje_participacion;
            arr.push(acum);
        }
        return arr;
    }, [distribucion]);

    useEffect(() => {
        setPage(0);
    }, [modo, size]);

    const totalPages = Math.ceil(distribucion.length / size);
    const pageData = distribucion.slice(page * size, (page + 1) * size);
    const pageStartIndex = page * size;

    if (isLoading) {
        return (
            <Flex direction="column" align="center" justify="center" py={16} gap={6}>
                <Spinner thickness="4px" speed="0.65s" emptyColor="gray.200" color="teal.500" size="xl" />
                <Text fontSize="lg" color="gray.600">Procesando informe de ventas...</Text>
            </Flex>
        );
    }

    if (error) {
        return (
            <Box p={4}>
                <Text color="red.500">Error al procesar el informe: {error}</Text>
            </Box>
        );
    }

    if (distribucion.length === 0) {
        return (
            <Box p={4}>
                <Text color="red.500">No se encontraron productos terminados asociados a los datos del informe.</Text>
            </Box>
        );
    }

    const paretoIdx = acumulados.findIndex(a => a >= 80);

    return (
        <VStack spacing={4} align="stretch" p={4}>
            <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
                <Text fontSize="md" color="gray.700">
                    <strong>{distribucion.length}</strong> productos terminados
                    {paretoIdx >= 0 && (
                        <> — el 80% de {modo === "valor" ? "las ventas ($)" : "la cantidad"} se concentra en los primeros <strong>{paretoIdx + 1}</strong> productos</>
                    )}
                </Text>
                <ButtonGroup size="sm" isAttached variant="outline">
                    <Button
                        onClick={() => setModo("valor")}
                        colorScheme={modo === "valor" ? "teal" : "gray"}
                        variant={modo === "valor" ? "solid" : "outline"}
                    >
                        Por Valor ($)
                    </Button>
                    <Button
                        onClick={() => setModo("cantidad")}
                        colorScheme={modo === "cantidad" ? "teal" : "gray"}
                        variant={modo === "cantidad" ? "solid" : "outline"}
                    >
                        Por Cantidad
                    </Button>
                </ButtonGroup>
            </Flex>

            <TableContainer>
                <Table size="sm" variant="simple" colorScheme="teal">
                    <Thead>
                        <Tr>
                            <Th>#</Th>
                            <Th>Código</Th>
                            <Th>Descripción</Th>
                            <Th>Categoría</Th>
                            <Th isNumeric>Cantidad Vendida</Th>
                            <Th isNumeric>Valor Total</Th>
                            <Th isNumeric>% Participación</Th>
                            <Th isNumeric>% Acumulado</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {pageData.map((fila, localIdx) => {
                            const globalIdx = pageStartIndex + localIdx;
                            const acum = acumulados[globalIdx];
                            const prevAcum = globalIdx > 0 ? acumulados[globalIdx - 1] : 0;
                            const isParetoRow = prevAcum < 80 && acum >= 80;
                            const isAbovePareto = acum <= 80;

                            return (
                                <Tr
                                    key={fila.terminado.productoId}
                                    bg={isAbovePareto ? "teal.50" : undefined}
                                    borderBottom={isParetoRow ? "3px solid" : undefined}
                                    borderBottomColor={isParetoRow ? "orange.400" : undefined}
                                >
                                    <Td fontWeight={isParetoRow ? "bold" : "normal"}>{globalIdx + 1}</Td>
                                    <Td>{fila.terminado.productoId}</Td>
                                    <Td>{fila.terminado.nombre}</Td>
                                    <Td>{fila.terminado.categoria?.categoriaNombre ?? "—"}</Td>
                                    <Td isNumeric>{fila.cantidad_vendida.toLocaleString()}</Td>
                                    <Td isNumeric>${fila.valor_total.toLocaleString()}</Td>
                                    <Td isNumeric>{fila.porcentaje_participacion.toFixed(2)}%</Td>
                                    <Td
                                        isNumeric
                                        fontWeight={isParetoRow ? "bold" : "normal"}
                                        color={isParetoRow ? "orange.600" : undefined}
                                    >
                                        {acum.toFixed(2)}%
                                    </Td>
                                </Tr>
                            );
                        })}
                    </Tbody>
                </Table>
            </TableContainer>

            <BetterPagination
                page={page}
                size={size}
                totalPages={totalPages}
                onPageChange={setPage}
                onSizeChange={setSize}
            />
        </VStack>
    );
}
