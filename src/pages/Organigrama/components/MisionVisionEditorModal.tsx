import { useEffect, useState } from "react";
import axios from "axios";
import {
  Steps,
  Alert,
  Box,
  Button,
  Flex,
  IconButton,
  Input,
  Text,
  Textarea,
  VStack,
  useToast,
  Field,
  Dialog,
  Portal,
} from "@chakra-ui/react";
import { Tooltip } from '@/components/ui/tooltip';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  MisionVisionVersion,
  createMisionVisionVersion,
} from "../../../api/MisionVisionApi";
import RichTextEditor from "./RichTextEditor";
import { richTextHasContent } from "./SafeRichText";
import { LuArrowDown, LuArrowUp, LuGripVertical, LuPlus, LuTrash2 } from 'react-icons/lu';

interface DraftValue {
  key: string;
  titulo: string;
  descripcionHtml: string;
}

interface MisionVisionEditorModalProps {
  isOpen: boolean;
  vigente: MisionVisionVersion;
  onClose: () => void;
  onSaved: (created: MisionVisionVersion) => void;
  onReloadCurrent: () => Promise<MisionVisionVersion>;
  onForbidden: () => Promise<void>;
}

const MAX_VALUES = 12;

function createDraftKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `valor-${Date.now()}-${Math.random()}`;
}

function draftFromVersion(version: MisionVisionVersion) {
  return {
    misionHtml: version.misionHtml,
    visionHtml: version.visionHtml,
    valores: version.valores
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((value) => ({
        key: `persisted-${value.id}`,
        titulo: value.titulo,
        descripcionHtml: value.descripcionHtml,
      })),
    motivoCambio: "",
  };
}

export default function MisionVisionEditorModal({
  isOpen,
  vigente,
  onClose,
  onSaved,
  onReloadCurrent,
  onForbidden,
}: MisionVisionEditorModalProps) {
  const toast = useToast();
  const [versionBase, setVersionBase] = useState(vigente.version);
  const [misionHtml, setMisionHtml] = useState(vigente.misionHtml);
  const [visionHtml, setVisionHtml] = useState(vigente.visionHtml);
  const [valores, setValores] = useState<DraftValue[]>([]);
  const [motivoCambio, setMotivoCambio] = useState("");
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    if (!isOpen) return;
    const draft = draftFromVersion(vigente);
    setVersionBase(vigente.version);
    setMisionHtml(draft.misionHtml);
    setVisionHtml(draft.visionHtml);
    setValores(draft.valores);
    setMotivoCambio(draft.motivoCambio);
    setConflict(false);
    setError(null);
  }, [isOpen, vigente]);

  const updateValue = (key: string, patch: Partial<Omit<DraftValue, "key">>) => {
    setValores((current) => current.map((value) => value.key === key ? { ...value, ...patch } : value));
  };

  const moveValue = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= valores.length) return;
    setValores((current) => arrayMove(current, index, target));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setValores((current) => {
      const oldIndex = current.findIndex((value) => value.key === active.id);
      const newIndex = current.findIndex((value) => value.key === over.id);
      return oldIndex >= 0 && newIndex >= 0 ? arrayMove(current, oldIndex, newIndex) : current;
    });
  };

  const addValue = () => {
    if (valores.length >= MAX_VALUES) return;
    setValores((current) => [
      ...current,
      { key: createDraftKey(), titulo: "", descripcionHtml: "<p></p>" },
    ]);
  };

  const removeValue = (key: string) => {
    if (valores.length <= 1) return;
    setValores((current) => current.filter((value) => value.key !== key));
  };

  const validate = (): string | null => {
    if (!richTextHasContent(misionHtml)) return "La misión no puede estar vacía.";
    if (!richTextHasContent(visionHtml)) return "La visión no puede estar vacía.";
    if (valores.length === 0) return "Debe existir al menos un valor corporativo.";
    if (valores.length > MAX_VALUES) return `Se permiten máximo ${MAX_VALUES} valores corporativos.`;
    for (const value of valores) {
      if (!value.titulo.trim()) return "Todos los valores requieren un título.";
      if (value.titulo.trim().length > 120) return "Los títulos admiten máximo 120 caracteres.";
      if (!richTextHasContent(value.descripcionHtml)) {
        return `El valor ${value.titulo.trim() || "sin título"} requiere una descripción.`;
      }
    }
    if (!motivoCambio.trim()) return "Debe indicar el motivo del cambio.";
    if (motivoCambio.trim().length > 1000) return "El motivo admite máximo 1.000 caracteres.";
    return null;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await createMisionVisionVersion({
        versionBase,
        misionHtml,
        visionHtml,
        valores: valores.map((value) => ({
          titulo: value.titulo.trim(),
          descripcionHtml: value.descripcionHtml,
        })),
        motivoCambio: motivoCambio.trim(),
      });
      onSaved(created);
      toast({ title: "Nueva versión publicada", status: "success", duration: 3500, isClosable: true });
      onClose();
    } catch (cause) {
      if (axios.isAxiosError(cause) && cause.response?.status === 409) {
        setConflict(true);
        setError("Otra persona publicó una versión mientras editabas. Tu borrador se conserva.");
      } else if (axios.isAxiosError(cause) && cause.response?.status === 403) {
        await onForbidden();
        onClose();
      } else {
        setError(apiErrorMessage(cause, "No fue posible guardar la nueva versión."));
      }
    } finally {
      setSaving(false);
    }
  };

  const reloadCurrent = async () => {
    setReloading(true);
    setError(null);
    try {
      const current = await onReloadCurrent();
      const draft = draftFromVersion(current);
      setVersionBase(current.version);
      setMisionHtml(draft.misionHtml);
      setVisionHtml(draft.visionHtml);
      setValores(draft.valores);
      setMotivoCambio("");
      setConflict(false);
    } catch (cause) {
      setError(apiErrorMessage(cause, "No fue posible recargar la versión vigente."));
    } finally {
      setReloading(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} size='xl' scrollBehavior="inside" closeOnInteractOutside={!saving} onOpenChange={e => {
      if (!e.open) {
        onClose();
      }
    }}>
      <Portal>

        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>Editar identidad corporativa · versión base {versionBase}</Dialog.Header>
            <Dialog.CloseTrigger disabled={saving} />
            <Dialog.Body>
              <VStack gap={7} align="stretch">
                {error && (
                  <Alert.Root status={conflict ? "warning" : "error"} borderRadius="md">
                    <Alert.Indicator />
                    <Box flex="1">
                      <Alert.Title>{conflict ? "Conflicto de edición" : "Revisa la información"}</Alert.Title>
                      <Alert.Description>{error}</Alert.Description>
                    </Box>
                    {conflict && (
                      <Button ml={4} size="sm" onClick={reloadCurrent} loading={reloading}>
                        Recargar vigente
                      </Button>
                    )}
                  </Alert.Root>
                )}

                <Field.Root required>
                  <Field.Label>Misión</Field.Label>
                  <RichTextEditor value={misionHtml} onChange={setMisionHtml} ariaLabel="Contenido de la misión" />
                </Field.Root>

                <Field.Root required>
                  <Field.Label>Visión</Field.Label>
                  <RichTextEditor value={visionHtml} onChange={setVisionHtml} ariaLabel="Contenido de la visión" />
                </Field.Root>

                <Box>
                  <Flex align="center" justify="space-between" mb={3} gap={4}>
                    <Box>
                      <Text fontWeight="semibold">Valores corporativos</Text>
                      <Text fontSize="sm" color="app.textMuted">Arrastra las tarjetas o usa las flechas para cambiar el orden.</Text>
                    </Box>
                    <Button size="sm" onClick={addValue} disabled={valores.length >= MAX_VALUES}><LuPlus />Agregar valor
                                      </Button>
                  </Flex>

                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={valores.map((value) => value.key)} strategy={verticalListSortingStrategy}>
                      <VStack gap={4} align="stretch">
                        {valores.map((value, index) => (
                          <SortableValue
                            key={value.key}
                            value={value}
                            index={index}
                            total={valores.length}
                            onUpdate={(patch) => updateValue(value.key, patch)}
                            onRemove={() => removeValue(value.key)}
                            onMove={moveValue}
                          />
                        ))}
                      </VStack>
                    </SortableContext>
                  </DndContext>
                </Box>

                <Field.Root required>
                  <Field.Label>Motivo del cambio</Field.Label>
                  <Textarea
                    value={motivoCambio}
                    onValueChange={(event) => setMotivoCambio(event.target.value)}
                    maxLength={1000}
                    rows={3}
                    placeholder="Describe brevemente por qué se publica esta versión"
                  />
                  <Text textAlign="right" fontSize="xs" color="app.textMuted">{motivoCambio.length}/1000</Text>
                </Field.Root>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer gap={3}>
              <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
              <Button colorPalette="blue" onClick={handleSave} loading={saving} disabled={conflict}>
                Publicar nueva versión
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>

      </Portal>
    </Dialog.Root>
  );
}

interface SortableValueProps {
  value: DraftValue;
  index: number;
  total: number;
  onUpdate: (patch: Partial<Omit<DraftValue, "key">>) => void;
  onRemove: () => void;
  onMove: (index: number, direction: -1 | 1) => void;
}

function SortableValue({ value, index, total, onUpdate, onRemove, onMove }: SortableValueProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: value.key });

  return (
    <Box
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      borderWidth="1px"
      borderRadius="lg"
      p={4}
      bg="app.surface"
      boxShadow={isDragging ? "lg" : "sm"}
      opacity={isDragging ? 0.85 : 1}
    >
      <Flex align="center" gap={2} mb={4}>
        <Tooltip content="Arrastrar para reordenar">
          <IconButton
            aria-label={`Reordenar valor ${index + 1}`}
            size="sm"
            variant="ghost"
            cursor="grab"
            {...attributes}
            {...listeners}><LuGripVertical /></IconButton>
        </Tooltip>
        <Field.Root required flex="1">
          <Field.Label fontSize="sm" mb={1}>Título del valor {index + 1}</Field.Label>
          <Input
            value={value.titulo}
            onValueChange={(event) => onUpdate({ titulo: event.target.value })}
            maxLength={120}
          />
        </Field.Root>
        <Tooltip content="Subir">
          <IconButton
            aria-label={`Subir valor ${index + 1}`}
            size="sm"
            onClick={() => onMove(index, -1)}
            disabled={index === 0}><LuArrowUp /></IconButton>
        </Tooltip>
        <Tooltip content="Bajar">
          <IconButton
            aria-label={`Bajar valor ${index + 1}`}
            size="sm"
            onClick={() => onMove(index, 1)}
            disabled={index === total - 1}><LuArrowDown /></IconButton>
        </Tooltip>
        <Tooltip content="Eliminar">
          <IconButton
            aria-label={`Eliminar valor ${index + 1}`}
            size="sm"
            colorPalette="red"
            variant="ghost"
            onClick={onRemove}
            disabled={total <= 1}><LuTrash2 /></IconButton>
        </Tooltip>
      </Flex>
      <Field.Root required>
        <Field.Label fontSize="sm">Descripción</Field.Label>
        <RichTextEditor
          value={value.descripcionHtml}
          onChange={(descripcionHtml) => onUpdate({ descripcionHtml })}
          ariaLabel={`Descripción del valor ${value.titulo || index + 1}`}
        />
      </Field.Root>
    </Box>
  );
}

function apiErrorMessage(cause: unknown, fallback: string): string {
  if (!axios.isAxiosError(cause)) return fallback;
  const data = cause.response?.data as { detail?: string; message?: string; error?: string } | undefined;
  return data?.detail || data?.message || data?.error || fallback;
}
