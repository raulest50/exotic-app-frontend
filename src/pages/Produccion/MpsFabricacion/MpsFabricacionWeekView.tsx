import { Badge, Box, Button, Field, Flex, Heading, Input, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { addLocalDays, formatSemanaMpsDisplayDate } from "../ProgProdSemanalTab/semanaMps.utils";
import type { MpsOfLineaRequest, MpsOfPropuesta } from "./mpsFabricacionApi";

export interface MpsFabricacionLineView extends MpsOfLineaRequest {
    key: string;
    nombre: string;
    unidad: string;
    elegible: boolean;
    estado: MpsOfPropuesta["estado"];
    ordenFabricacionId: number | null;
    lote: string | null;
    estadoOrdenFabricacion: MpsOfPropuesta["estadoOrdenFabricacion"];
    editable: boolean;
    cancelable: boolean;
    motivoBloqueo: string | null;
}

interface Props {
    week: string;
    lines: MpsFabricacionLineView[];
    editable?: boolean;
    busy?: boolean;
    approved?: boolean;
    minStartDate?: string;
    dirtyKeys?: ReadonlySet<string>;
    onChange?: (key: string, values: Partial<MpsOfLineaRequest>) => void;
    onRemove?: (key: string) => void;
    onSave?: (key: string) => void;
    onOpenOrder?: (id: number) => void;
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
}

export default function MpsFabricacionWeekView({ week, lines, editable = false, busy = false, approved = false, minStartDate, dirtyKeys, onChange, onRemove, onSave, onOpenOrder }: Props) {
    return (
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3, "2xl": 7 }} gap={3} alignItems="start" aria-label="Programación semanal de fabricación">
            {DAYS.map((day, dayIndex) => {
                const date = addLocalDays(week, dayIndex);
                const dayLines = lines.map((line, index) => ({ line, index })).filter(({ line }) => {
                    const start = line.fechaInicio.slice(0, 10);
                    // Conservar visible una captura temporalmente vacía o fuera de semana para poder corregirla.
                    const group = start >= week && start <= addLocalDays(week, 6) ? start : week;
                    return group === date;
                });
                return (
                    <Box as="section" key={date} minW={0} borderWidth="1px" borderColor="app.border" borderRadius="md" p={3} bg="app.surface">
                        <Heading as="h3" size="sm">{day}</Heading>
                        <Text fontSize="sm" color="app.textSubtle" mb={3}>{formatSemanaMpsDisplayDate(date)}</Text>
                        <VStack align="stretch" gap={3}>
                            {!dayLines.length && <Text fontSize="sm" color="app.textSubtle">Sin tandas</Text>}
                            {dayLines.map(({ line, index }) => {
                                const canEdit = editable && line.estado !== "CANCELADO" && line.editable;
                                const canRemove = editable && line.estado !== "CANCELADO" && (line.id === null || (line.cancelable && (approved || line.editable)));
                                return (
                                    <Box key={line.key} borderWidth="1px" borderColor="app.border" borderRadius="md" p={3} opacity={line.estado === "CANCELADO" ? 0.65 : 1}>
                                        <Flex gap={2} wrap="wrap" mb={2}>
                                            <Badge colorPalette={line.estado === "CANCELADO" ? "red" : "teal"}>{line.estado === "CANCELADO" ? "Cancelada" : "Tanda"}</Badge>
                                            {line.ordenFabricacionId != null && <Badge colorPalette="purple">OF-{line.ordenFabricacionId}</Badge>}
                                            {dirtyKeys?.has(line.key) && <Badge colorPalette="orange">Sin guardar</Badge>}
                                        </Flex>
                                        <Text fontWeight="semibold" overflowWrap="anywhere">{line.nombre}</Text>
                                        <Text fontSize="xs" color="app.textSubtle">{line.semiTerminadoId}</Text>
                                        {!line.elegible && <Text fontSize="sm" color="red.fg">Ya no está marcado para OF</Text>}
                                        {canEdit ? (
                                            <VStack align="stretch" gap={2} mt={3}>
                                                <Field.Root required>
                                                    <Field.Label htmlFor={`of-cantidad-${line.key}`}>Cantidad ({line.unidad})</Field.Label>
                                                    <Input id={`of-cantidad-${line.key}`} aria-label={`Cantidad propuesta ${index + 1}`} type="number" min="0.0001" step="0.0001" value={line.cantidad} disabled={busy || line.ordenFabricacionId !== null} onChange={e => onChange?.(line.key, { cantidad: e.target.value })} />
                                                    {line.ordenFabricacionId !== null && <Field.HelperText>La cantidad emitida se conserva. Para cambiarla, cancele esta tanda y agregue su reemplazo.</Field.HelperText>}
                                                </Field.Root>
                                                <Field.Root required>
                                                    <Field.Label htmlFor={`of-inicio-${line.key}`}>Inicio</Field.Label>
                                                    <Input id={`of-inicio-${line.key}`} aria-label={`Inicio propuesta ${index + 1}`} type="datetime-local" step="1" min={`${minStartDate && minStartDate > week ? minStartDate : week}T00:00`} max={`${addLocalDays(week, 6)}T23:59:59`} value={line.fechaInicio} disabled={busy} onChange={e => onChange?.(line.key, { fechaInicio: e.target.value })} />
                                                </Field.Root>
                                                <Field.Root required>
                                                    <Field.Label htmlFor={`of-final-${line.key}`}>Final</Field.Label>
                                                    <Input id={`of-final-${line.key}`} aria-label={`Final propuesta ${index + 1}`} type="datetime-local" step="1" min={line.fechaInicio} value={line.fechaFinal} disabled={busy} onChange={e => onChange?.(line.key, { fechaFinal: e.target.value })} />
                                                </Field.Root>
                                                <Field.Root>
                                                    <Field.Label htmlFor={`of-nota-${line.key}`}>Observaciones</Field.Label>
                                                    <Input id={`of-nota-${line.key}`} aria-label={`Observaciones propuesta ${index + 1}`} maxLength={2000} value={line.observaciones ?? ""} disabled={busy} onChange={e => onChange?.(line.key, { observaciones: e.target.value })} />
                                                </Field.Root>
                                            </VStack>
                                        ) : (
                                            <VStack align="stretch" gap={1} mt={2}>
                                                <Text fontWeight="semibold">{line.cantidad} {line.unidad}</Text>
                                                <Text fontSize="sm">Inicio: {formatDate(line.fechaInicio)}</Text>
                                                <Text fontSize="sm">Final: {formatDate(line.fechaFinal)}</Text>
                                                {line.observaciones && <Text fontSize="sm" whiteSpace="pre-wrap">{line.observaciones}</Text>}
                                            </VStack>
                                        )}
                                        {line.lote && <Text fontSize="sm" mt={2}>Lote: {line.lote}</Text>}
                                        {line.estadoOrdenFabricacion && <Text fontSize="sm">{line.estadoOrdenFabricacion.replace(/_/g, " ")}</Text>}
                                        {line.motivoBloqueo && <Text fontSize="sm" color="app.textSubtle" mt={2}>{line.motivoBloqueo}</Text>}
                                        <Flex mt={3} gap={2} wrap="wrap">
                                            {approved && canEdit && onSave && <Button size="xs" colorPalette="teal" disabled={busy || !dirtyKeys?.has(line.key)} onClick={() => onSave(line.key)}>Guardar tanda</Button>}
                                            {canRemove && onRemove && <Button size="xs" variant="outline" colorPalette="red" disabled={busy} onClick={() => onRemove(line.key)}>{approved && line.id !== null ? "Cancelar tanda" : "Quitar"}</Button>}
                                            {line.ordenFabricacionId != null && onOpenOrder && <Button size="xs" variant="outline" disabled={busy} onClick={() => onOpenOrder(line.ordenFabricacionId!)}>Ver OF</Button>}
                                        </Flex>
                                    </Box>
                                );
                            })}
                        </VStack>
                    </Box>
                );
            })}
        </SimpleGrid>
    );
}
