import { Alert, Badge, Box, Button, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { useId, useRef, useState } from "react";
import DespejeLineaFormulario from "./DespejeLineaFormulario";
import type { EjecucionDespeje, PreparacionDespeje } from "./types";

interface Props {
    preparacion: PreparacionDespeje;
    disabled?: boolean;
    onUpdated: (ejecucion: EjecucionDespeje) => void;
    onNuevoIntento: (familiaId: number) => void;
    onRefresh: () => void;
    onBusyChange?: (busy: boolean) => void;
    onDirtyChange?: (dirty: boolean) => void;
}

export default function DespejesLineaPanel({ preparacion, disabled = false, onUpdated, onNuevoIntento, onRefresh, onBusyChange, onDirtyChange }: Props) {
    const prefix = useId();
    const [plegados, setPlegados] = useState<Record<number, boolean>>(() => Object.fromEntries(
        preparacion.requisitos.map((requisito, index) => [requisito.familiaId, index !== 0]),
    ));
    const [busyPorId, setBusyPorId] = useState<Record<number, boolean>>({});
    const [dirtyPorId, setDirtyPorId] = useState<Record<number, boolean>>({});
    const busyRef = useRef<Record<number, boolean>>({});
    const dirtyRef = useRef<Record<number, boolean>>({});
    const busy = Object.values(busyPorId).some(Boolean);
    const dirty = Object.values(dirtyPorId).some(Boolean);
    const blocked = disabled || busy;
    const listos = preparacion.requisitos.filter((requisito) => requisito.listo && requisito.ejecucion != null).length;
    const todosListos = preparacion.requisitos.length > 0 && listos === preparacion.requisitos.length;

    const actualizarBusy = (id: number, value: boolean) => {
        const next = { ...busyRef.current, [id]: value };
        busyRef.current = next;
        setBusyPorId(next);
        onBusyChange?.(Object.values(next).some(Boolean));
    };

    const actualizarDirty = (id: number, value: boolean) => {
        const next = { ...dirtyRef.current, [id]: value };
        dirtyRef.current = next;
        setDirtyPorId(next);
        onDirtyChange?.(Object.values(next).some(Boolean));
    };

    return (
        <VStack align="stretch" gap={4}>
            <Box>
                <Heading size="sm">Formularios de despeje</Heading>
                <Text role="status" fontSize="sm" color="app.textMuted" mt={1}>
                    {listos} de {preparacion.requisitos.length} listos para iniciar
                </Text>
                <Text fontSize="sm" color="app.textMuted" mt={1}>Complete los formularios pendientes. Guardar, enviar o revisar un formulario no inicia la operación. Los documentos ya utilizados se conservan al reanudar.</Text>
            </Box>
            {preparacion.motivo && <Alert.Root status={preparacion.puedeIniciar ? "info" : "warning"}><Alert.Indicator />{preparacion.motivo}</Alert.Root>}
            {!preparacion.motivo && !preparacion.puedeIniciar && todosListos && <Alert.Root status="info"><Alert.Indicator />Todos los formularios están listos. Confirme el inicio para verificar su vigencia.</Alert.Root>}
            {preparacion.avisos.length > 0 && <Alert.Root status="warning"><Alert.Indicator /><VStack align="stretch" gap={1}>{preparacion.avisos.map((aviso, index) => <Text key={index}>{aviso}</Text>)}</VStack></Alert.Root>}
            {preparacion.requisitos.length === 0 && <Alert.Root status={preparacion.requiereDespeje && !preparacion.puedeIniciar ? "warning" : "info"}><Alert.Indicator />{preparacion.requiereDespeje && !preparacion.puedeIniciar ? "El área exige despeje, pero no se ha podido preparar un conjunto de formularios. Revise la configuración y el motivo informado." : "El servidor no exige formularios de despeje para este inicio."}</Alert.Root>}
            {preparacion.requisitos.map((requisito) => {
                const ejecucion = requisito.ejecucion;
                const listo = requisito.listo && ejecucion != null;
                const plegado = plegados[requisito.familiaId] ?? true;
                const contentId = prefix + "-familia-" + requisito.familiaId;
                return <Box as="section" key={requisito.familiaId} borderWidth="1px" borderRadius="md" overflow="hidden">
                    <Button
                        variant="ghost"
                        w="full"
                        h="auto"
                        minH={12}
                        p={4}
                        justifyContent="space-between"
                        whiteSpace="normal"
                        textAlign="left"
                        aria-expanded={!plegado}
                        aria-controls={contentId}
                        onClick={() => setPlegados((current) => ({ ...current, [requisito.familiaId]: !plegado }))}
                    >
                        <VStack as="span" align="stretch" gap={1} minW={0}>
                            <Text as="span" fontWeight="semibold" overflowWrap="anywhere">{requisito.familiaNombre}</Text>
                            <HStack as="span" gap={2} flexWrap="wrap">
                                <Badge colorPalette={listo ? "green" : "orange"}>{ejecucion?.estado.replace(/_/g, " ") ?? "SIN FORMULARIO"}</Badge>
                                {ejecucion && <Text as="span" fontSize="sm" color="app.textMuted">v{ejecucion.plantilla.numero} · Intento {ejecucion.intento}</Text>}
                                <Text as="span" fontSize="sm" color="app.textMuted">{listo ? "Listo para iniciar" : "Pendiente"}</Text>
                                {ejecucion && dirtyPorId[ejecucion.id] && <Text as="span" fontSize="sm" color="app.textMuted">Cambios sin guardar</Text>}
                            </HStack>
                        </VStack>
                        <Text as="span" fontSize="sm" color="app.textMuted" flexShrink={0} ms={3}>{plegado ? "Mostrar" : "Ocultar"}</Text>
                    </Button>
                    <Box id={contentId} hidden={plegado} p={{ base: 3, md: 4 }} borderTopWidth="1px">
                        {requisito.motivo && <Text fontSize="sm" color="app.textMuted" mb={3}>{requisito.motivo}</Text>}
                        {ejecucion ? <DespejeLineaFormulario
                            key={ejecucion.id}
                            ejecucion={ejecucion}
                            disabled={blocked}
                            nuevoIntentoDisabled={dirty}
                            onUpdated={onUpdated}
                            onBusyChange={(value) => actualizarBusy(ejecucion.id, value)}
                            onDirtyChange={(value) => actualizarDirty(ejecucion.id, value)}
                            onNuevoIntento={() => { if (!busy && !dirty && !disabled) onNuevoIntento(requisito.familiaId); }}
                        /> : <Alert.Root status="error"><Alert.Indicator />No se recibió el formulario de esta plantilla. Actualice el conjunto antes de iniciar.</Alert.Root>}
                    </Box>
                </Box>;
            })}
            <Button alignSelf="flex-start" size="sm" variant="outline" disabled={blocked || dirty} onClick={onRefresh}>Actualizar conjunto de despejes</Button>
            <Text fontSize="sm" color="app.textMuted">Si cambió la configuración del área, actualice el conjunto para aplicar el requisito vigente. Los formularios guardados conservan su estado y evidencia.</Text>
            {dirty && <Text fontSize="sm" color="app.textMuted">Hay cambios locales sin guardar. Guarde los borradores o complete las revisiones antes de actualizar el conjunto o preparar otro intento. Cada formulario permite descartar sus cambios con confirmación.</Text>}
        </VStack>
    );
}
