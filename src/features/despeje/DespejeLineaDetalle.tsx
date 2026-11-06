import { Alert, Badge, Box, Button, Field, Heading, HStack, SimpleGrid, Text, Textarea, VStack } from "@chakra-ui/react";
import { useRef, useState } from "react";
import { getExactTabNivel } from "../../auth/accessHelpers";
import { useAuth } from "../../context/AuthContext";
import { Modulo } from "../../pages/Usuarios/GestionUsuarios/types";
import { despejeError, revisarDespeje } from "./despejeApi";
import type { EjecucionDespeje } from "./types";

interface Props {
    ejecucion: EjecucionDespeje;
    permitirRevision?: boolean;
    onUpdated?: (ejecucion: EjecucionDespeje) => void;
    onBusyChange?: (busy: boolean) => void;
    onDirtyChange?: (dirty: boolean) => void;
    disabled?: boolean;
}

function fecha(value: string | null): string {
    return value ? new Date(value).toLocaleString("es-CO") : "—";
}

export default function DespejeLineaDetalle({ ejecucion, permitirRevision = false, onUpdated, onBusyChange, onDirtyChange, disabled = false }: Props) {
    const { moduloAccesos, meProfile } = useAuth();
    const nivelRevision = getExactTabNivel(moduloAccesos, Modulo.CALIDAD, "REVISION_LIBERACION_LOTES") ?? 0;
    const [motivo, setMotivo] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const submitting = useRef(false);
    const blocked = disabled || saving;
    const mismoActor = meProfile?.id != null && meProfile.id === ejecucion.enviadaPor?.id;
    const puedeRevisar = permitirRevision && Boolean(onUpdated) && nivelRevision >= 2
        && meProfile?.id != null && !mismoActor && ejecucion.estado === "PENDIENTE_REVISION";

    const revisar = async (aprobar: boolean) => {
        if (!puedeRevisar || disabled || !motivo.trim() || submitting.current) return;
        submitting.current = true;
        setSaving(true);
        onBusyChange?.(true);
        setError(null);
        try {
            const updated = await revisarDespeje(ejecucion.id, ejecucion.version, aprobar, motivo.trim());
            setMotivo("");
            onDirtyChange?.(false);
            onUpdated?.(updated);
        } catch (cause) {
            setError(despejeError(cause));
        } finally {
            submitting.current = false;
            setSaving(false);
            onBusyChange?.(false);
        }
    };

    return (
        <VStack align="stretch" gap={4}>
            <HStack justify="space-between" gap={3} flexWrap="wrap">
                <Heading size="sm">Despeje #{ejecucion.id} · intento {ejecucion.intento}</Heading>
                <Badge colorPalette={ejecucion.estado === "APROBADA" || ejecucion.estado === "UTILIZADA" ? "green" : ejecucion.estado === "RECHAZADA" || ejecucion.estado === "INVALIDADA" ? "red" : "orange"}>{ejecucion.estado.replace(/_/g, " ")}</Badge>
            </HStack>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={3} fontSize="sm">
                <Box><Text color="app.textMuted">Área y operación</Text><Text>{ejecucion.areaNombre} · {ejecucion.ordenFabricacionId != null ? `OF-${ejecucion.ordenFabricacionId}` : `OP-${ejecucion.ordenProduccionId}`}</Text></Box>
                <Box><Text color="app.textMuted">Plantilla congelada</Text><Text>{ejecucion.plantilla.nombre} · v{ejecucion.plantilla.numero}</Text></Box>
                <Box><Text color="app.textMuted">Producto y lote actuales</Text><Text>{ejecucion.productoActualNombre ?? ejecucion.productoActualId ?? "Sin producto informado"} · {ejecucion.loteActualNumero}</Text></Box>
                <Box><Text color="app.textMuted">Producto y lote anteriores</Text><Text>{ejecucion.antecedenteConocido ? `${ejecucion.productoAnteriorNombre ?? ejecucion.productoAnteriorId ?? "Sin producto anterior"} · ${ejecucion.loteAnteriorNumero ?? "Sin lote anterior"}` : "Antecedente desconocido"}</Text></Box>
                <Box><Text color="app.textMuted">Creado</Text><Text>{fecha(ejecucion.creadaEn)} · {ejecucion.creadaPor.nombre || ejecucion.creadaPor.username}</Text></Box>
                <Box><Text color="app.textMuted">Enviado</Text><Text>{fecha(ejecucion.enviadaEn)}{ejecucion.enviadaPor ? ` · ${ejecucion.enviadaPor.nombre || ejecucion.enviadaPor.username}` : ""}</Text></Box>
                <Box><Text color="app.textMuted">Revisado</Text><Text>{fecha(ejecucion.revisadaEn)}{ejecucion.revisadaPor ? ` · ${ejecucion.revisadaPor.nombre || ejecucion.revisadaPor.username}` : ""}</Text></Box>
                <Box><Text color="app.textMuted">Utilizado al iniciar</Text><Text>{fecha(ejecucion.utilizadaEn)}</Text></Box>
            </SimpleGrid>
            {!ejecucion.antecedenteConocido && <Box p={3} borderWidth="1px" borderRadius="md"><Text fontSize="sm">Confirmación de antecedente desconocido: {ejecucion.confirmaAntecedenteDesconocido ? "Sí" : "Pendiente"}</Text><Text fontSize="sm" whiteSpace="pre-wrap">{ejecucion.observacionAntecedente || "Sin justificación registrada."}</Text></Box>}
            <VStack align="stretch" gap={2}>
                {[...ejecucion.plantilla.items].sort((a, b) => a.orden - b.orden).map((item) => {
                    const respuesta = ejecucion.respuestas.find((value) => value.itemId === item.id);
                    const valor = respuesta?.valor === "NA" ? "No aplica" : item.tipo === "NUMERO"
                        ? respuesta?.numero == null ? "Sin respuesta" : String(respuesta.numero)
                        : respuesta?.valor === "SI" ? "Sí" : respuesta?.valor === "NO" ? "No" : "Sin respuesta";
                    return <Box key={item.id} borderWidth="1px" borderRadius="md" p={3}>
                        <Text fontWeight="semibold">{item.orden}. {item.texto}</Text>
                        <Text fontSize="sm">Respuesta: {valor}</Text>
                        <Text fontSize="xs" color="app.textMuted">{item.tipo === "SI_NO_NA" ? `Conforme: ${item.respuestaConforme === "NO" ? "No" : "Sí"}` : `Límites: ${item.minimo ?? "sin mínimo"} a ${item.maximo ?? "sin máximo"}`}</Text>
                        {respuesta?.observacion && <Text fontSize="sm" mt={1} whiteSpace="pre-wrap">{respuesta.observacion}</Text>}
                    </Box>;
                })}
            </VStack>
            {ejecucion.observaciones && <Box><Text fontWeight="semibold">Observaciones</Text><Text whiteSpace="pre-wrap">{ejecucion.observaciones}</Text></Box>}
            {ejecucion.motivoRevision && <Text fontSize="sm" whiteSpace="pre-wrap">Motivo de revisión: {ejecucion.motivoRevision}</Text>}
            {ejecucion.motivoInvalidacion && <Alert.Root status="warning"><Alert.Indicator />{ejecucion.motivoInvalidacion}</Alert.Root>}
            {ejecucion.estado === "PENDIENTE_REVISION" && <Alert.Root status="info"><Alert.Indicator />El despeje requiere revisión por otra persona autorizada antes del inicio.</Alert.Root>}
            {permitirRevision && mismoActor && ejecucion.estado === "PENDIENTE_REVISION" && <Text fontSize="sm" color="app.textMuted">La persona que envió el despeje no puede revisarlo.</Text>}
            {error && <Alert.Root status="error"><Alert.Indicator />{error}</Alert.Root>}
            {puedeRevisar && <VStack align="stretch" gap={3}>
                <Field.Root required disabled={blocked}><Field.Label>Motivo de la revisión</Field.Label><Textarea value={motivo} onChange={(event) => { setMotivo(event.target.value); onDirtyChange?.(event.target.value !== ""); }} maxLength={2000} /></Field.Root>
                <HStack justify="flex-end" flexWrap="wrap"><Button variant="outline" disabled={blocked || !motivo.trim()} onClick={() => void revisar(false)}>Rechazar despeje</Button><Button colorPalette="teal" loading={saving} disabled={blocked || !motivo.trim()} onClick={() => void revisar(true)}>Aprobar despeje</Button></HStack>
            </VStack>}
        </VStack>
    );
}
