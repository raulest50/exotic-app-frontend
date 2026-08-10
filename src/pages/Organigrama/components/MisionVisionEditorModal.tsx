import { useEffect, useState } from "react";
import axios from "axios";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Textarea,
  Tooltip,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { AddIcon, ArrowDownIcon, ArrowUpIcon, DeleteIcon, DragHandleIcon } from "@chakra-ui/icons";
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
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside" closeOnOverlayClick={!saving}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Editar identidad corporativa · versión base {versionBase}</ModalHeader>
        <ModalCloseButton isDisabled={saving} />
        <ModalBody>
          <VStack spacing={7} align="stretch">
            {error && (
              <Alert status={conflict ? "warning" : "error"} borderRadius="md">
                <AlertIcon />
                <Box flex="1">
                  <AlertTitle>{conflict ? "Conflicto de edición" : "Revisa la información"}</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Box>
                {conflict && (
                  <Button ml={4} size="sm" onClick={reloadCurrent} isLoading={reloading}>
                    Recargar vigente
                  </Button>
                )}
              </Alert>
            )}

            <FormControl isRequired>
              <FormLabel>Misión</FormLabel>
              <RichTextEditor value={misionHtml} onChange={setMisionHtml} ariaLabel="Contenido de la misión" />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Visión</FormLabel>
              <RichTextEditor value={visionHtml} onChange={setVisionHtml} ariaLabel="Contenido de la visión" />
            </FormControl>

            <Box>
              <Flex align="center" justify="space-between" mb={3} gap={4}>
                <Box>
                  <Text fontWeight="semibold">Valores corporativos</Text>
                  <Text fontSize="sm" color="app.textMuted">Arrastra las tarjetas o usa las flechas para cambiar el orden.</Text>
                </Box>
                <Button
                  leftIcon={<AddIcon />}
                  size="sm"
                  onClick={addValue}
                  isDisabled={valores.length >= MAX_VALUES}
                >
                  Agregar valor
                </Button>
              </Flex>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={valores.map((value) => value.key)} strategy={verticalListSortingStrategy}>
                  <VStack spacing={4} align="stretch">
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

            <FormControl isRequired>
              <FormLabel>Motivo del cambio</FormLabel>
              <Textarea
                value={motivoCambio}
                onChange={(event) => setMotivoCambio(event.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Describe brevemente por qué se publica esta versión"
              />
              <Text textAlign="right" fontSize="xs" color="app.textMuted">{motivoCambio.length}/1000</Text>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter gap={3}>
          <Button variant="ghost" onClick={onClose} isDisabled={saving}>Cancelar</Button>
          <Button colorScheme="blue" onClick={handleSave} isLoading={saving} isDisabled={conflict}>
            Publicar nueva versión
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
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
        <Tooltip label="Arrastrar para reordenar">
          <IconButton
            aria-label={`Reordenar valor ${index + 1}`}
            icon={<DragHandleIcon />}
            size="sm"
            variant="ghost"
            cursor="grab"
            {...attributes}
            {...listeners}
          />
        </Tooltip>
        <FormControl isRequired flex="1">
          <FormLabel fontSize="sm" mb={1}>Título del valor {index + 1}</FormLabel>
          <Input
            value={value.titulo}
            onChange={(event) => onUpdate({ titulo: event.target.value })}
            maxLength={120}
          />
        </FormControl>
        <Tooltip label="Subir">
          <IconButton
            aria-label={`Subir valor ${index + 1}`}
            icon={<ArrowUpIcon />}
            size="sm"
            onClick={() => onMove(index, -1)}
            isDisabled={index === 0}
          />
        </Tooltip>
        <Tooltip label="Bajar">
          <IconButton
            aria-label={`Bajar valor ${index + 1}`}
            icon={<ArrowDownIcon />}
            size="sm"
            onClick={() => onMove(index, 1)}
            isDisabled={index === total - 1}
          />
        </Tooltip>
        <Tooltip label="Eliminar">
          <IconButton
            aria-label={`Eliminar valor ${index + 1}`}
            icon={<DeleteIcon />}
            size="sm"
            colorScheme="red"
            variant="ghost"
            onClick={onRemove}
            isDisabled={total <= 1}
          />
        </Tooltip>
      </Flex>
      <FormControl isRequired>
        <FormLabel fontSize="sm">Descripción</FormLabel>
        <RichTextEditor
          value={value.descripcionHtml}
          onChange={(descripcionHtml) => onUpdate({ descripcionHtml })}
          ariaLabel={`Descripción del valor ${value.titulo || index + 1}`}
        />
      </FormControl>
    </Box>
  );
}

function apiErrorMessage(cause: unknown, fallback: string): string {
  if (!axios.isAxiosError(cause)) return fallback;
  const data = cause.response?.data as { detail?: string; message?: string; error?: string } | undefined;
  return data?.detail || data?.message || data?.error || fallback;
}
