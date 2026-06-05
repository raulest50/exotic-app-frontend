import { useEffect, useMemo, useState } from "react";
import {
    Badge,
    Box,
    Button,
    Card,
    CardBody,
    FormControl,
    FormHelperText,
    FormLabel,
    HStack,
    IconButton,
    Input,
    Select,
    SimpleGrid,
    Spinner,
    Stack,
    Stat,
    StatHelpText,
    StatLabel,
    StatNumber,
    Text,
    Tooltip,
    useDisclosure,
    useToast,
} from "@chakra-ui/react";
import { CloseIcon, DownloadIcon, RepeatIcon, SearchIcon } from "@chakra-ui/icons";
import ReactECharts from "echarts-for-react";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import IntegrantePersonalPicker from "../../../components/Pickers/IntegrantePersonalPicker/IntegrantePersonalPicker.tsx";
import {
    EstadoRegistroHoraExtra,
    getEstadoRegistroHoraExtraText,
    type IntegrantePersonal,
} from "../../Personal/types.tsx";
import type {
    DepartamentoPersonal,
    HorasExtraBiGranularidad,
    HorasExtraBiResumen,
    HorasExtraBiSerie,
} from "./types.ts";
import { formatHours, formatInteger, getCurrentMonthStartIsoDate, getTodayIsoDate } from "./utils.ts";

const endPoints = new EndPointsURL();

const estadoColors: Record<EstadoRegistroHoraExtra, string> = {
    [EstadoRegistroHoraExtra.REGISTRADA]: "#3182ce",
    [EstadoRegistroHoraExtra.APROBADA]: "#38a169",
    [EstadoRegistroHoraExtra.RECHAZADA]: "#e53e3e",
    [EstadoRegistroHoraExtra.ANULADA]: "#718096",
};

export default function HorasExtraBiPanel() {
    const toast = useToast();
    const integrantePicker = useDisclosure();
    const [fechaDesde, setFechaDesde] = useState(getCurrentMonthStartIsoDate());
    const [fechaHasta, setFechaHasta] = useState(getTodayIsoDate());
    const [granularidad, setGranularidad] = useState<HorasExtraBiGranularidad>("DIA");
    const [departamento, setDepartamento] = useState<DepartamentoPersonal | "">("");
    const [cargo, setCargo] = useState("");
    const [selectedIntegrante, setSelectedIntegrante] = useState<IntegrantePersonal | null>(null);
    const [resumen, setResumen] = useState<HorasExtraBiResumen | null>(null);
    const [serie, setSerie] = useState<HorasExtraBiSerie | null>(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const rangeInvalid = Boolean(fechaDesde && fechaHasta && fechaDesde > fechaHasta);
    const canQuery = Boolean(fechaDesde && fechaHasta && !rangeInvalid);

    const integranteLabel = selectedIntegrante
        ? `${selectedIntegrante.id} - ${selectedIntegrante.nombres} ${selectedIntegrante.apellidos}`
        : "";

    const queryArgs = useMemo(() => ({
        fechaDesde,
        fechaHasta,
        granularidad,
        integranteId: selectedIntegrante?.id,
        departamento: departamento || undefined,
        cargo: cargo.trim() || undefined,
    }), [cargo, departamento, fechaDesde, fechaHasta, granularidad, selectedIntegrante?.id]);

    const fetchData = async () => {
        if (!canQuery) {
            toast({
                title: "Rango de fechas inválido",
                description: "Seleccione una ventana válida para consultar BI de personal.",
                status: "warning",
                duration: 4000,
                isClosable: true,
            });
            return;
        }

        setLoading(true);
        try {
            const [resumenResponse, serieResponse] = await Promise.all([
                axios.get<HorasExtraBiResumen>(endPoints.biPersonalHorasExtraResumen(queryArgs)),
                axios.get<HorasExtraBiSerie>(endPoints.biPersonalHorasExtraSerie(queryArgs)),
            ]);
            setResumen(resumenResponse.data);
            setSerie(serieResponse.data);
        } catch (error) {
            console.error("Error loading BI personal horas extra:", error);
            toast({
                title: "Error",
                description: "No se pudo cargar la información BI de horas extra.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const triggerFileDownload = (data: ArrayBuffer, filename: string) => {
        const blob = new Blob([data], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDownload = async () => {
        if (!canQuery) return;
        setDownloading(true);
        try {
            const response = await axios.get<ArrayBuffer>(
                endPoints.biPersonalHorasExtraExcel(queryArgs),
                { responseType: "arraybuffer" }
            );
            triggerFileDownload(response.data, `bi_personal_horas_extra_${fechaDesde}_${fechaHasta}.xlsx`);
        } catch (error) {
            console.error("Error downloading BI personal horas extra Excel:", error);
            toast({
                title: "No se pudo descargar el informe",
                description: "Compruebe los filtros y vuelva a intentar.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setDownloading(false);
        }
    };

    const estados = useMemo(() => {
        const byEstado = new Map<EstadoRegistroHoraExtra, { registros: number; horas: number }>();
        resumen?.estados.forEach((item) => byEstado.set(item.estado, item));
        return Object.values(EstadoRegistroHoraExtra).map((estado) => ({
            estado,
            registros: byEstado.get(estado)?.registros ?? 0,
            horas: byEstado.get(estado)?.horas ?? 0,
        }));
    }, [resumen?.estados]);

    const chartOptions = useMemo(() => {
        const puntos = serie?.puntos ?? [];
        return {
            tooltip: {
                trigger: "axis",
                valueFormatter: (value: number) => `${formatHours(value)} h`,
            },
            legend: {
                top: 0,
            },
            grid: {
                left: 48,
                right: 24,
                top: 48,
                bottom: 56,
            },
            xAxis: {
                type: "category",
                data: puntos.map((punto) => punto.bucket),
                axisLabel: {
                    rotate: puntos.length > 12 ? 35 : 0,
                },
            },
            yAxis: {
                type: "value",
                name: "Horas",
            },
            series: [
                {
                    name: "Registrada",
                    type: "bar",
                    stack: "horas",
                    data: puntos.map((punto) => punto.horasRegistrada),
                    itemStyle: { color: estadoColors.REGISTRADA },
                },
                {
                    name: "Aprobada",
                    type: "bar",
                    stack: "horas",
                    data: puntos.map((punto) => punto.horasAprobada),
                    itemStyle: { color: estadoColors.APROBADA },
                },
                {
                    name: "Rechazada",
                    type: "bar",
                    stack: "horas",
                    data: puntos.map((punto) => punto.horasRechazada),
                    itemStyle: { color: estadoColors.RECHAZADA },
                },
                {
                    name: "Anulada",
                    type: "bar",
                    stack: "horas",
                    data: puntos.map((punto) => punto.horasAnulada),
                    itemStyle: { color: estadoColors.ANULADA },
                },
            ],
        };
    }, [serie?.puntos]);

    return (
        <Stack spacing={4}>
            <Card variant="outline">
                <CardBody>
                    <Stack spacing={4}>
                        <SimpleGrid columns={{ base: 1, lg: 4 }} spacing={4}>
                            <FormControl>
                                <FormLabel>Fecha desde</FormLabel>
                                <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
                            </FormControl>
                            <FormControl isInvalid={rangeInvalid}>
                                <FormLabel>Fecha hasta</FormLabel>
                                <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
                                {rangeInvalid ? (
                                    <FormHelperText color="red.500">La fecha final no puede ser anterior.</FormHelperText>
                                ) : null}
                            </FormControl>
                            <FormControl>
                                <FormLabel>Granularidad</FormLabel>
                                <Select
                                    value={granularidad}
                                    onChange={(e) => setGranularidad(e.target.value as HorasExtraBiGranularidad)}
                                >
                                    <option value="DIA">Día</option>
                                    <option value="SEMANA">Semana</option>
                                    <option value="MES">Mes</option>
                                </Select>
                            </FormControl>
                            <FormControl>
                                <FormLabel>Departamento</FormLabel>
                                <Select
                                    value={departamento}
                                    onChange={(e) => setDepartamento(e.target.value as DepartamentoPersonal | "")}
                                >
                                    <option value="">Todos</option>
                                    <option value="PRODUCCION">Producción</option>
                                    <option value="ADMINISTRATIVO">Administrativo</option>
                                </Select>
                            </FormControl>
                            <FormControl>
                                <FormLabel>Cargo</FormLabel>
                                <Input value={cargo} onChange={(e) => setCargo(e.target.value)} />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Integrante</FormLabel>
                                <HStack>
                                    <Input value={integranteLabel} placeholder="Todos" isReadOnly />
                                    <Tooltip label="Buscar integrante">
                                        <IconButton
                                            aria-label="Buscar integrante"
                                            icon={<SearchIcon />}
                                            colorScheme="blue"
                                            onClick={integrantePicker.onOpen}
                                        />
                                    </Tooltip>
                                    <Tooltip label="Limpiar integrante">
                                        <IconButton
                                            aria-label="Limpiar integrante"
                                            icon={<CloseIcon />}
                                            variant="outline"
                                            isDisabled={!selectedIntegrante}
                                            onClick={() => setSelectedIntegrante(null)}
                                        />
                                    </Tooltip>
                                </HStack>
                            </FormControl>
                        </SimpleGrid>
                        <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
                            <Badge colorScheme="blue">
                                {fechaDesde} a {fechaHasta}
                            </Badge>
                            <HStack>
                                <Button
                                    leftIcon={<RepeatIcon />}
                                    colorScheme="blue"
                                    onClick={fetchData}
                                    isLoading={loading}
                                    isDisabled={!canQuery}
                                >
                                    Actualizar
                                </Button>
                                <Button
                                    leftIcon={<DownloadIcon />}
                                    variant="outline"
                                    colorScheme="green"
                                    onClick={handleDownload}
                                    isLoading={downloading}
                                    isDisabled={!canQuery}
                                >
                                    Descargar Excel
                                </Button>
                            </HStack>
                        </HStack>
                    </Stack>
                </CardBody>
            </Card>

            {loading ? (
                <Card variant="outline">
                    <CardBody>
                        <Stack align="center" py={8}>
                            <Spinner />
                            <Text color="app.textMuted">Cargando BI de horas extra...</Text>
                        </Stack>
                    </CardBody>
                </Card>
            ) : (
                <>
                    <SimpleGrid columns={{ base: 1, md: 2, xl: 5 }} spacing={4}>
                        <Card variant="outline">
                            <CardBody>
                                <Stat>
                                    <StatLabel>Total horas</StatLabel>
                                    <StatNumber>{formatHours(resumen?.totalHoras)} h</StatNumber>
                                    <StatHelpText>{formatInteger(resumen?.totalRegistros)} registros</StatHelpText>
                                </Stat>
                            </CardBody>
                        </Card>
                        {estados.map((item) => (
                            <Card key={item.estado} variant="outline">
                                <CardBody>
                                    <Stat>
                                        <StatLabel>{getEstadoRegistroHoraExtraText(item.estado)}</StatLabel>
                                        <StatNumber>{formatHours(item.horas)} h</StatNumber>
                                        <StatHelpText>{formatInteger(item.registros)} registros</StatHelpText>
                                    </Stat>
                                </CardBody>
                            </Card>
                        ))}
                    </SimpleGrid>

                    <Card variant="outline">
                        <CardBody>
                            <Text fontWeight="semibold" mb={4}>Serie temporal de horas extra</Text>
                            {(serie?.puntos.length ?? 0) > 0 ? (
                                <ReactECharts option={chartOptions} style={{ height: "420px", width: "100%" }} />
                            ) : (
                                <Box py={10}>
                                    <Text color="app.textMuted" textAlign="center">
                                        No hay registros de horas extra para la ventana seleccionada.
                                    </Text>
                                </Box>
                            )}
                        </CardBody>
                    </Card>
                </>
            )}

            <IntegrantePersonalPicker
                isOpen={integrantePicker.isOpen}
                onClose={integrantePicker.onClose}
                onSelectIntegrante={setSelectedIntegrante}
                initialSelectedId={selectedIntegrante?.id}
            />
        </Stack>
    );
}
