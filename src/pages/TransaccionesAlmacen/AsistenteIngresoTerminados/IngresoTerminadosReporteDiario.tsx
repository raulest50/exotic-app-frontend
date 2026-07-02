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
    FormControl,
    FormLabel,
    Heading,
    HStack,
    Input,
    Progress,
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
    useToast,
} from "@chakra-ui/react";
import { DownloadIcon, RepeatIcon, SearchIcon } from "@chakra-ui/icons";
import axios from "axios";
import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import EndPointsURL, { type ExcelDecimalSeparator, type ExcelExportMode } from "../../../api/EndPointsURL";
import ExcelDecimalSeparatorSelector, {
    DEFAULT_EXCEL_DECIMAL_SEPARATOR,
} from "../../../components/ExcelDecimalSeparatorSelector";
import {
    IngresoTerminadosReporteCategoria,
    IngresoTerminadosReporteDiario,
    IngresoTerminadosReporteReferencia,
} from "./types";

function todayIso(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

const numberFormatter = new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

function formatNumber(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return "-";
    return numberFormatter.format(value);
}

function formatPct(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return "Sin base";
    return `${decimalFormatter.format(value)}%`;
}

function clampPct(value: number | null | undefined): number {
    if (value == null || Number.isNaN(value)) return 0;
    return Math.max(0, Math.min(100, value));
}

function formatDate(value: string | null | undefined): string {
    if (!value) return "-";
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
}

function formatDateTime(value: string | null | undefined): string {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const datePart = date.toLocaleDateString("es-CO");
    const timePart = date.toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
    });
    return `${datePart} ${timePart}`;
}

function triggerFileDownload(data: ArrayBuffer, filename: string) {
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

interface MetricCardProps {
    label: string;
    value: string;
    help?: string;
    accent?: string;
}

function MetricCard({ label, value, help, accent = "blue.600" }: MetricCardProps) {
    return (
        <Card variant="outline">
            <CardBody>
                <Stat>
                    <StatLabel color="app.textSubtle">{label}</StatLabel>
                    <StatNumber color={accent}>{value}</StatNumber>
                    {help && <StatHelpText mb={0}>{help}</StatHelpText>}
                </Stat>
            </CardBody>
        </Card>
    );
}

function renderEstadoReferencia(ref: IngresoTerminadosReporteReferencia) {
    if (ref.noPlaneado) {
        return <Badge colorScheme="orange">No planeado</Badge>;
    }
    if (ref.planeado && ref.producido) {
        return <Badge colorScheme="green">Producido</Badge>;
    }
    if (ref.planeado) {
        return <Badge colorScheme="gray">Pendiente</Badge>;
    }
    return <Badge colorScheme="gray">Sin movimiento</Badge>;
}

function getCategoriaCapacidadBadge(row: IngresoTerminadosReporteCategoria) {
    if (row.capacidadProductivaDia > 0) {
        return <Badge colorScheme="green">Configurada</Badge>;
    }
    return <Badge colorScheme="orange">Sin capacidad</Badge>;
}

export default function IngresoTerminadosReporteDiario() {
    const toast = useToast();
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const initialLoadRef = useRef(false);

    const [fecha, setFecha] = useState(() => todayIso());
    const [reporte, setReporte] = useState<IngresoTerminadosReporteDiario | null>(null);
    const [decimalSeparator, setDecimalSeparator] = useState<ExcelDecimalSeparator>(DEFAULT_EXCEL_DECIMAL_SEPARATOR);
    const [loading, setLoading] = useState(false);
    const [downloadingMode, setDownloadingMode] = useState<ExcelExportMode | null>(null);

    const cargarReporte = useCallback(
        async (fechaConsulta: string) => {
            if (!fechaConsulta) return;
            setLoading(true);
            try {
                const response = await axios.get<IngresoTerminadosReporteDiario>(
                    endpoints.informesDiariosAlmacenIngresoTerminadosReporte(fechaConsulta),
                    { withCredentials: true }
                );
                setReporte(response.data);
            } catch (error) {
                toast({
                    title: "No se pudo consultar el reporte",
                    description: axios.isAxiosError(error)
                        ? `Error ${error.response?.status ?? ""}`.trim()
                        : "Compruebe la conexion y vuelva a intentar.",
                    status: "error",
                    duration: 6000,
                    isClosable: true,
                });
            } finally {
                setLoading(false);
            }
        },
        [endpoints, toast]
    );

    useEffect(() => {
        if (initialLoadRef.current) return;
        initialLoadRef.current = true;
        void cargarReporte(fecha);
    }, [cargarReporte, fecha]);

    const buildCopySuffix = () => decimalSeparator === "COMMA" ? "_para_copiar_coma" : "_para_copiar_punto";

    const descargarExcel = async (exportMode: ExcelExportMode) => {
        if (!fecha) return;
        setDownloadingMode(exportMode);
        try {
            const exportOptions = exportMode === "NUMERIC"
                ? { exportMode }
                : { exportMode, decimalSeparator };
            const response = await axios.get<ArrayBuffer>(
                endpoints.informesDiariosAlmacenIngresoTerminadosReporteExcel(fecha, exportOptions),
                {
                    responseType: "arraybuffer",
                    withCredentials: true,
                }
            );
            const modeSuffix = exportMode === "TEXT_DETERMINISTIC" ? buildCopySuffix() : "";
            triggerFileDownload(response.data, `reporte_produccion_terminados_${fecha}${modeSuffix}.xlsx`);
        } catch (error) {
            toast({
                title: "No se pudo descargar el Excel",
                description: axios.isAxiosError(error)
                    ? `Error ${error.response?.status ?? ""}`.trim()
                    : "Compruebe la conexion y vuelva a intentar.",
                status: "error",
                duration: 6000,
                isClosable: true,
            });
        } finally {
            setDownloadingMode(null);
        }
    };

    const resumen = reporte?.resumen;
    const hasData =
        !!reporte &&
        ((resumen?.unidadesPlaneadas ?? 0) > 0 ||
            (resumen?.unidadesProducidas ?? 0) > 0 ||
            reporte.detalleReferencias.length > 0);

    return (
        <Box>
            <Flex
                gap={4}
                align={{ base: "stretch", md: "end" }}
                justify="space-between"
                direction={{ base: "column", lg: "row" }}
                mb={5}
            >
                <FormControl maxW={{ base: "full", md: "260px" }}>
                    <FormLabel>Fecha del reporte</FormLabel>
                    <Input
                        type="date"
                        value={fecha}
                        onChange={(event) => {
                            setFecha(event.target.value);
                            setReporte(null);
                        }}
                    />
                </FormControl>

                <ExcelDecimalSeparatorSelector
                    value={decimalSeparator}
                    onChange={setDecimalSeparator}
                    maxW={{ base: "full", md: "320px" }}
                />

                <HStack spacing={3} justify={{ base: "stretch", md: "flex-end" }} flexWrap="wrap">
                    <Button
                        leftIcon={<SearchIcon />}
                        colorScheme="teal"
                        onClick={() => cargarReporte(fecha)}
                        isLoading={loading}
                        isDisabled={!fecha}
                    >
                        Consultar
                    </Button>
                    <Button
                        leftIcon={<DownloadIcon />}
                        colorScheme="blue"
                        variant="solid"
                        onClick={() => descargarExcel("NUMERIC")}
                        isLoading={downloadingMode === "NUMERIC"}
                        isDisabled={!fecha}
                    >
                        Excel funcional
                    </Button>
                    <Button
                        leftIcon={<DownloadIcon />}
                        colorScheme="green"
                        variant="outline"
                        onClick={() => descargarExcel("TEXT_DETERMINISTIC")}
                        isLoading={downloadingMode === "TEXT_DETERMINISTIC"}
                        isDisabled={!fecha}
                    >
                        Excel para copiar
                    </Button>
                    <Button
                        leftIcon={<RepeatIcon />}
                        variant="ghost"
                        onClick={() => cargarReporte(fecha)}
                        isDisabled={!fecha || loading}
                    >
                        Actualizar
                    </Button>
                </HStack>
            </Flex>

            {reporte && (
                <Alert status={reporte.mpsId ? "info" : "warning"} borderRadius="md" mb={5}>
                    <AlertIcon />
                    <AlertDescription>
                        {reporte.mpsId
                            ? `MPS ${reporte.mpsId} (${reporte.mpsEstado ?? "sin estado"}) - semana ${formatDate(
                                  reporte.weekStartDate
                              )} a ${formatDate(reporte.weekEndDate)}`
                            : "No hay MPS semanal asociado a la fecha; el reporte se calcula con produccion registrada."}
                    </AlertDescription>
                </Alert>
            )}

            {!reporte && !loading && (
                <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <AlertDescription>Seleccione una fecha para consultar el reporte diario.</AlertDescription>
                </Alert>
            )}

            {reporte && resumen && (
                <VStack align="stretch" spacing={5}>
                    <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
                        <MetricCard
                            label="Unidades planeadas"
                            value={formatNumber(resumen.unidadesPlaneadas)}
                            help={`${formatNumber(resumen.referenciasPlaneadas)} referencias`}
                            accent="blue.600"
                        />
                        <MetricCard
                            label="Unidades producidas"
                            value={formatNumber(resumen.unidadesProducidas)}
                            help={`${formatNumber(resumen.referenciasProducidas)} referencias`}
                            accent="green.600"
                        />
                        <MetricCard
                            label="Rendimiento planeacion"
                            value={formatPct(resumen.rendimientoPlaneacionPct)}
                            help="producido / planeado"
                            accent="purple.600"
                        />
                        <MetricCard
                            label="Rendimiento operativo"
                            value={formatPct(resumen.rendimientoOperativoPct)}
                            help={`${formatNumber(resumen.capacidadProductivaDia)} capacidad dia`}
                            accent="orange.600"
                        />
                    </SimpleGrid>

                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                        <Card variant="outline">
                            <CardBody>
                                <Stat>
                                    <StatLabel color="app.textSubtle">Cumplimiento referencias</StatLabel>
                                    <StatNumber color="teal.600">
                                        {formatPct(resumen.cumplimientoReferenciasPct)}
                                    </StatNumber>
                                    <StatHelpText mb={0}>
                                        {formatNumber(resumen.referenciasPlaneadasProducidas)} de{" "}
                                        {formatNumber(resumen.referenciasPlaneadas)}
                                    </StatHelpText>
                                </Stat>
                                <Progress
                                    value={clampPct(resumen.cumplimientoReferenciasPct)}
                                    colorScheme="teal"
                                    size="sm"
                                    mt={3}
                                    borderRadius="full"
                                />
                            </CardBody>
                        </Card>
                        <MetricCard
                            label="Tendencia vs dia anterior"
                            value={formatPct(resumen.tendenciaVsDiaAnteriorPct)}
                            help={`${formatNumber(resumen.unidadesProducidasDiaAnterior)} unidades previas`}
                            accent={
                                (resumen.tendenciaVsDiaAnteriorPct ?? 0) >= 0 ? "green.600" : "red.600"
                            }
                        />
                        <MetricCard
                            label="Referencias no planeadas"
                            value={formatNumber(resumen.referenciasNoPlaneadas)}
                            help={`${formatNumber(resumen.categoriasSinCapacidad)} categorias sin capacidad`}
                            accent="orange.600"
                        />
                    </SimpleGrid>

                    {!hasData && (
                        <Alert status="warning" borderRadius="md">
                            <AlertIcon />
                            <AlertDescription>
                                No hay planeacion ni produccion registrada para la fecha seleccionada.
                            </AlertDescription>
                        </Alert>
                    )}

                    <Card variant="outline">
                        <CardHeader pb={2}>
                            <Heading size="sm">Consolidado por categoria</Heading>
                        </CardHeader>
                        <Divider />
                        <CardBody p={0}>
                            <TableContainer maxH="320px" overflowY="auto">
                                <Table size="sm">
                                    <Thead bg="app.tableHeader" position="sticky" top={0}>
                                        <Tr>
                                            <Th>Categoria</Th>
                                            <Th isNumeric>Planeado</Th>
                                            <Th isNumeric>Producido</Th>
                                            <Th isNumeric>Capacidad</Th>
                                            <Th isNumeric>Rend. plan</Th>
                                            <Th isNumeric>Rend. operativo</Th>
                                            <Th>Capacidad</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {reporte.consolidadoCategorias.map((row) => (
                                            <Tr key={`${row.categoriaId ?? "sin"}-${row.categoriaNombre}`}>
                                                <Td fontWeight="semibold">{row.categoriaNombre}</Td>
                                                <Td isNumeric>{formatNumber(row.unidadesPlaneadas)}</Td>
                                                <Td isNumeric color="green.600" fontWeight="bold">
                                                    {formatNumber(row.unidadesProducidas)}
                                                </Td>
                                                <Td isNumeric>{formatNumber(row.capacidadProductivaDia)}</Td>
                                                <Td isNumeric>{formatPct(row.rendimientoPlaneacionPct)}</Td>
                                                <Td isNumeric>{formatPct(row.rendimientoOperativoPct)}</Td>
                                                <Td>{getCategoriaCapacidadBadge(row)}</Td>
                                            </Tr>
                                        ))}
                                    </Tbody>
                                </Table>
                            </TableContainer>
                        </CardBody>
                    </Card>

                    <Card variant="outline">
                        <CardHeader pb={2}>
                            <Heading size="sm">Detalle por referencia</Heading>
                        </CardHeader>
                        <Divider />
                        <CardBody p={0}>
                            <TableContainer maxH="380px" overflowY="auto">
                                <Table size="sm">
                                    <Thead bg="app.tableHeader" position="sticky" top={0}>
                                        <Tr>
                                            <Th>Producto</Th>
                                            <Th>Categoria</Th>
                                            <Th isNumeric>Planeado</Th>
                                            <Th isNumeric>Producido</Th>
                                            <Th isNumeric>Diferencia</Th>
                                            <Th isNumeric>Rendimiento</Th>
                                            <Th>Estado</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {reporte.detalleReferencias.map((row) => (
                                            <Tr key={row.productoId}>
                                                <Td>
                                                    <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
                                                        {row.productoNombre}
                                                    </Text>
                                                    <Text fontSize="xs" color="app.textSubtle">
                                                        {row.productoId}
                                                    </Text>
                                                </Td>
                                                <Td>{row.categoriaNombre}</Td>
                                                <Td isNumeric>{formatNumber(row.cantidadPlaneada)}</Td>
                                                <Td isNumeric color="green.600" fontWeight="bold">
                                                    {formatNumber(row.cantidadProducida)}
                                                </Td>
                                                <Td isNumeric>{formatNumber(row.diferencia)}</Td>
                                                <Td isNumeric>{formatPct(row.rendimientoPlaneacionPct)}</Td>
                                                <Td>{renderEstadoReferencia(row)}</Td>
                                            </Tr>
                                        ))}
                                    </Tbody>
                                </Table>
                            </TableContainer>
                        </CardBody>
                    </Card>

                    <Card variant="outline">
                        <CardHeader pb={2}>
                            <Heading size="sm">Movimientos registrados</Heading>
                        </CardHeader>
                        <Divider />
                        <CardBody p={0}>
                            <TableContainer maxH="300px" overflowY="auto">
                                <Table size="sm">
                                    <Thead bg="app.tableHeader" position="sticky" top={0}>
                                        <Tr>
                                            <Th>Hora</Th>
                                            <Th>Producto</Th>
                                            <Th>Lote</Th>
                                            <Th isNumeric>Cantidad</Th>
                                            <Th>OP</Th>
                                            <Th>Vencimiento</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {reporte.movimientos.map((row) => (
                                            <Tr key={row.movimientoId}>
                                                <Td>{formatDateTime(row.fechaMovimiento)}</Td>
                                                <Td>
                                                    <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
                                                        {row.productoNombre ?? "-"}
                                                    </Text>
                                                    <Text fontSize="xs" color="app.textSubtle">
                                                        {row.productoId ?? "-"}
                                                    </Text>
                                                </Td>
                                                <Td>{row.loteBatchNumber ?? "-"}</Td>
                                                <Td isNumeric color="green.600" fontWeight="bold">
                                                    {formatNumber(row.cantidad)}
                                                </Td>
                                                <Td>{row.ordenProduccionId ?? "-"}</Td>
                                                <Td>{formatDate(row.fechaVencimiento)}</Td>
                                            </Tr>
                                        ))}
                                    </Tbody>
                                </Table>
                            </TableContainer>
                        </CardBody>
                    </Card>
                </VStack>
            )}
        </Box>
    );
}
