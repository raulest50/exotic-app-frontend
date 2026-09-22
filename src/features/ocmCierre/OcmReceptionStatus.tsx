import { useEffect, useState } from "react";
import { Box, Button, HStack, Spinner, Text } from "@chakra-ui/react";
import { consultarEstadoRecepcion } from "./api";
import { formatOcmDate } from "./format";
import type { OcmCierreOrigen, OcmEstadoRecepcion } from "./types";

const origenLabels: Record<OcmCierreOrigen, string> = {
    MANUAL: "Manual",
    MANUAL_DIRECTIVAS: "Manual desde Directivas Maestras",
    AUTOMATICO_RECEPCION: "Automático por recepción completa",
    AUTOMATICO_PLAZO: "Automático por plazo",
};

export default function OcmReceptionStatus({ ordenCompraId }: { ordenCompraId?: number }) {
    const [estado, setEstado] = useState<OcmEstadoRecepcion | null>(null);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        if (!ordenCompraId) return;
        const controller = new AbortController();
        setLoading(true);
        setError(false);
        setEstado(null);
        consultarEstadoRecepcion(ordenCompraId, controller.signal)
            .then(data => { if (!controller.signal.aborted) setEstado(data); })
            .catch(() => { if (!controller.signal.aborted) setError(true); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [ordenCompraId, revision]);

    if (!ordenCompraId) return null;
    return (
        <Box borderWidth="1px" borderRadius="md" p={3} w="full" my={3} aria-live="polite">
            <HStack justify="space-between" flexWrap="wrap" mb={2}>
                <Text fontWeight="semibold">Recepción y cierre de OCM {ordenCompraId}</Text>
                <Button size="xs" variant="outline" disabled={loading} onClick={() => setRevision(value => value + 1)}>Actualizar estado</Button>
            </HStack>
            {loading && <HStack><Spinner size="sm" /><Text>Consultando estado…</Text></HStack>}
            {error && <Text role="status">No se pudo consultar el estado de cierre. Esto no modifica el resultado del registro de recepción.</Text>}
            {estado && <>
                <Text>{estado.recepcionCompleta ? "Recepción completa" : "Recepción parcial o pendiente"}</Text>
                {estado.recepcionCompleta && <Text>Fecha de recepción completa: {formatOcmDate(estado.fechaRecepcionCompleta)} (hora de Colombia)</Text>}
                {estado.estado === 2 && <Text>{estado.fechaCierreAutomaticoPrevista
                    ? `Cierre automático previsto: ${formatOcmDate(estado.fechaCierreAutomaticoPrevista)} (hora de Colombia). Se verificará en el siguiente ciclo de cierre.`
                    : "Sin cierre automático programado."}</Text>}
                {estado.estado === 3 && <>
                    <Text fontWeight="semibold">OCM cerrada</Text>
                    <Text>Fecha de cierre: {formatOcmDate(estado.fechaCierre)} (hora de Colombia)</Text>
                    <Text>Origen: {estado.origenCierre ? origenLabels[estado.origenCierre] : "No registrado (OCM histórica)"}</Text>
                    {estado.usuarioCierreUsername && <Text>Cerrada por: {estado.usuarioCierreUsername}</Text>}
                </>}
                {estado.estado === -1 && <Text>OCM cancelada</Text>}
            </>}
        </Box>
    );
}
