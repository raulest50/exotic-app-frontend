import {
    Alert,
    AlertDescription,
    AlertIcon,
    Badge,
    Box,
    Button,
    Flex,
    HStack,
    SimpleGrid,
    Spinner,
    Stat,
    StatLabel,
    StatNumber,
    Table,
    TableContainer,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    VStack,
} from "@chakra-ui/react";
import { CargaCostosItemsPage, CargaCostosPreparacion } from "../types";

interface CargaCostosStep2PreviewProps {
    preparacion: CargaCostosPreparacion;
    itemsPage: CargaCostosItemsPage | null;
    loadingItems: boolean;
    busy: boolean;
    onPageChange: (page: number) => void;
    onCancel: () => void;
    onContinue: () => void;
}

function money(value: number): string {
    return new Intl.NumberFormat("es-CO", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
    }).format(value);
}

export default function CargaCostosStep2Preview({
    preparacion,
    itemsPage,
    loadingItems,
    busy,
    onPageChange,
    onCancel,
    onContinue,
}: CargaCostosStep2PreviewProps) {
    const page = itemsPage?.page ?? 0;
    const totalPages = Math.max(1, itemsPage?.totalPages ?? 1);

    return (
        <VStack align="stretch" spacing={5}>
            <SimpleGrid columns={{ base: 2, md: 5 }} spacing={3}>
                <Stat><StatLabel>Candidatos</StatLabel><StatNumber>{preparacion.totalCandidatas}</StatNumber></Stat>
                <Stat><StatLabel>Cambiaran</StatLabel><StatNumber>{preparacion.totalActualizadas}</StatNumber></Stat>
                <Stat><StatLabel>Sin cambio</StatLabel><StatNumber>{preparacion.totalSinCambio}</StatNumber></Stat>
                <Stat><StatLabel>Omitidos</StatLabel><StatNumber>{preparacion.totalOmitidas}</StatNumber></Stat>
                <Stat>
                    <StatLabel>Vigencia</StatLabel>
                    <Text fontSize="sm">{new Date(preparacion.expiraEn).toLocaleString("es-CO")}</Text>
                </Stat>
            </SimpleGrid>

            <Box borderWidth="1px" borderRadius="md" p={3}>
                <Text fontWeight="semibold">{preparacion.nombreArchivo}</Text>
                <Text fontSize="sm">Motivo: {preparacion.motivo}</Text>
                <Text fontSize="xs" color="gray.500" wordBreak="break-all">Lote: {preparacion.loteId}</Text>
            </Box>

            {preparacion.advertencias.map((warning) => (
                <Alert status="warning" key={warning}>
                    <AlertIcon />
                    <AlertDescription>{warning}</AlertDescription>
                </Alert>
            ))}

            {!itemsPage && !loadingItems && (
                <Alert status="error">
                    <AlertIcon />
                    <Flex w="full" align="center" justify="space-between" gap={3} flexWrap="wrap">
                        <AlertDescription>No fue posible cargar el detalle para revisarlo.</AlertDescription>
                        <Button size="sm" onClick={() => onPageChange(0)}>Reintentar</Button>
                    </Flex>
                </Alert>
            )}

            <Box position="relative" minH="160px">
                {loadingItems && (
                    <Flex position="absolute" inset={0} bg="blackAlpha.50" zIndex={1} align="center" justify="center">
                        <Spinner size="lg" />
                    </Flex>
                )}
                <TableContainer borderWidth="1px" borderRadius="md" overflowX="auto">
                    <Table size="sm">
                        <Thead>
                            <Tr>
                                <Th>Fila</Th>
                                <Th>Codigo</Th>
                                <Th>Nombre en sistema</Th>
                                <Th>Descripcion Excel</Th>
                                <Th>Descripcion</Th>
                                <Th isNumeric>Actual</Th>
                                <Th isNumeric>Nuevo</Th>
                                <Th isNumeric>Diferencia</Th>
                                <Th isNumeric>%</Th>
                                <Th>Accion</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {(itemsPage?.items ?? []).map((item) => (
                                <Tr key={`${item.fila}-${item.productoId}`}>
                                    <Td>{item.fila}</Td>
                                    <Td>{item.productoId}</Td>
                                    <Td>{item.nombreProducto ?? "-"}</Td>
                                    <Td>{item.descripcionExcel ?? "-"}</Td>
                                    <Td>
                                        <Badge colorScheme={item.descripcionCoincide ? "green" : "yellow"}>
                                            {item.descripcionCoincide ? "Coincide" : "Revisar"}
                                        </Badge>
                                    </Td>
                                    <Td isNumeric>{money(item.costoActual)}</Td>
                                    <Td isNumeric>{money(item.costoNuevo)}</Td>
                                    <Td isNumeric>{money(item.diferencia)}</Td>
                                    <Td isNumeric>
                                        {item.porcentajeCambio === null ? "N/A" : `${money(item.porcentajeCambio)}%`}
                                    </Td>
                                    <Td>
                                        <Badge colorScheme={item.cambia ? "orange" : "gray"}>
                                            {item.cambia ? "Cambiar" : "Sin cambio"}
                                        </Badge>
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </TableContainer>
            </Box>

            <HStack justify="space-between" flexWrap="wrap">
                <Button
                    variant="outline"
                    onClick={() => onPageChange(Math.max(0, page - 1))}
                    isDisabled={loadingItems || page === 0}
                >
                    Anterior
                </Button>
                <Text>Pagina {page + 1} de {totalPages}</Text>
                <Button
                    variant="outline"
                    onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
                    isDisabled={loadingItems || page + 1 >= totalPages}
                >
                    Siguiente
                </Button>
            </HStack>

            <Flex justify="space-between" gap={3} flexWrap="wrap">
                <Button variant="outline" onClick={onCancel} isLoading={busy}>Cancelar carga</Button>
                <Button
                    colorScheme="orange"
                    onClick={onContinue}
                    isLoading={busy}
                    isDisabled={!itemsPage || preparacion.totalActualizadas === 0 || loadingItems}
                >
                    Ir a confirmacion
                </Button>
            </Flex>
        </VStack>
    );
}
