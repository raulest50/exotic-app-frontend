import { useEffect, useMemo, useState } from "react";
import {
    Steps,
    Badge,
    Box,
    Button,
    Card,
    HStack,
    IconButton,
    Input,
    NativeSelect,
    SimpleGrid,
    Spinner,
    Stack,
    Stat,
    Text,
    useBreakpointValue,
    useDisclosure,
    Field,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import { Tooltip } from '@/components/ui/tooltip';
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
import { LuDownload, LuRepeat, LuSearch, LuX } from 'react-icons/lu';

const endPoints = new EndPointsURL();

const estadoColors: Record<EstadoRegistroHoraExtra, string> = {
    [EstadoRegistroHoraExtra.REGISTRADA]: "#3182ce",
    [EstadoRegistroHoraExtra.APROBADA]: "#38a169",
    [EstadoRegistroHoraExtra.RECHAZADA]: "#e53e3e",
    [EstadoRegistroHoraExtra.ANULADA]: "#718096",
};

export default function HorasExtraBiPanel() {
    const toast = useAppToast();
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
    const chartHeight = useBreakpointValue({ base: 300, md: 420 }) ?? 420;

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
        <Stack gap={4}>
            <Card.Root variant="outline">
                <Card.Body>
                    <Stack gap={4}>
                        <SimpleGrid columns={{ base: 1, lg: 4 }} gap={4}>
                            <Field.Root>
                                <Field.Label>Fecha desde</Field.Label>
                                <Input type="date" value={fechaDesde} onValueChange={(e) => setFechaDesde(e.target.value)} />
                            </Field.Root>
                            <Field.Root invalid={rangeInvalid}>
                                <Field.Label>Fecha hasta</Field.Label>
                                <Input type="date" value={fechaHasta} onValueChange={(e) => setFechaHasta(e.target.value)} />
                                {rangeInvalid ? (
                                    <Field.HelperText color="red.500">La fecha final no puede ser anterior.</Field.HelperText>
                                ) : null}
                            </Field.Root>
                            <Field.Root>
                                <Field.Label>Granularidad</Field.Label>
                                <NativeSelect.Root>
                                    <NativeSelect.Field
                                        value={granularidad}
                                        onValueChange={(e) => setGranularidad(e.target.value as HorasExtraBiGranularidad)}>
                                        <option value="DIA">Día</option>
                                        <option value="SEMANA">Semana</option>
                                        <option value="MES">Mes</option>
                                    </NativeSelect.Field>
                                    <NativeSelect.Indicator />
                                </NativeSelect.Root>
                            </Field.Root>
                            <Field.Root>
                                <Field.Label>Departamento</Field.Label>
                                <NativeSelect.Root>
                                    <NativeSelect.Field
                                        value={departamento}
                                        onValueChange={(e) => setDepartamento(e.target.value as DepartamentoPersonal | "")}>
                                        <option value="">Todos</option>
                                        <option value="PRODUCCION">Producción</option>
                                        <option value="ADMINISTRATIVO">Administrativo</option>
                                    </NativeSelect.Field>
                                    <NativeSelect.Indicator />
                                </NativeSelect.Root>
                            </Field.Root>
                            <Field.Root>
                                <Field.Label>Cargo</Field.Label>
                                <Input value={cargo} onValueChange={(e) => setCargo(e.target.value)} />
                            </Field.Root>
                            <Field.Root>
                                <Field.Label>Integrante</Field.Label>
                                <HStack>
                                    <Input value={integranteLabel} placeholder="Todos" readOnly />
                                    <Tooltip content="Buscar integrante">
                                        <IconButton
                                            aria-label="Buscar integrante"
                                            colorPalette="blue"
                                            onClick={integrantePicker.onOpen}><LuSearch /></IconButton>
                                    </Tooltip>
                                    <Tooltip content="Limpiar integrante">
                                        <IconButton
                                            aria-label="Limpiar integrante"
                                            variant="outline"
                                            disabled={!selectedIntegrante}
                                            onClick={() => setSelectedIntegrante(null)}><LuX /></IconButton>
                                    </Tooltip>
                                </HStack>
                            </Field.Root>
                        </SimpleGrid>
                        <Stack
                            direction={{ base: "column", md: "row" }}
                            justify="space-between"
                            align={{ base: "stretch", md: "center" }}
                            gap={3}
                        >
                            <Badge colorPalette="blue" alignSelf={{ base: "flex-start", md: "center" }}>
                                {fechaDesde} a {fechaHasta}
                            </Badge>
                            <Stack direction={{ base: "column", sm: "row" }} gap={3} align="stretch">
                                <Button
                                    colorPalette="blue"
                                    onClick={fetchData}
                                    loading={loading}
                                    disabled={!canQuery}
                                    w={{ base: "full", sm: "auto" }}><LuRepeat />Actualizar
                                                                    </Button>
                                <Button
                                    variant="outline"
                                    colorPalette="green"
                                    onClick={handleDownload}
                                    loading={downloading}
                                    disabled={!canQuery}
                                    w={{ base: "full", sm: "auto" }}><LuDownload />Descargar Excel
                                                                    </Button>
                            </Stack>
                        </Stack>
                    </Stack>
                </Card.Body>
            </Card.Root>

            {loading ? (
                <Card.Root variant="outline">
                    <Card.Body>
                        <Stack align="center" py={8}>
                            <Spinner />
                            <Text color="app.textMuted">Cargando BI de horas extra...</Text>
                        </Stack>
                    </Card.Body>
                </Card.Root>
            ) : (
                <>
                    <SimpleGrid columns={{ base: 1, md: 2, xl: 5 }} gap={4}>
                        <Card.Root variant="outline">
                            <Card.Body>
                                <Stat.Root>
                                    <Stat.Label>Total horas</Stat.Label>
                                    <Stat.ValueText>{formatHours(resumen?.totalHoras)} h</Stat.ValueText>
                                    <Stat.HelpText>{formatInteger(resumen?.totalRegistros)} registros</Stat.HelpText>
                                </Stat.Root>
                            </Card.Body>
                        </Card.Root>
                        {estados.map((item) => (
                            <Card.Root key={item.estado} variant="outline">
                                <Card.Body>
                                    <Stat.Root>
                                        <Stat.Label>{getEstadoRegistroHoraExtraText(item.estado)}</Stat.Label>
                                        <Stat.ValueText>{formatHours(item.horas)} h</Stat.ValueText>
                                        <Stat.HelpText>{formatInteger(item.registros)} registros</Stat.HelpText>
                                    </Stat.Root>
                                </Card.Body>
                            </Card.Root>
                        ))}
                    </SimpleGrid>

                    <Card.Root variant="outline">
                        <Card.Body>
                            <Text fontWeight="semibold" mb={4}>Serie temporal de horas extra</Text>
                            {(serie?.puntos.length ?? 0) > 0 ? (
                                <ReactECharts option={chartOptions} style={{ height: `${chartHeight}px`, width: "100%" }} />
                            ) : (
                                <Box py={10}>
                                    <Text color="app.textMuted" textAlign="center">
                                        No hay registros de horas extra para la ventana seleccionada.
                                    </Text>
                                </Box>
                            )}
                        </Card.Body>
                    </Card.Root>
                </>
            )}

            <IntegrantePersonalPicker
                isOpen={integrantePicker.open}
                onClose={integrantePicker.onClose}
                onSelectIntegrante={setSelectedIntegrante}
                initialSelectedId={selectedIntegrante?.id}
            />
        </Stack>
    );
}
