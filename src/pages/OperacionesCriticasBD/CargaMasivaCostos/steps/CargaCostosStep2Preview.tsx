import {
    Alert,
    Badge,
    Box,
    Button,
    Flex,
    Heading,
    HStack,
    SimpleGrid,
    Spinner,
    Stat,
    Table,
    Text,
    VStack,
} from "@chakra-ui/react";
import {
    CargaCostosDependenciasPage,
    CargaCostosItemsPage,
    CargaCostosPreparacion,
} from "../types";

interface CargaCostosStep2PreviewProps {
    preparacion: CargaCostosPreparacion;
    itemsPage: CargaCostosItemsPage | null;
    dependenciasPage: CargaCostosDependenciasPage | null;
    loadingItems: boolean;
    loadingDependencias: boolean;
    busy: boolean;
    onPageChange: (page: number) => void;
    onDependenciasPageChange: (page: number) => void;
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
    dependenciasPage,
    loadingItems,
    loadingDependencias,
    busy,
    onPageChange,
    onDependenciasPageChange,
    onCancel,
    onContinue,
}: CargaCostosStep2PreviewProps) {
    const page = itemsPage?.page ?? 0;
    const totalPages = Math.max(1, itemsPage?.totalPages ?? 1);
    const dependenciasPageNumber = dependenciasPage?.page ?? 0;
    const dependenciasTotalPages = Math.max(1, dependenciasPage?.totalPages ?? 1);

    return (
        <VStack align="stretch" gap={5}>
            <SimpleGrid columns={{ base: 2, md: 3, xl: 5 }} gap={3}>
                <Stat.Root><Stat.Label>Candidatos</Stat.Label><Stat.ValueText>{preparacion.totalCandidatas}</Stat.ValueText></Stat.Root>
                <Stat.Root><Stat.Label>Materiales a cambiar</Stat.Label><Stat.ValueText>{preparacion.totalActualizadas}</Stat.ValueText></Stat.Root>
                <Stat.Root><Stat.Label>Materiales sin cambio</Stat.Label><Stat.ValueText>{preparacion.totalSinCambio}</Stat.ValueText></Stat.Root>
                <Stat.Root><Stat.Label>Semiterminados</Stat.Label><Stat.ValueText>{preparacion.totalSemiterminados}</Stat.ValueText></Stat.Root>
                <Stat.Root><Stat.Label>Terminados</Stat.Label><Stat.ValueText>{preparacion.totalTerminados}</Stat.ValueText></Stat.Root>
                <Stat.Root><Stat.Label>Dependencias a cambiar</Stat.Label><Stat.ValueText>{preparacion.totalDependenciasActualizadas}</Stat.ValueText></Stat.Root>
                <Stat.Root><Stat.Label>Dependencias sin cambio</Stat.Label><Stat.ValueText>{preparacion.totalDependenciasSinCambio}</Stat.ValueText></Stat.Root>
                <Stat.Root><Stat.Label>Omitidos</Stat.Label><Stat.ValueText>{preparacion.totalOmitidas}</Stat.ValueText></Stat.Root>
                <Stat.Root>
                    <Stat.Label>Vigencia</Stat.Label>
                    <Text fontSize="sm">{new Date(preparacion.expiraEn).toLocaleString("es-CO")}</Text>
                </Stat.Root>
            </SimpleGrid>

            <Box borderWidth="1px" borderRadius="md" p={3}>
                <Text fontWeight="semibold">{preparacion.nombreArchivo}</Text>
                <Text fontSize="sm">Motivo: {preparacion.motivo}</Text>
                <Text fontSize="xs" color="gray.500" wordBreak="break-all">Lote: {preparacion.loteId}</Text>
            </Box>

            {preparacion.advertencias.map((warning) => (
                <Alert.Root status="warning" key={warning}>
                    <Alert.Indicator />
                    <Alert.Description>{warning}</Alert.Description>
                </Alert.Root>
            ))}

            {!itemsPage && !loadingItems && (
                <Alert.Root status="error">
                    <Alert.Indicator />
                    <Flex w="full" align="center" justify="space-between" gap={3} flexWrap="wrap">
                        <Alert.Description>No fue posible cargar el detalle para revisarlo.</Alert.Description>
                        <Button size="sm" onClick={() => onPageChange(0)}>Reintentar</Button>
                    </Flex>
                </Alert.Root>
            )}

            <Heading as="h3" size="sm">Materiales incluidos en el Excel</Heading>

            <Box position="relative" minH="160px">
                {loadingItems && (
                    <Flex position="absolute" inset={0} bg="blackAlpha.50" zIndex={1} align="center" justify="center">
                        <Spinner size="lg" />
                    </Flex>
                )}
                <Table.ScrollArea borderWidth="1px" borderRadius="md" overflowX="auto">
                    <Table.Root size="sm">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>Fila</Table.ColumnHeader>
                                <Table.ColumnHeader>Codigo</Table.ColumnHeader>
                                <Table.ColumnHeader>Nombre en sistema</Table.ColumnHeader>
                                <Table.ColumnHeader>Descripcion Excel</Table.ColumnHeader>
                                <Table.ColumnHeader>Descripcion</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign='end'>Actual</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign='end'>Nuevo</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign='end'>Diferencia</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign='end'>%</Table.ColumnHeader>
                                <Table.ColumnHeader>Accion</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {(itemsPage?.items ?? []).map((item) => (
                                <Table.Row key={`${item.fila}-${item.productoId}`}>
                                    <Table.Cell>{item.fila}</Table.Cell>
                                    <Table.Cell>{item.productoId}</Table.Cell>
                                    <Table.Cell>{item.nombreProducto ?? "-"}</Table.Cell>
                                    <Table.Cell>{item.descripcionExcel ?? "-"}</Table.Cell>
                                    <Table.Cell>
                                        <Badge colorPalette={item.descripcionCoincide ? "green" : "yellow"}>
                                            {item.descripcionCoincide ? "Coincide" : "Revisar"}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell textAlign='end'>{money(item.costoActual)}</Table.Cell>
                                    <Table.Cell textAlign='end'>{money(item.costoNuevo)}</Table.Cell>
                                    <Table.Cell textAlign='end'>{money(item.diferencia)}</Table.Cell>
                                    <Table.Cell textAlign='end'>
                                        {item.porcentajeCambio === null ? "N/A" : `${money(item.porcentajeCambio)}%`}
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Badge colorPalette={item.cambia ? "orange" : "gray"}>
                                            {item.cambia ? "Cambiar" : "Sin cambio"}
                                        </Badge>
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Table.ScrollArea>
            </Box>

            <HStack justify="space-between" flexWrap="wrap">
                <Button
                    variant="outline"
                    onClick={() => onPageChange(Math.max(0, page - 1))}
                    disabled={loadingItems || page === 0}
                >
                    Anterior
                </Button>
                <Text>Pagina {page + 1} de {totalPages}</Text>
                <Button
                    variant="outline"
                    onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
                    disabled={loadingItems || page + 1 >= totalPages}
                >
                    Siguiente
                </Button>
            </HStack>

            {!dependenciasPage && !loadingDependencias && (
                <Alert.Root status="error">
                    <Alert.Indicator />
                    <Flex w="full" align="center" justify="space-between" gap={3} flexWrap="wrap">
                        <Alert.Description>
                            No fue posible cargar el detalle de la propagacion.
                        </Alert.Description>
                        <Button size="sm" onClick={() => onDependenciasPageChange(0)}>
                            Reintentar
                        </Button>
                    </Flex>
                </Alert.Root>
            )}

            <Heading as="h3" size="sm">Propagacion a semiterminados y terminados</Heading>

            {preparacion.totalDependencias === 0 && dependenciasPage && (
                <Alert.Root status="info">
                    <Alert.Indicator />
                    <Alert.Description>
                        Los materiales modificados no tienen dependencias de receta.
                    </Alert.Description>
                </Alert.Root>
            )}

            {preparacion.totalDependencias > 0 && (
                <>
                    <Box position="relative" minH="160px">
                        {loadingDependencias && (
                            <Flex
                                position="absolute"
                                inset={0}
                                bg="blackAlpha.50"
                                zIndex={1}
                                align="center"
                                justify="center"
                            >
                                <Spinner size="lg" />
                            </Flex>
                        )}
                        <Table.ScrollArea borderWidth="1px" borderRadius="md" overflowX="auto">
                            <Table.Root size="sm">
                                <Table.Header>
                                    <Table.Row>
                                        <Table.ColumnHeader>Nivel</Table.ColumnHeader>
                                        <Table.ColumnHeader>Tipo</Table.ColumnHeader>
                                        <Table.ColumnHeader>Codigo</Table.ColumnHeader>
                                        <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign='end'>Actual</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign='end'>Proyectado</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign='end'>Diferencia</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign='end'>%</Table.ColumnHeader>
                                        <Table.ColumnHeader>Accion</Table.ColumnHeader>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {(dependenciasPage?.items ?? []).map((item) => (
                                        <Table.Row key={item.productoId}>
                                            <Table.Cell>{item.nivel}</Table.Cell>
                                            <Table.Cell>
                                                <Badge colorPalette={item.tipoProducto === "S" ? "purple" : "blue"}>
                                                    {item.tipoProducto === "S" ? "Semiterminado" : "Terminado"}
                                                </Badge>
                                            </Table.Cell>
                                            <Table.Cell>{item.productoId}</Table.Cell>
                                            <Table.Cell>{item.nombreProducto ?? "-"}</Table.Cell>
                                            <Table.Cell textAlign='end'>{money(item.costoActual)}</Table.Cell>
                                            <Table.Cell textAlign='end'>{money(item.costoNuevo)}</Table.Cell>
                                            <Table.Cell textAlign='end'>{money(item.diferencia)}</Table.Cell>
                                            <Table.Cell textAlign='end'>
                                                {item.porcentajeCambio === null
                                                    ? "N/A"
                                                    : `${money(item.porcentajeCambio)}%`}
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Badge colorPalette={item.cambia ? "orange" : "gray"}>
                                                    {item.cambia ? "Cambiar" : "Sin cambio"}
                                                </Badge>
                                            </Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table.Root>
                        </Table.ScrollArea>
                    </Box>

                    <HStack justify="space-between" flexWrap="wrap">
                        <Button
                            variant="outline"
                            onClick={() => onDependenciasPageChange(
                                Math.max(0, dependenciasPageNumber - 1),
                            )}
                            disabled={loadingDependencias || dependenciasPageNumber === 0}
                        >
                            Anterior
                        </Button>
                        <Text>
                            Pagina {dependenciasPageNumber + 1} de {dependenciasTotalPages}
                        </Text>
                        <Button
                            variant="outline"
                            onClick={() => onDependenciasPageChange(
                                Math.min(
                                    dependenciasTotalPages - 1,
                                    dependenciasPageNumber + 1,
                                ),
                            )}
                            disabled={
                                loadingDependencias
                                || dependenciasPageNumber + 1 >= dependenciasTotalPages
                            }
                        >
                            Siguiente
                        </Button>
                    </HStack>
                </>
            )}

            <Flex justify="space-between" gap={3} flexWrap="wrap">
                <Button variant="outline" onClick={onCancel} loading={busy}>Cancelar carga</Button>
                <Button
                    colorPalette="orange"
                    onClick={onContinue}
                    loading={busy}
                    disabled={
                        !itemsPage
                        || !dependenciasPage
                        || preparacion.totalActualizadas === 0
                        || loadingItems
                        || loadingDependencias
                    }
                >
                    Ir a confirmacion
                </Button>
            </Flex>
        </VStack>
    );
}
