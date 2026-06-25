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
    useToast,
    VStack,
} from "@chakra-ui/react";
import { ArrowBackIcon, DownloadIcon } from "@chakra-ui/icons";
import ExcelJS from "exceljs";
import { useMemo, useState } from "react";
import { IngresoTerminadoValidado } from "./types";

interface Props {
    ingresosValidados: IngresoTerminadoValidado[];
    setActiveStep: (step: number) => void;
    onSuccess: () => void;
}

interface CategoriaConsolidada {
    categoriaNombre: string;
    referencias: number;
    unidadesProducidas: number;
    capacidadProductivaDiaria: number;
    rendimientoOperativoPct: number | null;
}

const numberFormatter = new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

function formatNumber(value: number): string {
    return numberFormatter.format(value);
}

function formatPct(value: number | null): string {
    if (value == null || Number.isNaN(value)) return "Sin base";
    return `${decimalFormatter.format(value)}%`;
}

function formatDateDisplay(isoDate: string): string {
    if (!isoDate) return "-";
    const [year, month, day] = isoDate.split("-");
    return `${day}/${month}/${year}`;
}

function triggerFileDownload(data: BlobPart, filename: string) {
    const blob = new Blob([data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

function buildCategoriaRows(ingresos: IngresoTerminadoValidado[]): CategoriaConsolidada[] {
    const byCategoria = new Map<string, CategoriaConsolidada>();

    for (const ingreso of ingresos) {
        const categoriaNombre = ingreso.categoriaNombre || "Sin categoria";
        const current = byCategoria.get(categoriaNombre) ?? {
            categoriaNombre,
            referencias: 0,
            unidadesProducidas: 0,
            capacidadProductivaDiaria: ingreso.capacidadProductivaDiaria,
            rendimientoOperativoPct: null,
        };

        current.referencias += 1;
        current.unidadesProducidas += ingreso.cantidadProducida;
        if (!current.capacidadProductivaDiaria && ingreso.capacidadProductivaDiaria) {
            current.capacidadProductivaDiaria = ingreso.capacidadProductivaDiaria;
        }
        current.rendimientoOperativoPct = current.capacidadProductivaDiaria > 0
            ? (current.unidadesProducidas / current.capacidadProductivaDiaria) * 100
            : null;

        byCategoria.set(categoriaNombre, current);
    }

    return Array.from(byCategoria.values()).sort((a, b) =>
        a.categoriaNombre.localeCompare(b.categoriaNombre)
    );
}

async function buildReporteExcel(
    ingresos: IngresoTerminadoValidado[],
    categorias: CategoriaConsolidada[],
    resumen: {
        fechaProduccion: string;
        totalReferencias: number;
        totalUnidades: number;
        capacidadTotal: number;
        rendimientoOperativoPct: number | null;
    }
): Promise<BlobPart> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Exotic App";
    workbook.created = new Date();

    const headerFill = {
        type: "pattern" as const,
        pattern: "solid" as const,
        fgColor: { argb: "FFE2E8F0" },
    };

    const resumenSheet = workbook.addWorksheet("Resumen");
    resumenSheet.columns = [
        { header: "Metrica", key: "metric", width: 34 },
        { header: "Valor", key: "value", width: 24 },
    ];
    resumenSheet.getRow(1).font = { bold: true };
    resumenSheet.getRow(1).eachCell((cell) => {
        cell.fill = headerFill;
    });
    resumenSheet.addRows([
        { metric: "Fecha produccion", value: resumen.fechaProduccion },
        { metric: "Referencias producidas", value: resumen.totalReferencias },
        { metric: "Unidades producidas", value: resumen.totalUnidades },
        { metric: "Categorias reportadas", value: categorias.length },
        { metric: "Capacidad productiva diaria total", value: resumen.capacidadTotal },
        { metric: "Rendimiento operativo (%)", value: resumen.rendimientoOperativoPct ?? "" },
    ]);

    const categoriaSheet = workbook.addWorksheet("Consolidado Categoria");
    categoriaSheet.columns = [
        { header: "Categoria", key: "categoriaNombre", width: 32 },
        { header: "Referencias producidas", key: "referencias", width: 24 },
        { header: "Unidades producidas", key: "unidadesProducidas", width: 22 },
        { header: "Capacidad productiva dia", key: "capacidadProductivaDiaria", width: 26 },
        { header: "Rendimiento operativo (%)", key: "rendimientoOperativoPct", width: 28 },
    ];
    categoriaSheet.getRow(1).font = { bold: true };
    categoriaSheet.getRow(1).eachCell((cell) => {
        cell.fill = headerFill;
    });
    categoriaSheet.addRows(categorias.map((categoria) => ({
        ...categoria,
        rendimientoOperativoPct: categoria.rendimientoOperativoPct ?? "",
    })));

    const detalleSheet = workbook.addWorksheet("Detalle Terminados");
    detalleSheet.columns = [
        { header: "Producto ID", key: "productoId", width: 18 },
        { header: "Producto", key: "productoNombre", width: 44 },
        { header: "Categoria", key: "categoriaNombre", width: 28 },
        { header: "Unidad", key: "tipoUnidades", width: 14 },
        { header: "Cantidad producida", key: "cantidadProducida", width: 22 },
        { header: "Fecha produccion", key: "fechaProduccion", width: 18 },
        { header: "Observaciones", key: "observaciones", width: 42 },
    ];
    detalleSheet.getRow(1).font = { bold: true };
    detalleSheet.getRow(1).eachCell((cell) => {
        cell.fill = headerFill;
    });
    detalleSheet.addRows(ingresos.map((ingreso) => ({
        productoId: ingreso.productoId,
        productoNombre: ingreso.productoNombre,
        categoriaNombre: ingreso.categoriaNombre,
        tipoUnidades: ingreso.tipoUnidades,
        cantidadProducida: ingreso.cantidadProducida,
        fechaProduccion: ingreso.fechaProduccion,
        observaciones: ingreso.observaciones ?? "",
    })));

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as BlobPart;
}

export default function IngresoTerminadosStep2_RevisionConfirmacion({
    ingresosValidados,
    setActiveStep,
    onSuccess,
}: Props) {
    const toast = useToast();
    const [isGenerating, setIsGenerating] = useState(false);

    const categorias = useMemo(() => buildCategoriaRows(ingresosValidados), [ingresosValidados]);
    const totalReferencias = ingresosValidados.length;
    const totalUnidades = ingresosValidados.reduce((acc, item) => acc + item.cantidadProducida, 0);
    const fechaProduccion = ingresosValidados[0]?.fechaProduccion ?? "";
    const capacidadTotal = categorias.reduce((acc, categoria) => acc + categoria.capacidadProductivaDiaria, 0);
    const rendimientoOperativoPct = capacidadTotal > 0 ? (totalUnidades / capacidadTotal) * 100 : null;

    const handleDownloadReporte = async () => {
        setIsGenerating(true);
        try {
            const data = await buildReporteExcel(ingresosValidados, categorias, {
                fechaProduccion,
                totalReferencias,
                totalUnidades,
                capacidadTotal,
                rendimientoOperativoPct,
            });
            triggerFileDownload(data, `reporte_produccion_terminados_consolidado_${fechaProduccion}.xlsx`);
            toast({
                title: "Reporte generado",
                description: "El Excel consolidado de produccion diaria fue descargado.",
                status: "success",
                duration: 5000,
                isClosable: true,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "No se pudo generar el reporte.";
            toast({
                title: "Error generando reporte",
                description: message,
                status: "error",
                duration: 6000,
                isClosable: true,
            });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Box>
            <Heading size="md" mb={4}>Revision y Generacion de Reporte</Heading>
            <Text fontSize="sm" color="app.textSubtle" mb={5}>
                Revise el consolidado antes de generar el Excel. Esta operacion no registra movimientos
                de inventario ni cierra ordenes de produccion.
            </Text>

            <VStack align="stretch" spacing={5}>
                <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <AlertDescription fontSize="sm">
                        El workflow por lote/OP esta temporalmente en desuso. Por ahora el asistente solo
                        genera el reporte diario consolidado por producto terminado.
                    </AlertDescription>
                </Alert>

                <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
                    <Card variant="outline">
                        <CardBody>
                            <Stat>
                                <StatLabel color="app.textSubtle">Fecha produccion</StatLabel>
                                <StatNumber color="blue.600" fontSize="2xl">
                                    {formatDateDisplay(fechaProduccion)}
                                </StatNumber>
                            </Stat>
                        </CardBody>
                    </Card>
                    <Card variant="outline">
                        <CardBody>
                            <Stat>
                                <StatLabel color="app.textSubtle">Referencias</StatLabel>
                                <StatNumber color="teal.600">{formatNumber(totalReferencias)}</StatNumber>
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
                                <StatLabel color="app.textSubtle">Rendimiento operativo</StatLabel>
                                <StatNumber color="orange.600">{formatPct(rendimientoOperativoPct)}</StatNumber>
                            </Stat>
                        </CardBody>
                    </Card>
                </SimpleGrid>

                <Card variant="outline">
                    <CardHeader pb={2}>
                        <Heading size="sm" color="teal.700">Consolidado por Categoria</Heading>
                    </CardHeader>
                    <Divider />
                    <CardBody p={0}>
                        <TableContainer maxH="260px" overflowY="auto">
                            <Table size="sm" variant="simple">
                                <Thead bg="app.tableHeader" position="sticky" top={0}>
                                    <Tr>
                                        <Th>Categoria</Th>
                                        <Th isNumeric>Referencias</Th>
                                        <Th isNumeric>Unidades</Th>
                                        <Th isNumeric>Capacidad dia</Th>
                                        <Th isNumeric>Rend. operativo</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {categorias.map((categoria) => (
                                        <Tr key={categoria.categoriaNombre}>
                                            <Td>
                                                <Badge colorScheme="gray">{categoria.categoriaNombre}</Badge>
                                            </Td>
                                            <Td isNumeric>{formatNumber(categoria.referencias)}</Td>
                                            <Td isNumeric fontWeight="bold" color="green.600">
                                                {formatNumber(categoria.unidadesProducidas)}
                                            </Td>
                                            <Td isNumeric>{formatNumber(categoria.capacidadProductivaDiaria)}</Td>
                                            <Td isNumeric>{formatPct(categoria.rendimientoOperativoPct)}</Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </TableContainer>
                    </CardBody>
                </Card>

                <Card variant="outline">
                    <CardHeader pb={2}>
                        <Heading size="sm" color="purple.600">Detalle por Producto Terminado</Heading>
                    </CardHeader>
                    <Divider />
                    <CardBody p={0}>
                        <TableContainer maxH="320px" overflowY="auto">
                            <Table size="sm" variant="simple">
                                <Thead bg="app.tableHeader" position="sticky" top={0}>
                                    <Tr>
                                        <Th>Producto</Th>
                                        <Th>Categoria</Th>
                                        <Th>Unidad</Th>
                                        <Th isNumeric>Cantidad</Th>
                                        <Th>Observaciones</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {ingresosValidados.map((ingreso) => (
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
                                            <Td>{ingreso.tipoUnidades || "-"}</Td>
                                            <Td isNumeric fontWeight="bold" color="green.600">
                                                {formatNumber(ingreso.cantidadProducida)}
                                            </Td>
                                            <Td fontSize="xs">{ingreso.observaciones || "-"}</Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </TableContainer>
                    </CardBody>
                </Card>

                <Flex justify="space-between">
                    <Button
                        leftIcon={<ArrowBackIcon />}
                        variant="outline"
                        onClick={() => setActiveStep(1)}
                        isDisabled={isGenerating}
                    >
                        Atras
                    </Button>
                    <Flex gap={3} wrap="wrap" justify="flex-end">
                        <Button
                            variant="ghost"
                            onClick={onSuccess}
                            isDisabled={isGenerating}
                        >
                            Nuevo Reporte
                        </Button>
                        <Button
                            leftIcon={<DownloadIcon />}
                            colorScheme="green"
                            onClick={handleDownloadReporte}
                            isLoading={isGenerating}
                            loadingText="Generando..."
                        >
                            Generar Excel Consolidado
                        </Button>
                    </Flex>
                </Flex>
            </VStack>
        </Box>
    );
}
