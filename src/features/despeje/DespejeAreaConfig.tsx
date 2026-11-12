import { Alert, Badge, Box, Button, Field, Flex, Heading, HStack, Input, NativeSelect, Spinner, Text, VStack } from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    consultarConfigDespeje,
    consultarFamiliasDespeje,
    consultarPlantillasDespeje,
    crearFamiliaDespeje,
    despejeError,
    guardarConfigDespeje,
    publicarPlantillaDespeje,
    retirarPlantillaDespeje,
} from "./despejeApi";
import PlantillaDespejeEditor from "./PlantillaDespejeEditor";
import type { DespejeAreaConfiguracion, FamiliaDespeje, PlantillaDespeje } from "./types";

interface Props {
    areaId: number;
    isReadOnly?: boolean;
    onBusyChange?: (busy: boolean) => void;
}

export default function DespejeAreaConfig({ areaId, isReadOnly = false, onBusyChange }: Props) {
    const [config, setConfig] = useState<DespejeAreaConfiguracion | null>(null);
    const [familias, setFamilias] = useState<FamiliaDespeje[]>([]);
    const [plantillas, setPlantillas] = useState<PlantillaDespeje[]>([]);
    const [nombreFamilia, setNombreFamilia] = useState("");
    const [requiereDespeje, setRequiereDespeje] = useState(false);
    const [requiereRevision, setRequiereRevision] = useState(false);
    const [confirmaLinea, setConfirmaLinea] = useState(false);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [editor, setEditor] = useState<{ familia: FamiliaDespeje; plantilla: PlantillaDespeje | null; copiar: boolean } | null>(null);
    const inFlight = useRef(false);
    const loadGeneration = useRef(0);
    const readOnly = isReadOnly || areaId === -1;

    const cargar = useCallback(async (actualizarSeleccion = true) => {
        const generation = ++loadGeneration.current;
        setError(null);
        try {
            const [data, templates, catalogo] = await Promise.all([
                consultarConfigDespeje(areaId),
                consultarPlantillasDespeje(areaId),
                consultarFamiliasDespeje(areaId),
            ]);
            if (generation !== loadGeneration.current) return;
            setConfig(data);
            setPlantillas(templates);
            setFamilias(catalogo);
            if (actualizarSeleccion) {
                setRequiereDespeje(data.requiereDespeje);
                setRequiereRevision(data.requiereRevision);
                setConfirmaLinea(false);
            }
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

    const ejecutar = async (action: () => Promise<unknown>, success: string, actualizarSeleccion = false) => {
        if (readOnly || inFlight.current || busy) return;
        inFlight.current = true;
        setBusy(true);
        onBusyChange?.(true);
        setError(null);
        setMessage(null);
        try {
            await action();
            setMessage(success);
            await cargar(actualizarSeleccion);
        } catch (cause) {
            setError(despejeError(cause));
        } finally {
            inFlight.current = false;
            setBusy(false);
            onBusyChange?.(false);
        }
    };

    if (loading) return <Flex justify="center" p={6}><Spinner /></Flex>;

    const changed = config && (requiereDespeje !== config.requiereDespeje || requiereRevision !== config.requiereRevision);
    const sinVigentes = !plantillas.some((plantilla) => plantilla.estado === "VIGENTE");

    return (
        <VStack align="stretch" gap={5}>
            {error && <Alert.Root status="error"><Alert.Indicator /><Box><Text>{error}</Text><Button size="sm" mt={2} variant="outline" disabled={busy} onClick={() => void cargar(!config)}>Actualizar desde el servidor</Button></Box></Alert.Root>}
            {message && <Alert.Root status="success"><Alert.Indicator />{message}</Alert.Root>}
            {readOnly && <Alert.Root status="info"><Alert.Indicator />{areaId === -1 ? "Configuración de solo lectura. El área especial del sistema no permite exigir despeje." : "Configuración de solo lectura."}</Alert.Root>}

            <Box as="section" p={4} borderWidth="1px" borderRadius="md" bg="app.surface">
                <Heading size="sm">Requisito de inicio del área</Heading>
                <Text fontSize="sm" color="app.textMuted" mt={1} mb={4}>Esta configuración se guarda por separado. Si se exige despeje, todos los formularios vigentes del área deben estar listos antes del inicio.</Text>
                {config && <VStack align="stretch" gap={3}>
                    <Flex gap={3} flexDir={{ base: "column", md: "row" }}>
                        <Field.Root disabled={readOnly || busy}>
                            <Field.Label>Requerir despeje antes del inicio</Field.Label>
                            <NativeSelect.Root><NativeSelect.Field value={String(requiereDespeje)} onChange={(event) => setRequiereDespeje(event.target.value === "true")}><option value="false">No</option><option value="true">Sí</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
                            <Field.HelperText color="app.textMuted">Al guardar No, deja de exigirse despeje al iniciar o reanudar operaciones actuales y futuras. Los formularios conservan su estado y evidencia.</Field.HelperText>
                        </Field.Root>
                        <Field.Root disabled={readOnly || busy}>
                            <Field.Label>Revisión por otra persona autorizada</Field.Label>
                            <NativeSelect.Root><NativeSelect.Field value={String(requiereRevision)} onChange={(event) => setRequiereRevision(event.target.value === "true")}><option value="false">No</option><option value="true">Sí</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
                            <Field.HelperText color="app.textMuted">La política aplica a cada formulario del área.</Field.HelperText>
                        </Field.Root>
                    </Flex>
                    {requiereDespeje && !config.requiereDespeje && <Field.Root required disabled={busy || readOnly}>
                        <Field.Label>Confirmación de uso exclusivo del área</Field.Label>
                        <NativeSelect.Root><NativeSelect.Field value={confirmaLinea ? "CONFIRMADA" : ""} onChange={(event) => setConfirmaLinea(event.target.value === "CONFIRMADA")}><option value="">Seleccione una opción</option><option value="CONFIRMADA">Confirmo que esta área corresponde a una sola línea exclusiva</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
                        <Field.HelperText color="app.textMuted">Al guardar Sí, se exige despeje en los próximos inicios y reanudaciones. Las operaciones en marcha pueden pausarse o completarse.</Field.HelperText>
                    </Field.Root>}
                    <Text fontSize="sm" color="app.textMuted">Último lote: {config.antecedenteConocido ? config.ultimoLoteNumero ?? "Sin lote anterior" : "Antecedente desconocido"} · Revisión del contexto: {config.revisionContexto}</Text>
                    {(config.ocupanteSeguimientoId != null || config.ocupanteOperacionId != null) && <Alert.Root status="info"><Alert.Indicator />Puede cambiar el requisito de despeje mientras el área está ocupada. El cambio no libera la línea ni aprueba formularios. La política de revisión no puede cambiarse mientras exista una operación ocupante.</Alert.Root>}
                    {!readOnly && <Button alignSelf="flex-start" colorPalette="teal" loading={busy} disabled={!changed || busy || (requiereDespeje && !config.requiereDespeje && !confirmaLinea)} onClick={() => void ejecutar(() => guardarConfigDespeje(areaId, { requiereDespeje, requiereRevision, confirmaLineaExclusiva: confirmaLinea, version: config.version }), "Configuración de despeje guardada.", true)}>Guardar configuración del área</Button>}
                </VStack>}
            </Box>

            <Box>
                <Heading size="sm">Plantillas independientes del área</Heading>
                <Text fontSize="sm" color="app.textMuted" mt={1}>Cada plantilla tiene su propia versión vigente y su borrador. Publicar una versión no retira las versiones de otras plantillas.</Text>
            </Box>
            {config?.requiereDespeje && sinVigentes && <Alert.Root status="warning"><Alert.Indicator />El área exige despeje y no tiene formularios vigentes. Publique al menos una versión antes de iniciar una operación.</Alert.Root>}
            {!readOnly && <Flex gap={3} align="flex-end" flexDir={{ base: "column", md: "row" }}>
                <Field.Root disabled={busy || !config}>
                    <Field.Label>Nombre de la nueva plantilla</Field.Label>
                    <Input value={nombreFamilia} onChange={(event) => setNombreFamilia(event.target.value)} maxLength={200} />
                    <Field.HelperText color="app.textMuted">Crea una identidad independiente; después agregue su primera versión.</Field.HelperText>
                </Field.Root>
                <Button variant="outline" flexShrink={0} w={{ base: "full", md: "auto" }} disabled={busy || !config || !nombreFamilia.trim()} onClick={() => void ejecutar(async () => { await crearFamiliaDespeje(areaId, { nombre: nombreFamilia.trim() }); setNombreFamilia(""); }, "Plantilla creada. Agregue su primera versión.")}>Crear plantilla</Button>
            </Flex>}
            {!familias.length && <Text color="app.textMuted">No hay plantillas de despeje para esta área.</Text>}

            {familias.map((familia) => {
                const versiones = plantillas.filter((plantilla) => plantilla.familiaId === familia.id).sort((a, b) => b.numero - a.numero);
                const borrador = versiones.find((plantilla) => plantilla.estado === "BORRADOR");
                const vigente = versiones.find((plantilla) => plantilla.estado === "VIGENTE");
                const editando = editor?.familia.id === familia.id;
                return <Box as="section" key={familia.id} p={{ base: 3, md: 4 }} borderWidth="1px" borderRadius="md" bg="app.surface">
                    <Flex justify="space-between" align="start" gap={3} flexWrap="wrap">
                        <Box><Heading size="sm">{familia.nombre}</Heading><Text fontSize="xs" color="app.textMuted">Plantilla #{familia.id} · {vigente ? "Vigente v" + vigente.numero : "Sin versión vigente"} · {borrador ? "Borrador v" + borrador.numero : "Sin borrador"}</Text></Box>
                        {!readOnly && !borrador && !vigente && <Button size="sm" variant="outline" disabled={busy || Boolean(editor)} onClick={() => setEditor({ familia, plantilla: null, copiar: false })}>Crear versión</Button>}
                    </Flex>
                    {!versiones.length && <Text fontSize="sm" color="app.textMuted" mt={3}>Todavía no tiene versiones.</Text>}
                    <VStack align="stretch" gap={3} mt={3}>
                        {versiones.map((plantilla) => <Box key={plantilla.id} borderTopWidth="1px" pt={3}>
                            <HStack justify="space-between" align="start" gap={3} flexWrap="wrap"><Text fontWeight="semibold">{plantilla.nombre} · v{plantilla.numero}</Text><Badge colorPalette={plantilla.estado === "VIGENTE" ? "green" : plantilla.estado === "BORRADOR" ? "orange" : "gray"}>{plantilla.estado}</Badge></HStack>
                            <Text fontSize="sm" color="app.textMuted" mt={1}>{plantilla.motivoCambio}</Text>
                            <VStack as="ol" align="stretch" gap={1} mt={2} pl={5} listStyleType="decimal">
                                {[...plantilla.items].sort((a, b) => a.orden - b.orden).map((item) => <Text as="li" key={item.id} fontSize="sm">{item.texto} · {item.tipo === "SI_NO_NA" ? "Conforme: " + (item.respuestaConforme === "NO" ? "No" : "Sí") : "Número: " + (item.minimo ?? "sin mínimo") + " a " + (item.maximo ?? "sin máximo")} · {item.obligatorio ? "Obligatorio" : "Opcional"}{item.permiteNa ? " · Permite No aplica" : ""}</Text>)}
                            </VStack>
                            {!readOnly && <HStack mt={3} flexWrap="wrap">
                                {plantilla.estado === "BORRADOR" && <><Button size="sm" variant="outline" disabled={busy || Boolean(editor)} onClick={() => setEditor({ familia, plantilla, copiar: false })}>Editar borrador v{plantilla.numero}</Button><Button size="sm" colorPalette="teal" disabled={busy || Boolean(editor)} onClick={() => void ejecutar(() => publicarPlantillaDespeje(plantilla.id), "Versión publicada para " + familia.nombre + ". Las demás plantillas conservan su versión vigente.")}>Publicar versión</Button></>}
                                {plantilla.estado === "VIGENTE" && <><Button size="sm" variant="outline" disabled={busy || Boolean(editor) || Boolean(borrador)} onClick={() => setEditor({ familia, plantilla, copiar: true })}>Copiar a borrador</Button><Button size="sm" variant="outline" disabled={busy || Boolean(editor)} onClick={() => void ejecutar(() => retirarPlantillaDespeje(plantilla.id), "Versión retirada para " + familia.nombre + "; su evidencia histórica se conserva.")}>Retirar versión</Button></>}
                            </HStack>}
                        </Box>)}
                    </VStack>
                    {editando && editor && <Box borderTopWidth="1px" mt={4} pt={4}><PlantillaDespejeEditor
                        key={familia.id + "-" + (editor.plantilla?.id ?? "nueva") + "-" + editor.copiar}
                        areaId={areaId}
                        familia={familia}
                        plantilla={editor.plantilla}
                        copiar={editor.copiar}
                        disabled={busy}
                        onCancel={() => setEditor(null)}
                        onBusyChange={(value) => { setBusy(value); onBusyChange?.(value); }}
                        onSaved={() => { setEditor(null); setMessage("Borrador guardado para " + familia.nombre + "; revise sus ítems antes de publicarlo."); void cargar(false); }}
                    /></Box>}
                </Box>;
            })}
            {editor && <Text fontSize="sm" color="app.textMuted">Guarde o cancele la edición actual antes de editar otra versión. La configuración del área se guarda de forma independiente.</Text>}
        </VStack>
    );
}
