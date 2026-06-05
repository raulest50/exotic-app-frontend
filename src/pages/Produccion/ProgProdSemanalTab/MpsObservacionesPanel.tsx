import { useMemo, useState } from "react";
import {
    Alert,
    AlertIcon,
    Badge,
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    Select,
    Spinner,
    Text,
    Textarea,
    VStack,
} from "@chakra-ui/react";
import type {
    MpsSemanalDraftDTO,
    MpsSemanalObservacionDTO,
    MpsSemanalObservacionEstado,
    MpsSemanalObservacionTipo,
} from "../ProgProdMensualTab/PlaneacionProduccionService";

type MpsObservacionesMode = "programacion" | "aprobacion";

interface MpsObservacionesPanelProps {
    mode: MpsObservacionesMode;
    mps: MpsSemanalDraftDTO | null;
    observaciones: MpsSemanalObservacionDTO[];
    isLoading: boolean;
    error: string | null;
    hasUnsavedChanges?: boolean;
    onRetry?: () => void;
    onCreateObservacion?: (tipo: MpsSemanalObservacionTipo, mensaje: string) => Promise<void>;
    onAtenderObservacion?: (observacionId: number, respuestaCorreccion: string) => Promise<void>;
    onCerrarObservacion?: (observacionId: number) => Promise<void>;
}

const OBSERVACION_TIPO_OPTIONS: Array<{ value: MpsSemanalObservacionTipo; label: string }> = [
    { value: "BLOQUEANTE", label: "Bloqueante" },
    { value: "ADVERTENCIA", label: "Advertencia" },
    { value: "INFORMATIVA", label: "Informativa" },
    { value: "OTRO", label: "Otro" },
];

function getEstadoColorScheme(estado: MpsSemanalObservacionEstado): string {
    switch (estado) {
        case "ABIERTA":
            return "orange";
        case "ATENDIDA":
            return "blue";
        case "CERRADA":
            return "green";
        default:
            return "gray";
    }
}

function getEstadoLabel(estado: MpsSemanalObservacionEstado): string {
    switch (estado) {
        case "ABIERTA":
            return "Abierta";
        case "ATENDIDA":
            return "Atendida";
        case "CERRADA":
            return "Cerrada";
        default:
            return estado;
    }
}

function getTipoColorScheme(tipo: MpsSemanalObservacionTipo | null | undefined): string {
    switch (tipo) {
        case "BLOQUEANTE":
            return "red";
        case "ADVERTENCIA":
            return "orange";
        case "INFORMATIVA":
            return "blue";
        case "OTRO":
            return "gray";
        default:
            return "gray";
    }
}

function getTipoLabel(tipo: MpsSemanalObservacionTipo | null | undefined): string {
    switch (tipo) {
        case "BLOQUEANTE":
            return "Bloqueante";
        case "ADVERTENCIA":
            return "Advertencia";
        case "INFORMATIVA":
            return "Informativa";
        case "OTRO":
            return "Otro";
        default:
            return "Sin tipo";
    }
}

function formatDateTimeLabel(value: string | null): string {
    if (!value) {
        return "-";
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleString("es-CO", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function MpsObservacionesPanel({
    mode,
    mps,
    observaciones,
    isLoading,
    error,
    hasUnsavedChanges = false,
    onRetry,
    onCreateObservacion,
    onAtenderObservacion,
    onCerrarObservacion,
}: MpsObservacionesPanelProps) {
    const [newMensaje, setNewMensaje] = useState("");
    const [newTipo, setNewTipo] = useState<MpsSemanalObservacionTipo>("BLOQUEANTE");
    const [respuestas, setRespuestas] = useState<Record<number, string>>({});
    const [pendingAction, setPendingAction] = useState<string | null>(null);

    const counts = useMemo(() => {
        return observaciones.reduce(
            (acc, observacion) => {
                acc.total += 1;
                if (observacion.estado === "ABIERTA") acc.abiertas += 1;
                if (observacion.estado === "ATENDIDA") acc.atendidas += 1;
                if (observacion.estado === "CERRADA") acc.cerradas += 1;
                return acc;
            },
            { total: 0, abiertas: 0, atendidas: 0, cerradas: 0 },
        );
    }, [observaciones]);

    const canCreate = mode === "aprobacion" && mps?.estado === "BORRADOR" && Boolean(onCreateObservacion);
    const canAttend = mode === "programacion" && mps?.estado === "BORRADOR" && Boolean(onAtenderObservacion);
    const canClose = mode === "aprobacion" && mps?.estado === "BORRADOR" && Boolean(onCerrarObservacion);

    const handleCreate = async () => {
        const mensaje = newMensaje.trim();
        if (!mensaje || !onCreateObservacion) {
            return;
        }
        setPendingAction("create");
        try {
            await onCreateObservacion(newTipo, mensaje);
            setNewMensaje("");
            setNewTipo("BLOQUEANTE");
        } catch {
            // El padre muestra el toast de error y conserva el texto escrito.
        } finally {
            setPendingAction(null);
        }
    };

    const handleAttend = async (observacionId: number) => {
        const respuesta = respuestas[observacionId]?.trim() ?? "";
        if (!respuesta || !onAtenderObservacion) {
            return;
        }
        setPendingAction(`attend-${observacionId}`);
        try {
            await onAtenderObservacion(observacionId, respuesta);
            setRespuestas((current) => {
                const next = { ...current };
                delete next[observacionId];
                return next;
            });
        } catch {
            // El padre muestra el toast de error y conserva la respuesta escrita.
        } finally {
            setPendingAction(null);
        }
    };

    const handleClose = async (observacionId: number) => {
        if (!onCerrarObservacion) {
            return;
        }
        setPendingAction(`close-${observacionId}`);
        try {
            await onCerrarObservacion(observacionId);
        } catch {
            // El padre muestra el toast de error.
        } finally {
            setPendingAction(null);
        }
    };

    return (
        <Box bg="white" borderWidth="1px" borderRadius="md" p={4} boxShadow="sm">
            <Flex justify="space-between" align="start" gap={3} wrap="wrap" mb={4}>
                <Box>
                    <Text fontWeight="bold">Observaciones del MPS</Text>
                    <Text fontSize="sm" color="gray.600">
                        Seguimiento de revision entre aprobacion y programacion.
                    </Text>
                </Box>
                <Flex gap={2} wrap="wrap">
                    <Badge colorScheme={counts.total > 0 ? "teal" : "gray"}>{counts.total} total</Badge>
                    {counts.abiertas > 0 && <Badge colorScheme="orange">{counts.abiertas} abiertas</Badge>}
                    {counts.atendidas > 0 && <Badge colorScheme="blue">{counts.atendidas} atendidas</Badge>}
                    {counts.cerradas > 0 && <Badge colorScheme="green">{counts.cerradas} cerradas</Badge>}
                </Flex>
            </Flex>

            {!mps ? (
                <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <Text fontSize="sm">Guarde el MPS para recibir observaciones.</Text>
                </Alert>
            ) : (
                <VStack align="stretch" spacing={4}>
                    {canCreate && (
                        <Box p={3} bg="gray.50" borderRadius="md" borderWidth="1px" borderColor="gray.200">
                            <VStack align="stretch" spacing={3}>
                                <FormControl>
                                    <FormLabel fontSize="sm">Tipo de observacion</FormLabel>
                                    <Select
                                        value={newTipo}
                                        onChange={(event) => setNewTipo(event.target.value as MpsSemanalObservacionTipo)}
                                        bg="white"
                                    >
                                        {OBSERVACION_TIPO_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </Select>
                                </FormControl>
                                <FormControl>
                                    <FormLabel fontSize="sm">Nueva observacion</FormLabel>
                                    <Textarea
                                        value={newMensaje}
                                        onChange={(event) => setNewMensaje(event.target.value)}
                                        placeholder="Describa el ajuste que debe revisar programacion."
                                        rows={3}
                                        bg="white"
                                    />
                                </FormControl>
                            </VStack>
                            <Flex mt={3} justify="flex-end">
                                <Button
                                    colorScheme="orange"
                                    onClick={() => void handleCreate()}
                                    isLoading={pendingAction === "create"}
                                    isDisabled={!newMensaje.trim()}
                                >
                                    Registrar observacion
                                </Button>
                            </Flex>
                        </Box>
                    )}

                    {mode === "aprobacion" && mps.estado !== "BORRADOR" && (
                        <Alert status="info" borderRadius="md">
                            <AlertIcon />
                            <Text fontSize="sm">Este MPS ya no admite nuevas observaciones.</Text>
                        </Alert>
                    )}

                    {error && (
                        <Alert status="error" borderRadius="md">
                            <AlertIcon />
                            <Flex justify="space-between" align="center" gap={3} flex="1" wrap="wrap">
                                <Text fontSize="sm">{error}</Text>
                                {onRetry && (
                                    <Button size="sm" variant="outline" onClick={onRetry}>
                                        Reintentar
                                    </Button>
                                )}
                            </Flex>
                        </Alert>
                    )}

                    {isLoading ? (
                        <Flex align="center" justify="center" py={8} gap={3}>
                            <Spinner color="teal.500" />
                            <Text color="gray.600">Cargando observaciones...</Text>
                        </Flex>
                    ) : observaciones.length === 0 ? (
                        <Box p={4} bg="gray.50" borderRadius="md">
                            <Text color="gray.500" fontSize="sm">No hay observaciones registradas para este MPS.</Text>
                        </Box>
                    ) : (
                        <VStack align="stretch" spacing={3}>
                            {observaciones.map((observacion) => {
                                const responseValue = respuestas[observacion.observacionId] ?? "";
                                const attendDisabled = hasUnsavedChanges || !responseValue.trim();
                                return (
                                    <Box
                                        key={observacion.observacionId}
                                        borderWidth="1px"
                                        borderColor="gray.200"
                                        borderRadius="md"
                                        p={3}
                                        bg={observacion.estado === "CERRADA" ? "green.50" : "white"}
                                    >
                                        <Flex justify="space-between" align="start" gap={3} wrap="wrap">
                                            <Box minW={0}>
                                                <Flex gap={2} wrap="wrap">
                                                    <Badge colorScheme={getTipoColorScheme(observacion.tipo)}>
                                                        {getTipoLabel(observacion.tipo)}
                                                    </Badge>
                                                    <Badge colorScheme={getEstadoColorScheme(observacion.estado)}>
                                                        {getEstadoLabel(observacion.estado)}
                                                    </Badge>
                                                    <Badge colorScheme="purple">Revision {observacion.revisionMps}</Badge>
                                                </Flex>
                                                <Text mt={2} whiteSpace="pre-line" color="gray.800">
                                                    {observacion.mensaje}
                                                </Text>
                                                <Text mt={2} fontSize="xs" color="gray.500">
                                                    Por {observacion.autorUsername} - {formatDateTimeLabel(observacion.fechaCreacion)}
                                                </Text>
                                            </Box>
                                        </Flex>

                                        {observacion.respuestaCorreccion && (
                                            <Box mt={3} p={3} bg="blue.50" borderRadius="md">
                                                <Text fontSize="xs" color="blue.700" fontWeight="semibold">
                                                    Respuesta de programacion
                                                </Text>
                                                <Text mt={1} fontSize="sm" color="blue.900" whiteSpace="pre-line">
                                                    {observacion.respuestaCorreccion}
                                                </Text>
                                                <Text mt={2} fontSize="xs" color="blue.700">
                                                    Por {observacion.atendidaPorUsername ?? "-"} - {formatDateTimeLabel(observacion.fechaAtencion)}
                                                </Text>
                                            </Box>
                                        )}

                                        {canAttend && observacion.estado === "ABIERTA" && (
                                            <Box mt={3}>
                                                {hasUnsavedChanges && (
                                                    <Alert status="warning" borderRadius="md" mb={3}>
                                                        <AlertIcon />
                                                        <Text fontSize="sm">
                                                            Guarde primero el borrador corregido antes de marcar la observacion como atendida.
                                                        </Text>
                                                    </Alert>
                                                )}
                                                <FormControl>
                                                    <FormLabel fontSize="sm">Respuesta de correccion</FormLabel>
                                                    <Textarea
                                                        value={responseValue}
                                                        onChange={(event) => setRespuestas((current) => ({
                                                            ...current,
                                                            [observacion.observacionId]: event.target.value,
                                                        }))}
                                                        placeholder="Describa la correccion realizada."
                                                        rows={3}
                                                    />
                                                </FormControl>
                                                <Flex mt={3} justify="flex-end">
                                                    <Button
                                                        colorScheme="blue"
                                                        onClick={() => void handleAttend(observacion.observacionId)}
                                                        isLoading={pendingAction === `attend-${observacion.observacionId}`}
                                                        isDisabled={attendDisabled}
                                                    >
                                                        Marcar atendida
                                                    </Button>
                                                </Flex>
                                            </Box>
                                        )}

                                        {canClose && observacion.estado === "ATENDIDA" && (
                                            <Flex mt={3} justify="flex-end">
                                                <Button
                                                    colorScheme="green"
                                                    onClick={() => void handleClose(observacion.observacionId)}
                                                    isLoading={pendingAction === `close-${observacion.observacionId}`}
                                                >
                                                    Aceptar correccion
                                                </Button>
                                            </Flex>
                                        )}

                                        {observacion.estado === "CERRADA" && (
                                            <Text mt={3} fontSize="xs" color="green.700">
                                                Cerrada por {observacion.cerradaPorUsername ?? "-"} - {formatDateTimeLabel(observacion.fechaCierre)}
                                            </Text>
                                        )}
                                    </Box>
                                );
                            })}
                        </VStack>
                    )}
                </VStack>
            )}
        </Box>
    );
}
