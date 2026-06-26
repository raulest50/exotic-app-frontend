import {
    Alert,
    AlertDescription,
    AlertIcon,
    Badge,
    Box,
    Button,
    Card,
    CardBody,
    CardHeader,
    Divider,
    Flex,
    Heading,
    SimpleGrid,
    Stat,
    StatHelpText,
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
import { ArrowBackIcon, DownloadIcon } from "@chakra-ui/icons";
import { useMemo } from "react";
import { IngresoTerminadoValidado } from "./types";

interface Props {
    ingresosValidados: IngresoTerminadoValidado[];
    setActiveStep: (step: number) => void;
    onSuccess: () => void;
}

interface CategoriaConsolidada {
    categoriaNombre: string;
    referenciasProducidas: number;
    unidadesProducidas: number;
}

const numberFormatter = new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
});

function formatNumber(value: number): string {
    return numberFormatter.format(value);
}

function formatDateDisplay(isoDate: string): string {
    if (!isoDate) return "-";
    const [year, month, day] = isoDate.split("-");
    return `${day}/${month}/${year}`;
}

function buildCategoriaRows(ingresos: IngresoTerminadoValidado[]): CategoriaConsolidada[] {
    const byCategoria = new Map<string, CategoriaConsolidada>();

    for (const ingreso of ingresos) {
        if (ingreso.cantidadProducida <= 0) continue;

        const categoriaNombre = ingreso.categoriaNombre || "Sin categoria";
        const current = byCategoria.get(categoriaNombre) ?? {
            categoriaNombre,
            referenciasProducidas: 0,
            unidadesProducidas: 0,
        };

        current.referenciasProducidas += 1;
        current.unidadesProducidas += ingreso.cantidadProducida;
        byCategoria.set(categoriaNombre, current);
    }

    return Array.from(byCategoria.values()).sort((a, b) =>
        a.categoriaNombre.localeCompare(b.categoriaNombre)
    );
}

export default function IngresoTerminadosStep2_RevisionConfirmacion({
    ingresosValidados,
    setActiveStep,
    onSuccess,
}: Props) {
    const productosProducidos = useMemo(
        () => ingresosValidados.filter((ingreso) => ingreso.cantidadProducida > 0),
        [ingresosValidados]
    );
    const categorias = useMemo(() => buildCategoriaRows(ingresosValidados), [ingresosValidados]);

    const fechaReporte = ingresosValidados[0]?.fechaReporte ?? "";
    const totalReferenciasPlantilla = ingresosValidados.length;
    const totalReferenciasProducidas = productosProducidos.length;
    const referenciasSinProduccion = totalReferenciasPlantilla - totalReferenciasProducidas;
    const totalUnidades = productosProducidos.reduce((acc, item) => acc + item.cantidadProducida, 0);

    return (
        <Box>
            <Heading size="md" mb={4}>Resumen y Reportes</Heading>
            <Text fontSize="sm" color="app.textSubtle" mb={5}>
                Revise el reporte local antes de generar los formatos finales. Esta version aun no registra
                movimientos de inventario ni cierra ordenes de produccion.
            </Text>

            <VStack align="stretch" spacing={5}>
                <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <AlertDescription fontSize="sm">
                        Los datos estan guardados solo en este asistente. Los lotes ficticios usan el prefijo
                        <Text as="span" fontFamily="mono" fontWeight="bold"> FICTICIO-PT </Text>
                        para identificarlos facilmente cuando se implemente el guardado real.
                    </AlertDescription>
                </Alert>

                <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
                    <Card variant="outline">
                        <CardBody>
                            <Stat>
                                <StatLabel color="app.textSubtle">Fecha reporte</StatLabel>
                                <StatNumber color="blue.600" fontSize="2xl">
                                    {formatDateDisplay(fechaReporte)}
                                </StatNumber>
                            </Stat>
                        </CardBody>
                    </Card>
                    <Card variant="outline">
                        <CardBody>
                            <Stat>
                                <StatLabel color="app.textSubtle">Referencias producidas</StatLabel>
                                <StatNumber color="teal.600">{formatNumber(totalReferenciasProducidas)}</StatNumber>
                                <StatHelpText mb={0}>
                                    de {formatNumber(totalReferenciasPlantilla)} en plantilla
                                </StatHelpText>
                            </Stat>
                        </CardBody>
                    </Card>
                    <Card variant="outline">
                        <CardBody>
                            <Stat>
                                <StatLabel color="app.textSubtle">Unidades producidas</StatLabel>
                                <StatNumber color="green.600">{formatNumber(totalUnidades)}</StatNumber>
                            </Stat>
                        </CardBody>
                    </Card>
                    <Card variant="outline">
                        <CardBody>
                            <Stat>
                                <StatLabel color="app.textSubtle">Sin produccion</StatLabel>
                                <StatNumber color="orange.600">{formatNumber(referenciasSinProduccion)}</StatNumber>
                            </Stat>
                        </CardBody>
                    </Card>
                </SimpleGrid>

                {productosProducidos.length === 0 && (
                    <Alert status="warning" borderRadius="md">
                        <AlertIcon />
                        <AlertDescription>
                            La plantilla fue valida, pero no contiene referencias con cantidad producida mayor a cero.
                        </AlertDescription>
                    </Alert>
                )}

                <Card variant="outline">
                    <CardHeader pb={2}>
                        <Heading size="sm" color="teal.700">Consolidado por Categoria</Heading>
                    </CardHeader>
                    <Divider />
                    <CardBody p={0}>
                        <TableContainer maxH="280px" overflowY="auto">
                            <Table size="sm" variant="simple">
                                <Thead bg="app.tableHeader" position="sticky" top={0}>
                                    <Tr>
                                        <Th>Categoria</Th>
                                        <Th isNumeric>Referencias</Th>
                                        <Th isNumeric>Unidades</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {categorias.map((categoria) => (
                                        <Tr key={categoria.categoriaNombre}>
                                            <Td>
                                                <Badge colorScheme="gray">{categoria.categoriaNombre}</Badge>
                                            </Td>
                                            <Td isNumeric>{formatNumber(categoria.referenciasProducidas)}</Td>
                                            <Td isNumeric fontWeight="bold" color="green.600">
                                                {formatNumber(categoria.unidadesProducidas)}
                                            </Td>
                                        </Tr>
                                    ))}
                                    {categorias.length === 0 && (
                                        <Tr>
                                            <Td colSpan={3}>
                                                <Text color="app.textSubtle" textAlign="center" py={4}>
                                                    No hay categorias con produccion reportada.
                                                </Text>
                                            </Td>
                                        </Tr>
                                    )}
                                </Tbody>
                            </Table>
                        </TableContainer>
                    </CardBody>
                </Card>

                <Card variant="outline">
                    <CardHeader pb={2}>
                        <Heading size="sm" color="purple.600">Detalle de Producto Terminado Producido</Heading>
                    </CardHeader>
                    <Divider />
                    <CardBody p={0}>
                        <TableContainer maxH="360px" overflowY="auto">
                            <Table size="sm" variant="simple">
                                <Thead bg="app.tableHeader" position="sticky" top={0}>
                                    <Tr>
                                        <Th>Producto</Th>
                                        <Th>Categoria</Th>
                                        <Th isNumeric>Cantidad</Th>
                                        <Th>Lote ficticio local</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {productosProducidos.map((ingreso) => (
                                        <Tr key={ingreso.productoId}>
                                            <Td>
                                                <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
                                                    {ingreso.productoNombre}
                                                </Text>
                                                <Text fontSize="xs" color="app.textSubtle">
                                                    {ingreso.productoId}
                                                </Text>
                                            </Td>
                                            <Td>{ingreso.categoriaNombre}</Td>
                                            <Td isNumeric fontWeight="bold" color="green.600">
                                                {formatNumber(ingreso.cantidadProducida)}
                                            </Td>
                                            <Td fontFamily="mono" fontSize="xs">{ingreso.loteFicticio}</Td>
                                        </Tr>
                                    ))}
                                    {productosProducidos.length === 0 && (
                                        <Tr>
                                            <Td colSpan={4}>
                                                <Text color="app.textSubtle" textAlign="center" py={4}>
                                                    No hay productos con produccion mayor a cero.
                                                </Text>
                                            </Td>
                                        </Tr>
                                    )}
                                </Tbody>
                            </Table>
                        </TableContainer>
                    </CardBody>
                </Card>

                <Flex justify="space-between" gap={4} wrap="wrap">
                    <Button
                        leftIcon={<ArrowBackIcon />}
                        variant="outline"
                        onClick={() => setActiveStep(1)}
                    >
                        Atras
                    </Button>
                    <Flex gap={3} wrap="wrap" justify="flex-end">
                        <Button variant="ghost" onClick={onSuccess}>
                            Nuevo Reporte
                        </Button>
                        <Button
                            leftIcon={<DownloadIcon />}
                            colorScheme="green"
                            isDisabled
                            title="Pendiente de implementar"
                        >
                            Descargar Reporte HyL
                        </Button>
                        <Button
                            leftIcon={<DownloadIcon />}
                            colorScheme="blue"
                            isDisabled
                            title="Pendiente de implementar"
                        >
                            Descargar Reporte Dorance
                        </Button>
                    </Flex>
                </Flex>
            </VStack>
        </Box>
    );
}
