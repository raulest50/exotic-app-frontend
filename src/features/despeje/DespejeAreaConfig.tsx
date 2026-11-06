import { Alert, Badge, Box, Button, Field, Flex, Heading, HStack, NativeSelect, Spinner, Text, VStack } from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    consultarConfigDespeje,
    consultarPlantillasDespeje,
    despejeError,
    guardarConfigDespeje,
    publicarPlantillaDespeje,
    retirarPlantillaDespeje,
} from "./despejeApi";
import PlantillaDespejeEditor from "./PlantillaDespejeEditor";
import type { DespejeAreaConfiguracion, PlantillaDespeje } from "./types";

interface Props {
    areaId: number;
    isReadOnly?: boolean;
    onBusyChange?: (busy: boolean) => void;
}

export default function DespejeAreaConfig({ areaId, isReadOnly = false, onBusyChange }: Props) {
    const [config, setConfig] = useState<DespejeAreaConfiguracion | null>(null);
    const [plantillas, setPlantillas] = useState<PlantillaDespeje[]>([]);
    const [requiereDespeje, setRequiereDespeje] = useState(false);
    const [requiereRevision, setRequiereRevision] = useState(false);
    const [confirmaLinea, setConfirmaLinea] = useState(false);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [editor, setEditor] = useState<{ plantilla: PlantillaDespeje | null; copiar: boolean } | null>(null);
    const inFlight = useRef(false);
    const loadGeneration = useRef(0);
    const readOnly = isReadOnly || areaId === -1;

    const cargar = useCallback(async () => {
        const generation = ++loadGeneration.current;
        setLoading(true);
        setError(null);
        try {
            const [data, templates] = await Promise.all([consultarConfigDespeje(areaId), consultarPlantillasDespeje(areaId)]);
            if (generation !== loadGeneration.current) return;
            setConfig(data);
            setRequiereDespeje(data.requiereDespeje);
            setRequiereRevision(data.requiereRevision);
            setPlantillas(templates);
            setConfirmaLinea(false);
        } catch (cause) {
            if (generation === loadGeneration.current) setError(despejeError(cause));
        } finally {
            if (generation === loadGeneration.current) setLoading(false);
        }
    }, [areaId]);

    useEffect(() => {
        void cargar();
        return () => { loadGeneration.current += 1; };
    }, [cargar]);

    const ejecutar = async (action: () => Promise<unknown>, success: string) => {
        if (readOnly || inFlight.current) return;
        inFlight.current = true;
        setBusy(true);
        onBusyChange?.(true);
        setError(null);
        setMessage(null);
        try {
            await action();
            setMessage(success);
            await cargar();
        } catch (cause) {
            setError(despejeError(cause));
        } finally {
            inFlight.current = false;
            setBusy(false);
            onBusyChange?.(false);
        }
    };

    if (loading) return <Flex justify="center" p={6}><Spinner /></Flex>;

    const borrador = plantillas.find((plantilla) => plantilla.estado === "BORRADOR");
    const changed = config && (requiereDespeje !== config.requiereDespeje || requiereRevision !== config.requiereRevision);

    return (
        <VStack align="stretch" gap={4}>
            <Box>
                <Heading size="sm">Despeje de línea del área</Heading>
                <Text fontSize="sm" color="app.textMuted">Configure el requisito de inicio y las versiones del checklist. Los despejes anteriores se conservan.</Text>
            </Box>
            {error && <Alert.Root status="error"><Alert.Indicator /><Box><Text>{error}</Text><Button size="sm" mt={2} variant="outline" disabled={busy} onClick={() => void cargar()}>Actualizar desde el servidor</Button></Box></Alert.Root>}
            {message && <Alert.Root status="success"><Alert.Indicator />{message}</Alert.Root>}
            {readOnly && <Alert.Root status="info"><Alert.Indicator />{areaId === -1 ? "Configuración de solo lectura. El área especial del sistema no permite exigir despeje." : "Configuración de solo lectura."}</Alert.Root>}
            {config && <>
                <Flex gap={3} flexDir={{ base: "column", md: "row" }}>
                    <Field.Root disabled={readOnly || busy || Boolean(editor)}>
                        <Field.Label>Requerir despeje antes del inicio</Field.Label>
                        <NativeSelect.Root><NativeSelect.Field value={String(requiereDespeje)} onChange={(event) => setRequiereDespeje(event.target.value === "true")}><option value="false">No</option><option value="true">Sí</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
                    </Field.Root>
                    <Field.Root disabled={readOnly || busy || Boolean(editor)}>
                        <Field.Label>Revisión por otra persona autorizada</Field.Label>
                        <NativeSelect.Root><NativeSelect.Field value={String(requiereRevision)} onChange={(event) => setRequiereRevision(event.target.value === "true")}><option value="false">No</option><option value="true">Sí</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
                    </Field.Root>
                </Flex>
                {requiereDespeje && !config.requiereDespeje && <Field.Root required disabled={busy || readOnly}>
                    <Field.Label>Confirmación de uso exclusivo del área</Field.Label>
                    <NativeSelect.Root><NativeSelect.Field value={confirmaLinea ? "CONFIRMADA" : ""} onChange={(event) => setConfirmaLinea(event.target.value === "CONFIRMADA")}><option value="">Seleccione una opción</option><option value="CONFIRMADA">Confirmo que esta área corresponde a una sola línea exclusiva</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
                    <Field.HelperText color="app.textMuted">El servidor verificará la ocupación existente antes de habilitar el requisito.</Field.HelperText>
                </Field.Root>}
                <Text fontSize="sm" color="app.textMuted">Último lote: {config.antecedenteConocido ? config.ultimoLoteNumero ?? "Sin lote anterior" : "Antecedente desconocido"} · Revisión del contexto: {config.revisionContexto}</Text>
                {(config.ocupanteSeguimientoId != null || config.ocupanteOperacionId != null) && <Text fontSize="sm">El área conserva un uso ocupante; pausar no libera la línea.</Text>}
                {!readOnly && <Button alignSelf="flex-start" colorPalette="teal" loading={busy} disabled={!changed || busy || Boolean(editor) || (requiereDespeje && !config.requiereDespeje && !confirmaLinea)} onClick={() => void ejecutar(() => guardarConfigDespeje(areaId, { requiereDespeje, requiereRevision, confirmaLineaExclusiva: confirmaLinea, version: config.version }), "Configuración de despeje guardada.")}>Guardar configuración</Button>}
            </>}
            {editor ? <PlantillaDespejeEditor
                key={`${editor.plantilla?.id ?? "nueva"}-${editor.copiar}`}
                areaId={areaId}
                plantilla={editor.plantilla}
                copiar={editor.copiar}
                onCancel={() => setEditor(null)}
                onBusyChange={(value) => { setBusy(value); onBusyChange?.(value); }}
                onSaved={() => { setEditor(null); setMessage("Borrador guardado; revise sus ítems antes de publicarlo."); void cargar(); }}
            /> : <>
                <Flex justify="space-between" align="center" gap={3} flexWrap="wrap">
                    <Heading size="sm">Plantillas y versiones</Heading>
                    {!readOnly && !borrador && <Button size="sm" variant="outline" disabled={busy || !config} onClick={() => setEditor({ plantilla: null, copiar: false })}>Crear borrador</Button>}
                </Flex>
                {!plantillas.length && <Text color="app.textMuted">No hay plantillas de despeje para esta área.</Text>}
                {[...plantillas].sort((a, b) => b.numero - a.numero).map((plantilla) => <Box key={plantilla.id} p={4} borderWidth="1px" borderRadius="md" bg="app.surface">
                    <HStack justify="space-between" align="start" gap={3} flexWrap="wrap"><Box><Text fontWeight="semibold">{plantilla.nombre} · v{plantilla.numero}</Text><Text fontSize="xs" color="app.textMuted">Plantilla #{plantilla.id} · {plantilla.items.length} ítem(s)</Text></Box><Badge colorPalette={plantilla.estado === "VIGENTE" ? "green" : plantilla.estado === "BORRADOR" ? "orange" : "gray"}>{plantilla.estado}</Badge></HStack>
                    <Text fontSize="sm" mt={2}>{plantilla.motivoCambio}</Text>
                    <VStack as="ol" align="stretch" gap={1} mt={3} pl={5} listStyleType="decimal">
                        {[...plantilla.items].sort((a, b) => a.orden - b.orden).map((item) => <Text as="li" key={item.id} fontSize="sm">{item.texto} · {item.tipo === "SI_NO_NA" ? `Conforme: ${item.respuestaConforme === "NO" ? "No" : "Sí"}` : `Número: ${item.minimo ?? "sin mínimo"} a ${item.maximo ?? "sin máximo"}`} · {item.obligatorio ? "Obligatorio" : "Opcional"}{item.permiteNa ? " · Permite No aplica" : ""}</Text>)}
                    </VStack>
                    {!readOnly && <HStack mt={3} flexWrap="wrap">
                        {plantilla.estado === "BORRADOR" && <><Button size="sm" variant="outline" disabled={busy} onClick={() => setEditor({ plantilla, copiar: false })}>Editar borrador</Button><Button size="sm" colorPalette="teal" disabled={busy} onClick={() => void ejecutar(() => publicarPlantillaDespeje(plantilla.id), "Versión publicada; las ejecuciones previas conservan su versión.")}>Publicar versión</Button></>}
                        {plantilla.estado === "VIGENTE" && <><Button size="sm" variant="outline" disabled={busy || Boolean(borrador)} onClick={() => setEditor({ plantilla, copiar: true })}>Copiar a borrador</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void ejecutar(() => retirarPlantillaDespeje(plantilla.id), "Versión retirada; su evidencia histórica se conserva.")}>Retirar versión</Button></>}
                    </HStack>}
                </Box>)}
            </>}
        </VStack>
    );
}
