import {
    Alert,
    AlertIcon,
    Badge,
    Box,
    Button,
    Divider,
    Flex,
    Heading,
    HStack,
    Progress,
    SimpleGrid,
    Spinner,
    Text,
    useToast,
    VStack,
} from "@chakra-ui/react";
import { ArrowBackIcon, ArrowForwardIcon, RepeatIcon } from "@chakra-ui/icons";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTabPermission } from "../../../auth/usePermissions";
import { Modulo } from "../../Usuarios/GestionUsuarios/types.tsx";
import IngresoTerminadosStep1Lectura from "./IngresoTerminadosStep1Lectura";
import IngresoTerminadosStep2Correccion from "./IngresoTerminadosStep2Correccion";
import IngresoTerminadosStep3HyL from "./IngresoTerminadosStep3HyL";
import IngresoTerminadosStep4Resumen from "./IngresoTerminadosStep4Resumen";
import {
    confirmarCierreProduccion,
    fetchPendientesFecha,
    fetchResumenPendientes,
    resolveApiError,
} from "./ingresoTerminadosApi";
import { formatCantidad, sameCantidad } from "./produccionCierreUtils";
import type {
    CierreProduccionResponse,
    EdicionReporteProduccion,
    PendientesProduccionFecha,
    ResumenPendientesProduccion,
} from "./types";

const STEP_LABELS = ["Reportado", "Correcciones", "Reporte HyL", "Confirmación"];

function createIdempotencyKey(): string {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function createConfirmationCode(): string {
    const values = crypto.getRandomValues(new Uint32Array(1));
    return String(1000 + (values[0] % 9000));
}

function formatFecha(fecha: string): string {
    return new Intl.DateTimeFormat("es-CO", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(new Date(`${fecha}T00:00:00`));
}

export function AsistenteIngresoTerminados() {
    const toast = useToast();
    const { nivel, ready } = useTabPermission(
        Modulo.TRANSACCIONES_ALMACEN,
        "INGRESO_PRODUCTO_TERMINADO",
    );
    const puedeCerrar = nivel >= 2;

    const [resumen, setResumen] = useState<ResumenPendientesProduccion | null>(null);
    const [seleccion, setSeleccion] = useState<PendientesProduccionFecha | null>(null);
    const [ediciones, setEdiciones] = useState<Record<number, EdicionReporteProduccion>>({});
    const [paso, setPaso] = useState(1);
    const [hylGenerado, setHylGenerado] = useState(false);
    const [codigo, setCodigo] = useState("");
    const [codigoIngresado, setCodigoIngresado] = useState("");
    const [idempotencyKey, setIdempotencyKey] = useState("");
    const [cargando, setCargando] = useState(true);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resultado, setResultado] = useState<CierreProduccionResponse | null>(null);

    const cargarResumen = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            setResumen(await fetchResumenPendientes());
        } catch (cause) {
            setError(resolveApiError(cause, "No se pudieron consultar los reportes pendientes."));
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        if (ready && nivel >= 1) void cargarResumen();
    }, [cargarResumen, nivel, ready]);

    useEffect(() => {
        if (paso === 4 && !codigo) setCodigo(createConfirmationCode());
    }, [codigo, paso]);

    const abrirFecha = useCallback(async (fecha: string) => {
        setCargando(true);
        setError(null);
        try {
            const pendientes = await fetchPendientesFecha(fecha);
            if (pendientes.reportes.length === 0) {
                setSeleccion(null);
                await cargarResumen();
                toast({
                    title: "Sin reportes pendientes",
                    description: "La fecha fue actualizada por otro usuario.",
                    status: "info",
                    duration: 5000,
                    isClosable: true,
                });
                return;
            }
            setSeleccion(pendientes);
            setEdiciones(Object.fromEntries(pendientes.reportes.map((reporte) => [
                reporte.reporteId,
                { cantidadConfirmada: reporte.cantidadReportada, motivoCorreccion: "" },
            ])));
            setPaso(1);
            setHylGenerado(false);
            setCodigo("");
            setCodigoIngresado("");
            setIdempotencyKey(createIdempotencyKey());
            setResultado(null);
        } catch (cause) {
            setError(resolveApiError(cause, "No se pudieron cargar los reportes de la fecha."));
        } finally {
            setCargando(false);
        }
    }, [cargarResumen, toast]);

    const errorEdicion = useMemo(() => {
        if (!seleccion) return null;
        for (const reporte of seleccion.reportes) {
            const edicion = ediciones[reporte.reporteId];
            if (!edicion || !Number.isFinite(edicion.cantidadConfirmada) || edicion.cantidadConfirmada <= 0) {
                return `La cantidad del lote ${reporte.lote} debe ser mayor que cero.`;
            }
            const scaled = edicion.cantidadConfirmada * 10000;
            if (Math.abs(scaled - Math.round(scaled)) > 0.000001) {
                return `La cantidad del lote ${reporte.lote} admite máximo cuatro decimales.`;
            }
            if (!sameCantidad(edicion.cantidadConfirmada, reporte.cantidadReportada)
                && !edicion.motivoCorreccion.trim()) {
                return `Debe indicar el motivo de corrección del lote ${reporte.lote}.`;
            }
        }
        return null;
    }, [ediciones, seleccion]);

    const actualizarEdicion = (reporteId: number, value: EdicionReporteProduccion) => {
        setEdiciones((current) => ({ ...current, [reporteId]: value }));
        setHylGenerado(false);
        setCodigo("");
        setCodigoIngresado("");
    };

    const avanzar = () => {
        if (paso === 2 && errorEdicion) {
            toast({ title: "Revise las cantidades", description: errorEdicion, status: "warning", duration: 5000 });
            return;
        }
        if (paso === 3 && !hylGenerado) return;
        setPaso((current) => Math.min(4, current + 1));
    };

    const confirmar = async () => {
        if (!seleccion || !puedeCerrar || codigoIngresado !== codigo || errorEdicion) return;
        setEnviando(true);
        try {
            const response = await confirmarCierreProduccion({
                fechaProduccion: seleccion.fechaProduccion,
                idempotencyKey,
                reportes: seleccion.reportes.map((reporte) => ({
                    reporteId: reporte.reporteId,
                    version: reporte.version,
                    cantidadConfirmada: ediciones[reporte.reporteId].cantidadConfirmada,
                    motivoCorreccion: ediciones[reporte.reporteId].motivoCorreccion.trim() || null,
                })),
            });
            setResultado(response);
            toast({ title: "Producción cerrada", status: "success", duration: 5000, isClosable: true });
        } catch (cause) {
            const conflict = axios.isAxiosError(cause) && cause.response?.status === 409;
            toast({
                title: conflict ? "Los reportes cambiaron" : "No se pudo confirmar el cierre",
                description: resolveApiError(cause, "Revise los datos e intente nuevamente."),
                status: conflict ? "warning" : "error",
                duration: 7000,
                isClosable: true,
            });
            if (conflict) await abrirFecha(seleccion.fechaProduccion);
        } finally {
            setEnviando(false);
        }
    };

    const volverAlResumen = async () => {
        setSeleccion(null);
        setResultado(null);
        setError(null);
        await cargarResumen();
    };

    if (!ready || (nivel >= 1 && cargando)) {
        return <Flex minH="240px" align="center" justify="center"><Spinner size="lg" /></Flex>;
    }

    if (nivel < 1) {
        return <Alert status="error"><AlertIcon />No tiene acceso al reporte de producto terminado.</Alert>;
    }

    if (error) {
        return (
            <VStack align="stretch" spacing={4}>
                <Alert status="error"><AlertIcon />{error}</Alert>
                <Button alignSelf="flex-start" leftIcon={<RepeatIcon />} onClick={seleccion
                    ? () => abrirFecha(seleccion.fechaProduccion)
                    : cargarResumen}>
                    Reintentar
                </Button>
            </VStack>
        );
    }

    if (resultado) {
        return (
            <VStack align="stretch" spacing={5} maxW="760px">
                <Alert status="success" borderRadius="md"><AlertIcon />El cierre se registró de forma completa.</Alert>
                <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={3}>
                    <Box><Text fontSize="sm" color="app.textSubtle">Cierre</Text><Text fontWeight="bold">#{resultado.cierreId}</Text></Box>
                    <Box><Text fontSize="sm" color="app.textSubtle">Reportes</Text><Text fontWeight="bold">{resultado.cantidadReportes}</Text></Box>
                    <Box><Text fontSize="sm" color="app.textSubtle">Total</Text><Text fontWeight="bold">{formatCantidad(resultado.totalUnidades)}</Text></Box>
                </SimpleGrid>
                <Button alignSelf="flex-start" leftIcon={<ArrowBackIcon />} onClick={volverAlResumen}>
                    Volver a pendientes
                </Button>
            </VStack>
        );
    }

    if (!seleccion) {
        return (
            <VStack align="stretch" spacing={5}>
                <Box>
                    <Heading size="md">Reporte de producto terminado</Heading>
                    <Text mt={1} color="app.textSubtle">Seleccione una fecha para revisar y cerrar su producción.</Text>
                </Box>
                <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
                    <Box borderWidth="1px" borderRadius="md" px={4} py={3}>
                        <Text fontSize="sm" color="app.textSubtle">Pendientes de hoy</Text>
                        <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold">{resumen?.pendientesHoy ?? 0}</Text>
                    </Box>
                    <Box borderWidth="1px" borderRadius="md" px={4} py={3}>
                        <Text fontSize="sm" color="app.textSubtle">Vencidos</Text>
                        <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold">{resumen?.pendientesVencidos ?? 0}</Text>
                    </Box>
                    <Box display={{ base: "none", md: "block" }} borderWidth="1px" borderRadius="md" px={4} py={3}>
                        <Text fontSize="sm" color="app.textSubtle">Fechas pendientes</Text>
                        <Text fontSize="3xl" fontWeight="bold">{resumen?.fechas.length ?? 0}</Text>
                    </Box>
                </SimpleGrid>

                {resumen?.fechas.length ? (
                    <VStack align="stretch" spacing={2}>
                        {resumen.fechas.map((fecha) => (
                            <Button
                                key={fecha.fechaProduccion}
                                variant="outline"
                                h="auto"
                                minH="60px"
                                px={4}
                                py={3}
                                justifyContent="space-between"
                                rightIcon={<ArrowForwardIcon />}
                                onClick={() => abrirFecha(fecha.fechaProduccion)}
                            >
                                <Box textAlign="left" minW={0}>
                                    <HStack spacing={2} flexWrap="wrap">
                                        <Text>{formatFecha(fecha.fechaProduccion)}</Text>
                                        {fecha.vencida ? <Badge colorScheme="orange">Vencido</Badge> : null}
                                    </HStack>
                                    <Text mt={1} fontSize="sm" fontWeight="normal" color="app.textSubtle">
                                        {fecha.cantidadReportes} lote(s) · {formatCantidad(fecha.totalUnidades)} unidades
                                    </Text>
                                </Box>
                            </Button>
                        ))}
                    </VStack>
                ) : (
                    <Alert status="info" borderRadius="md"><AlertIcon />No hay reportes de producción pendientes.</Alert>
                )}
            </VStack>
        );
    }

    return (
        <VStack align="stretch" spacing={5}>
            <Flex justify="space-between" gap={3} align={{ base: "flex-start", md: "center" }} flexDir={{ base: "column", md: "row" }}>
                <Box>
                    <Heading size="md">Producción del {formatFecha(seleccion.fechaProduccion)}</Heading>
                    <Text mt={1} color="app.textSubtle">{seleccion.reportes.length} lote(s) pendientes</Text>
                </Box>
                <Button size="sm" variant="ghost" leftIcon={<ArrowBackIcon />} onClick={volverAlResumen}>
                    Cambiar fecha
                </Button>
            </Flex>

            <Box>
                <Progress value={paso * 25} size="sm" colorScheme="teal" borderRadius="sm" />
                <HStack mt={2} justify="space-between" overflowX="auto" spacing={4}>
                    {STEP_LABELS.map((label, index) => (
                        <Text
                            key={label}
                            fontSize="sm"
                            whiteSpace="nowrap"
                            fontWeight={paso === index + 1 ? "bold" : "normal"}
                            color={paso >= index + 1 ? "app.text" : "app.textSubtle"}
                        >
                            {index + 1}. {label}
                        </Text>
                    ))}
                </HStack>
            </Box>

            <Divider />

            {paso === 1 ? <IngresoTerminadosStep1Lectura reportes={seleccion.reportes} /> : null}
            {paso === 2 ? (
                <IngresoTerminadosStep2Correccion
                    reportes={seleccion.reportes}
                    ediciones={ediciones}
                    editable={puedeCerrar}
                    onChange={actualizarEdicion}
                />
            ) : null}
            {paso === 3 ? (
                <IngresoTerminadosStep3HyL
                    fechaProduccion={seleccion.fechaProduccion}
                    reportes={seleccion.reportes}
                    ediciones={ediciones}
                    generado={hylGenerado}
                    onGenerated={() => setHylGenerado(true)}
                    onInvalidated={() => setHylGenerado(false)}
                />
            ) : null}
            {paso === 4 ? (
                <IngresoTerminadosStep4Resumen
                    reportes={seleccion.reportes}
                    ediciones={ediciones}
                    codigo={codigo}
                    codigoIngresado={codigoIngresado}
                    puedeCerrar={puedeCerrar}
                    enviando={enviando}
                    onCodigoChange={setCodigoIngresado}
                    onSubmit={confirmar}
                />
            ) : null}

            <Divider />
            <HStack justify="space-between">
                <Button
                    leftIcon={<ArrowBackIcon />}
                    variant="outline"
                    visibility={paso === 1 ? "hidden" : "visible"}
                    onClick={() => setPaso((current) => Math.max(1, current - 1))}
                >
                    Anterior
                </Button>
                {paso < 4 ? (
                    <Button
                        rightIcon={<ArrowForwardIcon />}
                        colorScheme="teal"
                        onClick={avanzar}
                        isDisabled={(paso === 2 && Boolean(errorEdicion)) || (paso === 3 && !hylGenerado)}
                    >
                        Continuar
                    </Button>
                ) : null}
            </HStack>
        </VStack>
    );
}

export default AsistenteIngresoTerminados;
