import { Alert, Box, Button, Field, Flex, Heading, HStack, Input, NativeSelect, Text, Textarea, VStack } from "@chakra-ui/react";
import { useRef, useState } from "react";
import { despejeError, guardarPlantillaDespeje } from "./despejeApi";
import type { FamiliaDespeje, ItemPlantillaDespejeWrite, PlantillaDespeje, TipoItemDespeje } from "./types";

interface Props {
    areaId: number;
    familia: FamiliaDespeje;
    plantilla: PlantillaDespeje | null;
    copiar?: boolean;
    onSaved: (plantilla: PlantillaDespeje) => void;
    onCancel: () => void;
    onBusyChange?: (busy: boolean) => void;
    disabled?: boolean;
}

interface ItemDraft {
    key: string;
    texto: string;
    tipo: TipoItemDespeje;
    obligatorio: boolean;
    permiteNa: boolean;
    respuestaConforme: "SI" | "NO";
    minimo: string;
    maximo: string;
}

function crearItem(item?: ItemPlantillaDespejeWrite): ItemDraft {
    return {
        key: crypto.randomUUID(),
        texto: item?.texto ?? "",
        tipo: item?.tipo ?? "SI_NO_NA",
        obligatorio: item?.obligatorio ?? true,
        permiteNa: item?.tipo === "NUMERO" ? false : item?.permiteNa ?? false,
        respuestaConforme: item?.respuestaConforme ?? "SI",
        minimo: item?.minimo == null ? "" : String(item.minimo),
        maximo: item?.maximo == null ? "" : String(item.maximo),
    };
}

export default function PlantillaDespejeEditor({ areaId, familia, plantilla, copiar = false, onSaved, onCancel, onBusyChange, disabled = false }: Props) {
    const [nombre, setNombre] = useState(plantilla?.nombre ?? familia.nombre);
    const [motivo, setMotivo] = useState(copiar ? "" : plantilla?.motivoCambio ?? "");
    const [items, setItems] = useState<ItemDraft[]>(() => plantilla?.items.length
        ? [...plantilla.items].sort((a, b) => a.orden - b.orden).map(crearItem) : [crearItem()]);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const submitting = useRef(false);
    const blocked = disabled || saving;

    const updateItem = (key: string, patch: Partial<ItemDraft>) => {
        setItems((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item));
    };

    const moveItem = (index: number, offset: number) => {
        setItems((current) => {
            const next = [...current];
            [next[index], next[index + offset]] = [next[index + offset], next[index]];
            return next;
        });
    };

    const guardar = async () => {
        if (submitting.current || disabled) return;
        const issues: string[] = [];
        if (!nombre.trim()) issues.push("Indique el título de la plantilla.");
        if (!motivo.trim()) issues.push("Indique el motivo de esta versión.");
        if (!items.length) issues.push("Agregue al menos una pregunta o medición.");
        const requestItems = items.map((item, index): ItemPlantillaDespejeWrite => {
            if (!item.texto.trim()) issues.push(`Ítem ${index + 1}: indique el texto.`);
            const minimo = item.minimo.trim() === "" ? null : Number(item.minimo.replace(",", "."));
            const maximo = item.maximo.trim() === "" ? null : Number(item.maximo.replace(",", "."));
            if (item.tipo === "NUMERO") {
                if ((minimo !== null && !Number.isFinite(minimo)) || (maximo !== null && !Number.isFinite(maximo))) {
                    issues.push(`Ítem ${index + 1}: los límites deben ser números válidos.`);
                }
                if (minimo !== null && maximo !== null && minimo > maximo) issues.push(`Ítem ${index + 1}: el mínimo supera al máximo.`);
            }
            return {
                orden: index + 1,
                texto: item.texto.trim(),
                tipo: item.tipo,
                obligatorio: item.obligatorio,
                permiteNa: item.tipo === "SI_NO_NA" && item.permiteNa,
                respuestaConforme: item.tipo === "SI_NO_NA" ? item.respuestaConforme : null,
                minimo: item.tipo === "NUMERO" ? minimo : null,
                maximo: item.tipo === "NUMERO" ? maximo : null,
            };
        });
        setErrors(issues);
        if (issues.length) return;
        submitting.current = true;
        setSaving(true);
        onBusyChange?.(true);
        try {
            const saved = await guardarPlantillaDespeje(areaId, {
                familiaId: familia.id,
                ...(!copiar && plantilla ? { id: plantilla.id, version: plantilla.version } : {}),
                nombre: nombre.trim(),
                motivoCambio: motivo.trim(),
                items: requestItems,
            });
            onSaved(saved);
        } catch (error) {
            setErrors([despejeError(error)]);
        } finally {
            submitting.current = false;
            setSaving(false);
            onBusyChange?.(false);
        }
    };

    return (
        <VStack align="stretch" gap={4}>
            <Box>
                <Heading size="sm">{familia.nombre} · {copiar ? "Copiar versión a un borrador" : plantilla ? `Editar borrador v${plantilla.numero}` : "Nueva versión"}</Heading>
                <Text fontSize="sm" color="app.textMuted">Guardar conserva un borrador. La publicación se realiza después de revisarlo.</Text>
            </Box>
            {errors.length > 0 && <Alert.Root status="error"><Alert.Indicator /><Box>{errors.map((error, index) => <Text key={index}>{error}</Text>)}</Box></Alert.Root>}
            <Field.Root required disabled={blocked}>
                <Field.Label>Título</Field.Label>
                <Input value={nombre} onChange={(event) => setNombre(event.target.value)} maxLength={200} />
            </Field.Root>
            <Field.Root required disabled={blocked}>
                <Field.Label>Motivo de la versión</Field.Label>
                <Textarea value={motivo} onChange={(event) => setMotivo(event.target.value)} maxLength={2000} />
            </Field.Root>
            {items.map((item, index) => (
                <VStack key={item.key} align="stretch" gap={3} p={4} borderWidth="1px" borderRadius="md" bg="app.surface">
                    <Flex gap={2} justify="space-between" align="center" flexWrap="wrap">
                        <Text fontWeight="semibold">Ítem {index + 1}</Text>
                        <HStack flexWrap="wrap">
                            <Button size="xs" variant="outline" disabled={blocked || index === 0} onClick={() => moveItem(index, -1)}>Subir</Button>
                            <Button size="xs" variant="outline" disabled={blocked || index === items.length - 1} onClick={() => moveItem(index, 1)}>Bajar</Button>
                            <Button size="xs" variant="outline" disabled={blocked} onClick={() => setItems((current) => current.filter((entry) => entry.key !== item.key))}>Quitar</Button>
                        </HStack>
                    </Flex>
                    <Field.Root required disabled={blocked}>
                        <Field.Label>Pregunta o medición</Field.Label>
                        <Textarea value={item.texto} onChange={(event) => updateItem(item.key, { texto: event.target.value })} maxLength={1000} />
                    </Field.Root>
                    <Flex gap={3} flexDir={{ base: "column", md: "row" }}>
                        <Field.Root disabled={blocked}>
                            <Field.Label>Tipo de respuesta</Field.Label>
                            <NativeSelect.Root><NativeSelect.Field value={item.tipo} onChange={(event) => updateItem(item.key, { tipo: event.target.value as TipoItemDespeje, permiteNa: event.target.value === "NUMERO" ? false : item.permiteNa })}><option value="SI_NO_NA">Sí / No / No aplica</option><option value="NUMERO">Número</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
                        </Field.Root>
                        <Field.Root disabled={blocked}>
                            <Field.Label>Obligatorio</Field.Label>
                            <NativeSelect.Root><NativeSelect.Field value={String(item.obligatorio)} onChange={(event) => updateItem(item.key, { obligatorio: event.target.value === "true" })}><option value="true">Sí</option><option value="false">No</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
                        </Field.Root>
                        <Field.Root disabled={blocked || item.tipo === "NUMERO"}>
                            <Field.Label>Permitir No aplica</Field.Label>
                            <NativeSelect.Root><NativeSelect.Field value={String(item.permiteNa)} onChange={(event) => updateItem(item.key, { permiteNa: event.target.value === "true" })}><option value="false">No</option><option value="true">Sí, con justificación</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
                        </Field.Root>
                    </Flex>
                    {item.tipo === "SI_NO_NA" ? (
                        <Field.Root disabled={blocked}>
                            <Field.Label>Respuesta conforme</Field.Label>
                            <NativeSelect.Root><NativeSelect.Field value={item.respuestaConforme} onChange={(event) => updateItem(item.key, { respuestaConforme: event.target.value as "SI" | "NO" })}><option value="SI">Sí</option><option value="NO">No</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
                            <Field.HelperText color="app.textMuted">La respuesta opuesta se registra como no conforme; No aplica se evalúa por separado.</Field.HelperText>
                        </Field.Root>
                    ) : (
                        <Flex gap={3} flexDir={{ base: "column", sm: "row" }}>
                            <Field.Root disabled={blocked}><Field.Label>Mínimo inclusivo (opcional)</Field.Label><Input inputMode="decimal" value={item.minimo} onChange={(event) => updateItem(item.key, { minimo: event.target.value })} /></Field.Root>
                            <Field.Root disabled={blocked}><Field.Label>Máximo inclusivo (opcional)</Field.Label><Input inputMode="decimal" value={item.maximo} onChange={(event) => updateItem(item.key, { maximo: event.target.value })} /></Field.Root>
                        </Flex>
                    )}
                </VStack>
            ))}
            <Button alignSelf="flex-start" variant="outline" disabled={blocked} onClick={() => setItems((current) => [...current, crearItem()])}>Agregar ítem</Button>
            <HStack justify="flex-end" flexWrap="wrap">
                <Button variant="ghost" disabled={blocked} onClick={onCancel}>Cancelar edición</Button>
                <Button colorPalette="teal" loading={saving} disabled={blocked} onClick={() => void guardar()}>Guardar borrador</Button>
            </HStack>
        </VStack>
    );
}
