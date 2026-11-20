import { type ReactNode, type PointerEvent, type KeyboardEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { CloseButton, Alert, Avatar, Badge, Box, Button, Flex, Heading, HStack, Icon, IconButton, Input, InputGroup, Switch, Tabs, SimpleGrid, Text, Textarea, VStack, Field, Dialog, Portal } from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import { FiEdit, FiLayers, FiMaximize2, FiSave } from 'react-icons/fi';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import UserGenericPicker from '../../../components/Pickers/UserPickerGeneric/UserPickerGeneric.tsx';
import { fetchUserAssignmentStatus } from '../../../api/userAssignmentStatus.ts';
import { User } from '../../Usuarios/GestionUsuarios/types';
import CategoriaHabilitadaPickerModal from '../components/CategoriaHabilitadaPickerModal.tsx';
import AreaOperativaUnidadMedidaConfig from './AreaOperativaUnidadMedidaConfig.tsx';
import AreaOperativaSemiterminadosManufacturadosTab from './AreaOperativaSemiterminadosManufacturadosTab';
import AreaOperativaRecursosProduccionTab from './AreaOperativaRecursosProduccionTab';
import {
    AreaOperativa,
    AreaOperativaMutationDTO,
    CategoriaHabilitada,
    UnidadMedidaAreaOperativa,
    isAlmacenGeneralArea,
} from './types';
import { LuSearch } from 'react-icons/lu';
import AreaMpsSettings from '../components/AreaMpsSettings';
import type { AlcanceEjecucion, AlcanceMps, VisibilidadMps } from '../../../api/mpsAreaConfig';
import DespejeAreaConfig from '../../../features/despeje/DespejeAreaConfig';
import { useAuth } from '../../../context/AuthContext';

const endpoints = new EndPointsURL();

interface DialogSize {
    width: number;
    height: number;
}

function readDialogSize(key: string | null): DialogSize | null {
    if (!key) return null;
    try {
        const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? 'null');
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
        const { width, height } = value as Partial<DialogSize>;
        if (typeof width !== 'number' || typeof height !== 'number'
            || !Number.isFinite(width) || !Number.isFinite(height)
            || width <= 0 || height <= 0 || width > 10000 || height > 10000) return null;
        return { width: Math.round(width), height: Math.round(height) };
    } catch {
        return null;
    }
}

function constrainDialogSize(size: DialogSize): DialogSize {
    const maxWidth = Math.max(1, window.innerWidth - 24);
    const maxHeight = Math.max(1, window.innerHeight - 48);
    return {
        width: Math.round(Math.min(maxWidth, Math.max(Math.min(640, maxWidth), size.width))),
        height: Math.round(Math.min(maxHeight, Math.max(Math.min(440, maxHeight), size.height))),
    };
}

interface DetalleAreaOperativaDialogProps {
    isOpen: boolean;
    onClose: () => void;
    area: AreaOperativa | null;
    onAreaUpdated: (updatedArea: AreaOperativa) => void;
}

function sameCategoriaSelection(current: CategoriaHabilitada[], original: CategoriaHabilitada[]): boolean {
    const normalize = (categorias: CategoriaHabilitada[]) => [...categorias]
        .map((categoria) => ({
            categoriaId: categoria.categoriaId,
            unidadMedidaId: categoria.unidadMedidaId ?? null,
            factorLote: categoria.factorLote ?? null,
        }))
        .sort((a, b) => a.categoriaId - b.categoriaId);

    const currentNormalized = normalize(current);
    const originalNormalized = normalize(original);

    if (currentNormalized.length !== originalNormalized.length) {
        return false;
    }

    return currentNormalized.every((categoria, index) => {
        const originalCategoria = originalNormalized[index];
        return categoria.categoriaId === originalCategoria.categoriaId
            && categoria.unidadMedidaId === originalCategoria.unidadMedidaId
            && categoria.factorLote === originalCategoria.factorLote;
    });
}

function cloneCategorias(categorias: CategoriaHabilitada[]): CategoriaHabilitada[] {
    return categorias.map((categoria) => ({
        ...categoria,
        unidadMedidaId: categoria.unidadMedidaId ?? null,
        factorLote: categoria.factorLote ?? null,
    }));
}

interface DetailValueProps {
    label: string;
    children: ReactNode;
}

function DetailValue({ label, children }: DetailValueProps) {
    return (
        <Box>
            <Text
                color="app.textSubtle"
                fontSize="xs"
                fontWeight="semibold"
                letterSpacing="wide"
                textTransform="uppercase"
                mb={1}
            >
                {label}
            </Text>
            <Box fontSize="sm" fontWeight="medium">
                {children}
            </Box>
        </Box>
    );
}

export default function DetalleAreaOperativaDialog({
    isOpen,
    onClose,
    area,
    onAreaUpdated,
}: DetalleAreaOperativaDialogProps) {
    const toast = useAppToast();
    const { meProfile } = useAuth();
    const sizeStorageKey = meProfile
        ? `exotic:gestion-areas:detalle:size:v1:${meProfile.id}` : null;
    const storedDialogSize = useMemo(() => readDialogSize(sizeStorageKey), [sizeStorageKey]);
    const [dialogSizeState, setDialogSizeState] = useState(() => ({
        key: sizeStorageKey, size: storedDialogSize, saved: true,
    }));
    const dialogSize = dialogSizeState.key === sizeStorageKey ? dialogSizeState.size : storedDialogSize;
    const sizeSaved = dialogSizeState.key !== sizeStorageKey || dialogSizeState.saved;
    const dialogContentRef = useRef<HTMLDivElement>(null);
    const resizeHintId = useId();
    const suppressResizeClick = useRef(false);
    const resizeDrag = useRef<{
        pointerId: number; x: number; y: number; size: DialogSize;
        previous: DialogSize | null; next: DialogSize; moved: boolean;
    } | null>(null);

    const persistDialogSize = (size: DialogSize | null) => {
        let saved = false;
        if (sizeStorageKey) {
            try {
                if (size) window.localStorage.setItem(sizeStorageKey, JSON.stringify(size));
                else window.localStorage.removeItem(sizeStorageKey);
                saved = true;
            } catch {
                // A browser preference must never prevent using or saving the area.
            }
        }
        setDialogSizeState({ key: sizeStorageKey, size, saved });
    };

    const startResize = (event: PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0 || !event.isPrimary || !dialogContentRef.current) return;
        event.preventDefault();
        event.currentTarget.focus({ preventScroll: true });
        const bounds = dialogContentRef.current.getBoundingClientRect();
        const size = { width: bounds.width, height: bounds.height };
        resizeDrag.current = {
            pointerId: event.pointerId, x: event.clientX, y: event.clientY,
            size, previous: dialogSize, next: size, moved: false,
        };
        suppressResizeClick.current = false;
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const moveResize = (event: PointerEvent<HTMLButtonElement>) => {
        const drag = resizeDrag.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        // Both edges move because the dialog remains centered in its positioner.
        const next = constrainDialogSize({
            width: drag.size.width + 2 * (event.clientX - drag.x),
            height: drag.size.height + 2 * (event.clientY - drag.y),
        });
        drag.moved ||= Math.abs(event.clientX - drag.x) + Math.abs(event.clientY - drag.y) > 2;
        drag.next = next;
        if (drag.moved) setDialogSizeState({ key: sizeStorageKey, size: next, saved: true });
    };

    const finishResize = (event: PointerEvent<HTMLButtonElement>, cancel = false) => {
        const drag = resizeDrag.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        resizeDrag.current = null;
        suppressResizeClick.current = drag.moved;
        if (cancel) setDialogSizeState({ key: sizeStorageKey, size: drag.previous, saved: sizeSaved });
        else if (drag.moved) persistDialogSize(drag.next);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    };

    const resizeWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'Home') {
            event.preventDefault();
            persistDialogSize(null);
            return;
        }
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
            || !dialogContentRef.current) return;
        event.preventDefault();
        const bounds = dialogContentRef.current.getBoundingClientRect();
        const step = event.shiftKey ? 80 : 20;
        persistDialogSize(constrainDialogSize({
            width: bounds.width + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0),
            height: bounds.height + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0),
        }));
    };

    const [isEditing, setIsEditing] = useState(false);
    const [editNombre, setEditNombre] = useState('');
    const [editDescripcion, setEditDescripcion] = useState('');
    const [editVisibilidadMps, setEditVisibilidadMps] = useState<VisibilidadMps>('SOLO_OP');
    const [editAlcanceMps, setEditAlcanceMps] = useState<AlcanceMps>('TODOS');
    const [editAlcanceEjecucion, setEditAlcanceEjecucion] = useState<AlcanceEjecucion>('AMBOS');
    const [editRequiereEquipoLoteOf, setEditRequiereEquipoLoteOf] = useState(false);
    const [editRequiereReporteProduccionEtapa, setEditRequiereReporteProduccionEtapa] = useState(false);
    const [editResponsable, setEditResponsable] = useState<User | null>(null);
    const [editCategoriasHabilitadas, setEditCategoriasHabilitadas] = useState<CategoriaHabilitada[]>([]);
    const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);
    const [isCategoriaPickerOpen, setIsCategoriaPickerOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDespejeBusy, setIsDespejeBusy] = useState(false);
    const [isSemiterminadosBusy, setIsSemiterminadosBusy] = useState(false);
    const [isRecursosBusy, setIsRecursosBusy] = useState(false);
    const [semiterminadosDirty, setSemiterminadosDirty] = useState(false);
    const [recursosDirty, setRecursosDirty] = useState(false);
    const [isValidatingResponsable, setIsValidatingResponsable] = useState(false);
    const [responsableError, setResponsableError] = useState<string | null>(null);
    const [areaUnidades, setAreaUnidades] = useState<UnidadMedidaAreaOperativa[]>([]);

    useEffect(() => {
        if (!isOpen) {
            setIsEditing(false);
        }
    }, [isOpen]);

    const loadAreaUnidades = useCallback(async () => {
        if (!area) {
            setAreaUnidades([]);
            return;
        }

        try {
            const url = endpoints.area_operativa_unidades.replace('{areaId}', String(area.areaId));
            const response = await axios.get<UnidadMedidaAreaOperativa[]>(url, { withCredentials: true });
            setAreaUnidades(response.data);
        } catch {
            setAreaUnidades([]);
        }
    }, [area]);

    useEffect(() => {
        if (isOpen && area) {
            void loadAreaUnidades();
        }
    }, [area, isOpen, loadAreaUnidades]);

    const handleUnidadesLoaded = useCallback((unidades: UnidadMedidaAreaOperativa[]) => {
        setAreaUnidades(unidades);
    }, []);

    const unidadById = useMemo(
        () => new Map(areaUnidades.map((unidad) => [unidad.id, unidad])),
        [areaUnidades],
    );

    if (!area) return null;
    const isSpecialSystemArea = isAlmacenGeneralArea(area);
    const unidadesDisponibles = areaUnidades;
    const isAssociationBusy = isSemiterminadosBusy || isRecursosBusy;
    const hasAssociationChanges = semiterminadosDirty || recursosDirty;
    const handleClose = () => {
        if (isSaving || isDespejeBusy || isAssociationBusy) return;
        if (hasAssociationChanges && !window.confirm('Hay asociaciones sin guardar. ¿Cerrar y descartar esos cambios?')) return;
        onClose();
    };

    const enterEditMode = () => {
        if (isSpecialSystemArea) {
            return;
        }

        setEditNombre(area.nombre);
        setEditDescripcion(area.descripcion || '');
        setEditResponsable(
            area.responsableArea
                ? {
                    id: area.responsableArea.id,
                    cedula: area.responsableArea.cedula,
                    username: area.responsableArea.username,
                    nombreCompleto: area.responsableArea.nombreCompleto,
                } as User
                : null,
        );
        setEditCategoriasHabilitadas(cloneCategorias(area.categoriasHabilitadas ?? []));
        setEditVisibilidadMps(area.visibilidadMps ?? 'SOLO_OP');
        setEditAlcanceMps(area.alcanceMps ?? 'TODOS');
        setEditAlcanceEjecucion(area.alcanceEjecucion ?? 'AMBOS');
        setEditRequiereEquipoLoteOf(area.requiereEquipoLoteOf ?? false);
        setEditRequiereReporteProduccionEtapa(area.requiereReporteProduccionEtapa ?? false);
        setResponsableError(null);
        setIsEditing(true);
    };

    const cancelEdit = () => {
        setResponsableError(null);
        setIsEditing(false);
    };

    const hasChanges =
        editVisibilidadMps !== (area.visibilidadMps ?? 'SOLO_OP') ||
        editAlcanceMps !== (area.alcanceMps ?? 'TODOS') ||
        editAlcanceEjecucion !== (area.alcanceEjecucion ?? 'AMBOS') ||
        editRequiereEquipoLoteOf !== (area.requiereEquipoLoteOf ?? false) ||
        editRequiereReporteProduccionEtapa !== (area.requiereReporteProduccionEtapa ?? false) ||
        editNombre !== area.nombre ||
        editDescripcion !== (area.descripcion || '') ||
        editResponsable?.id !== area.responsableArea?.id ||
        !sameCategoriaSelection(editCategoriasHabilitadas, area.categoriasHabilitadas ?? []);

    const isFormValid = editNombre.trim() !== '' && editResponsable !== null;
    const canSave = isFormValid && hasChanges && !isSaving && !isDespejeBusy && !isAssociationBusy && !isValidatingResponsable && !responsableError;

    const handleSelectUser = async (user: User) => {
        setIsValidatingResponsable(true);
        try {
            const status = await fetchUserAssignmentStatus(user.id, area.areaId);
            if (!status.canBeAreaResponsable) {
                const message = status.hasModuloAccesos
                    ? 'El usuario ya tiene accesos a modulos y no puede ser responsable de un area operativa.'
                    : `El usuario ya es responsable del area ${status.areaResponsableNombre ?? ''}.`;
                setResponsableError(message);
                toast({
                    title: 'Usuario no compatible',
                    description: message,
                    status: 'warning',
                    duration: 4000,
                    isClosable: true,
                });
                return;
            }

            setEditResponsable(user);
            setResponsableError(null);
        } catch {
            toast({
                title: 'Error',
                description: 'No se pudo validar la compatibilidad del usuario seleccionado.',
                status: 'error',
                duration: 4000,
                isClosable: true,
            });
        } finally {
            setIsValidatingResponsable(false);
        }
    };

    const handleSave = async () => {
        if (isSpecialSystemArea || !canSave || !editResponsable) {
            return;
        }

        setIsSaving(true);

        const dto: AreaOperativaMutationDTO = {
            nombre: editNombre.trim(),
            descripcion: editDescripcion.trim(),
            visibilidadMps: editVisibilidadMps,
            alcanceMps: editAlcanceMps,
            alcanceEjecucion: editAlcanceEjecucion,
            requiereEquipoLoteOf: editRequiereEquipoLoteOf,
            requiereReporteProduccionEtapa: editRequiereReporteProduccionEtapa,
            responsableId: editResponsable.id,
            categoriaIds: editCategoriasHabilitadas.map((categoria) => categoria.categoriaId),
            categoriasHabilitadas: editCategoriasHabilitadas.map((categoria) => ({
                categoriaId: categoria.categoriaId,
                unidadMedidaId: categoria.unidadMedidaId ?? null,
                factorLote: categoria.unidadMedidaId ? categoria.factorLote ?? 1 : null,
            })),
        };

        try {
            const url = endpoints.update_area_operativa.replace('{areaId}', String(area.areaId));
            const response = await axios.put<AreaOperativa>(url, dto, { withCredentials: true });

            toast({
                title: 'Área actualizada',
                description: `El área "${dto.nombre}" ha sido actualizada exitosamente`,
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            onAreaUpdated(response.data);
            setIsEditing(false);
        } catch (error) {
            const errorMessage = axios.isAxiosError(error)
                ? error.response?.data?.message || 'Error en la solicitud'
                : 'Error desconocido';
            toast({
                title: 'Error al actualizar área',
                description: errorMessage,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const categoriasLectura = area.categoriasHabilitadas ?? [];
    const categoriasEdicion = editCategoriasHabilitadas;

    const renderCategoriasConUnidades = (categorias: CategoriaHabilitada[]) => {
        if (categorias.length === 0) {
            return (
                <Flex
                    minH="220px"
                    borderWidth="1px"
                    borderStyle="dashed"
                    borderColor="app.border"
                    borderRadius="xl"
                    bg="app.surface"
                    align="center"
                    justify="center"
                    direction="column"
                    textAlign="center"
                    px={6}
                    py={10}
                >
                    <Flex
                        w={12}
                        h={12}
                        align="center"
                        justify="center"
                        borderRadius="full"
                        bg="app.surfaceMuted"
                        color="app.textMuted"
                        mb={3}
                    >
                        <Icon boxSize={6} asChild><FiLayers /></Icon>
                    </Flex>
                    <Text fontWeight="semibold">Sin categorías configuradas</Text>
                    <Text color="app.textSubtle" fontSize="sm" maxW="360px" mt={1}>
                        Esta área todavía no tiene categorías de producción habilitadas.
                    </Text>
                </Flex>
            );
        }

        return (
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                {categorias.map((categoria) => {
                    const unidadCategoria = categoria.unidadMedidaId ? unidadById.get(categoria.unidadMedidaId) : null;

                    return (
                        <Box
                            key={categoria.categoriaId}
                            borderWidth="1px"
                            borderColor="app.border"
                            borderRadius="xl"
                            bg="app.surface"
                            p={4}
                        >
                            <HStack justify="space-between" align="flex-start" gap={3}>
                                <Box minW={0}>
                                    <Text fontWeight="semibold" lineClamp={2}>
                                        {categoria.categoriaNombre}
                                    </Text>
                                    <Text color="app.textSubtle" fontSize="xs" mt={1}>
                                        Categoría #{categoria.categoriaId}
                                    </Text>
                                </Box>
                                <Badge colorPalette={unidadCategoria ? 'blue' : 'gray'} flexShrink={0}>
                                    {unidadCategoria ? 'Configurada' : 'Sin unidad'}
                                </Badge>
                            </HStack>

                            <Box borderTopWidth="1px" borderColor="app.border" mt={4} pt={3}>
                                {unidadCategoria ? (
                                    <SimpleGrid columns={2} gap={3}>
                                        <DetailValue label="Unidad">
                                            <Text>{unidadCategoria.nombre}</Text>
                                        </DetailValue>
                                        <DetailValue label="Factor de lote">
                                            <Text>{categoria.factorLote ?? '—'}</Text>
                                        </DetailValue>
                                    </SimpleGrid>
                                ) : (
                                    <Text color="app.textSubtle" fontSize="sm">
                                        Sin unidad de medida asociada.
                                    </Text>
                                )}
                            </Box>
                        </Box>
                    );
                })}
            </SimpleGrid>
        );
    };

    const categoriasVisibles = isEditing ? categoriasEdicion : categoriasLectura;
    const responsableVisible = isEditing
        ? editResponsable
        : area.responsableArea
            ? {
                id: area.responsableArea.id,
                cedula: area.responsableArea.cedula,
                username: area.responsableArea.username,
                nombreCompleto: area.responsableArea.nombreCompleto,
            } as User
            : null;

    return (
        <Dialog.Root
            open={isOpen}
            size='xl'
            placement='center'
            closeOnInteractOutside={!isEditing && !hasAssociationChanges && !isAssociationBusy}
            scrollBehavior="inside"
            onOpenChange={e => {
                if (!e.open) handleClose();
            }}
        >
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content ref={dialogContentRef}
                        maxW="calc(100vw - 24px)"
                        w={{ base: 'calc(100% - 24px)', md: dialogSize ? `${dialogSize.width}px` : 'min(64rem, calc(100vw - 24px))' }}
                        minW={{ md: 'min(640px, calc(100vw - 24px))' }}
                        h={{ base: 'calc(100dvh - 24px)', md: dialogSize ? `${dialogSize.height}px` : 'min(780px, calc(100dvh - 48px))' }}
                        minH={{ md: 'min(440px, calc(100dvh - 48px))' }}
                        maxH={{ base: 'calc(100dvh - 24px)', md: 'calc(100dvh - 48px)' }}
                        my={3}
                        mx={3}
                        overflow="hidden"
                        borderRadius={{ base: 'xl', md: '2xl' }}
                        bg="app.surface">
                        <Dialog.Header px={{ base: 4, md: 6 }} py={4} flexDirection="column" gap={0} flexShrink={0} borderBottomWidth="1px" borderColor="app.border">
                            <Flex align="flex-start" justify="space-between" gap={4} pr={10}>
                                <Box minW={0}>
                                    <Text
                                        color="app.textSubtle"
                                        fontSize="xs"
                                        fontWeight="semibold"
                                        letterSpacing="wide"
                                        textTransform="uppercase"
                                        mb={1}
                                    >
                                        Área operativa #{area.areaId}
                                    </Text>
                                    <Dialog.Title
                                        fontFamily="Comfortaa Variable"
                                        lineClamp={1}
                                    >
                                        {area.nombre}
                                    </Dialog.Title>
                                </Box>
                                <HStack gap={2} flexWrap="wrap" justify="flex-end">
                                    <Button size="xs" variant="ghost" display={{ base: 'none', md: 'inline-flex' }}
                                        onClick={() => persistDialogSize(null)}>
                                        Restablecer tamaño
                                    </Button>
                                    {isEditing && <Badge colorPalette="teal">Editando</Badge>}
                                    {isSpecialSystemArea && <Badge colorPalette="blue">Área del sistema</Badge>}
                                </HStack>
                            </Flex>
                            <Text id={resizeHintId} mt={2} fontSize="xs" color="app.textSubtle"
                                display={{ base: 'none', md: 'block' }} role={sizeSaved ? undefined : 'status'}>
                                Arrastra la esquina inferior derecha o usa sus flechas; Mayús aumenta el paso. Clic amplía; Inicio restablece.
                                {sizeSaved && sizeStorageKey ? ' El tamaño se recuerda para tu usuario en este navegador.'
                                    : ' El tamaño se conserva en esta vista; no se pudo guardar en el navegador.'}
                            </Text>
                        </Dialog.Header>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton aria-label="Cerrar" size="sm" disabled={isSaving || isDespejeBusy || isAssociationBusy} top={4} right={4} />
                        </Dialog.CloseTrigger>
                        <Dialog.Body p={0} overflow="hidden" display="flex" flexDirection="column" minH={0}>
                            {isSpecialSystemArea && (
                                <Alert.Root
                                    status="info"
                                    variant='subtle'
                                    flexShrink={0}
                                    px={{ base: 4, md: 6 }}
                                    py={3}
                                    borderRadius={0}
                                    borderStartWidth='3px'
                                    borderStartColor='colorPalette.solid'>
                                    <Alert.Indicator />
                                    <Text fontSize="sm">
                                        Almacen General es un area especial del sistema y solo puede consultarse desde este modulo.
                                    </Text>
                                </Alert.Root>
                            )}

                            <Tabs.Root
                                defaultValue="informacion"
                                variant='line'
                                colorPalette="teal"
                                lazyMount
                                display="flex"
                                flexDirection="column"
                                flex="1"
                                minH={0}
                            >
                                <Tabs.List px={{ base: 2, md: 6 }} flexShrink={0} bg="app.surface" overflowX="auto">
                                    <Tabs.Trigger value="informacion" flex="1" whiteSpace="nowrap" py={3}>Información</Tabs.Trigger>
                                    <Tabs.Trigger value="categorias" flex="1" whiteSpace="nowrap" py={3}>Categorías</Tabs.Trigger>
                                    <Tabs.Trigger value="unidades" flex="1" whiteSpace="nowrap" py={3}>Unidades</Tabs.Trigger>
                                    <Tabs.Trigger value="despeje" flex="1" whiteSpace="nowrap" py={3}>Despeje</Tabs.Trigger>
                                    <Tabs.Trigger value="semiterminados" flex="1" whiteSpace="nowrap" py={3}>Semiterminados</Tabs.Trigger>
                                    <Tabs.Trigger value="recursos" flex="1" whiteSpace="nowrap" py={3}>Recursos</Tabs.Trigger>
                                </Tabs.List>
                                <Box flex="1" minH={0} overflowY="auto" bg="app.surfaceSubtle">
                                        <Tabs.Content value="informacion" px={{ base: 4, md: 6 }} py={5} minH="100%">
                                            <VStack align="stretch" gap={4}>
                                                <Box>
                                                    <Heading as="h3" size="sm">Información del área</Heading>
                                                    <Text color="app.textSubtle" fontSize="sm" mt={1}>
                                                        Consulte los datos generales y la persona responsable de esta área.
                                                    </Text>
                                                </Box>

                                                <Box borderWidth="1px" borderColor="app.border" borderRadius="xl" bg="app.surface" p={4}>
                                                    <AreaMpsSettings
                                                        visibilidad={isEditing ? editVisibilidadMps : area.visibilidadMps ?? 'SOLO_OP'}
                                                        alcance={isEditing ? editAlcanceMps : area.alcanceMps ?? 'TODOS'}
                                                        alcanceEjecucion={isSpecialSystemArea ? 'AMBOS' : isEditing ? editAlcanceEjecucion : area.alcanceEjecucion ?? 'AMBOS'}
                                                        requiereEquipoLoteOf={!isSpecialSystemArea && (isEditing ? editRequiereEquipoLoteOf : area.requiereEquipoLoteOf ?? false)}
                                                        onRequiereEquipoLoteOfChange={setEditRequiereEquipoLoteOf}
                                                        readOnly={!isEditing || isSpecialSystemArea} disabled={isSaving}
                                                        onVisibilidadChange={setEditVisibilidadMps} onAlcanceChange={setEditAlcanceMps}
                                                        onAlcanceEjecucionChange={setEditAlcanceEjecucion} />
                                                </Box>
                                                <SimpleGrid columns={{ base: 1, md: 2 }} gap={5} alignItems="stretch">
                                                    <Box
                                                        borderWidth="1px"
                                                        borderColor="app.border"
                                                        borderRadius="xl"
                                                        bg="app.surface"
                                                        p={{ base: 4, md: 5 }}
                                                        minH={{ md: '310px' }}
                                                    >
                                                        <HStack justify="space-between" mb={5}>
                                                            <Heading as="h4" size="sm">Datos básicos</Heading>
                                                            <Badge colorPalette="gray">ID {area.areaId}</Badge>
                                                        </HStack>
                                                        {isEditing ? (
                                                            <VStack gap={4} align="stretch">
                                                                <Field.Root required>
                                                                    <Field.Label>Nombre</Field.Label>
                                                                    <Input
                                                                        value={editNombre}
                                                                        onChange={(event) => setEditNombre(event.target.value)}
                                                                        placeholder="Nombre del área"
                                                                    />
                                                                </Field.Root>

                                                                <Field.Root>
                                                                    <Field.Label>Descripción</Field.Label>
                                                                    <Textarea
                                                                        value={editDescripcion}
                                                                        onChange={(event) => setEditDescripcion(event.target.value)}
                                                                        placeholder="Descripción del área"
                                                                        resize="vertical"
                                                                        minH="120px"
                                                                    />
                                                                </Field.Root>
                                                            </VStack>
                                                        ) : (
                                                            <VStack align="stretch" gap={5}>
                                                                <DetailValue label="Nombre">
                                                                    <Text>{area.nombre}</Text>
                                                                </DetailValue>
                                                                <DetailValue label="Descripción">
                                                                    <Text
                                                                        color={area.descripcion ? undefined : 'app.textSubtle'}
                                                                        whiteSpace="pre-wrap"
                                                                    >
                                                                        {area.descripcion || 'Sin descripción registrada.'}
                                                                    </Text>
                                                                </DetailValue>
                                                            </VStack>
                                                        )}
                                                    </Box>

                                                    <Box
                                                        borderWidth="1px"
                                                        borderColor="app.border"
                                                        borderRadius="xl"
                                                        bg="app.surface"
                                                        p={{ base: 4, md: 5 }}
                                                        minH={{ md: '310px' }}
                                                    >
                                                        <Heading as="h4" size="sm" mb={5}>Responsable del área</Heading>

                                                        {responsableVisible ? (
                                                            <Box
                                                                borderWidth="1px"
                                                                borderColor="app.border"
                                                                borderRadius="lg"
                                                                bg="app.surfaceSubtle"
                                                                p={4}
                                                                mb={isEditing ? 5 : 0}
                                                            >
                                                                <HStack align="flex-start" gap={3}>
                                                                    <Avatar.Root size="md" bg="app.rowSelectedTeal"><Avatar.Fallback name={responsableVisible.nombreCompleto || responsableVisible.username} /></Avatar.Root>
                                                                    <Box minW={0}>
                                                                        <Text fontWeight="semibold" lineClamp={2}>
                                                                            {responsableVisible.nombreCompleto || responsableVisible.username}
                                                                        </Text>
                                                                        <Text color="app.textMuted" fontSize="sm">
                                                                            Cédula {responsableVisible.cedula}
                                                                        </Text>
                                                                        <Text color="app.textSubtle" fontSize="sm" lineClamp={1}>
                                                                            {responsableVisible.username}
                                                                        </Text>
                                                                    </Box>
                                                                </HStack>
                                                            </Box>
                                                        ) : (
                                                            <Flex
                                                                borderWidth="1px"
                                                                borderStyle="dashed"
                                                                borderColor="app.border"
                                                                borderRadius="lg"
                                                                bg="app.surfaceSubtle"
                                                                align="center"
                                                                justify="center"
                                                                minH="120px"
                                                                mb={isEditing ? 5 : 0}
                                                            >
                                                                <Text color="app.textSubtle" fontSize="sm">
                                                                    Sin responsable asignado
                                                                </Text>
                                                            </Flex>
                                                        )}

                                                        {isEditing && (
                                                            <Field.Root required invalid={Boolean(responsableError)}>
                                                                <Field.Label>Seleccionar responsable</Field.Label>
                                                                <InputGroup
                                                                    endElement={(
                                                                        <IconButton
                                                                            aria-label="Buscar usuario"
                                                                            size="sm"
                                                                            onClick={() => setIsUserPickerOpen(true)}
                                                                            disabled={isSaving || isValidatingResponsable}
                                                                        ><LuSearch /></IconButton>
                                                                    )}
                                                                >
                                                                    <Input
                                                                        value={editResponsable ? `${editResponsable.cedula} - ${editResponsable.nombreCompleto || editResponsable.username}` : ''}
                                                                        placeholder="Seleccione un responsable"
                                                                        readOnly
                                                                        bg="app.inputReadonly"
                                                                        pr={12}
                                                                    />
                                                                </InputGroup>
                                                                {responsableError && <Field.ErrorText>{responsableError}</Field.ErrorText>}
                                                            </Field.Root>
                                                        )}
                                                    </Box>
                                                </SimpleGrid>
                                            </VStack>
                                        </Tabs.Content>

                                        <Tabs.Content value="categorias" px={{ base: 4, md: 6 }} py={5} minH="100%">
                                            <VStack align="stretch" gap={4}>
                                                <Flex
                                                    direction={{ base: 'column', sm: 'row' }}
                                                    justify="space-between"
                                                    align={{ base: 'stretch', sm: 'center' }}
                                                    gap={3}
                                                >
                                                    <Box>
                                                        <HStack>
                                                            <Heading as="h3" size="sm">Categorías habilitadas</Heading>
                                                            <Badge colorPalette="teal">{categoriasVisibles.length}</Badge>
                                                        </HStack>
                                                        <Text color="app.textSubtle" fontSize="sm" mt={1}>
                                                            Categorías, unidades y factores de lote disponibles para el área.
                                                        </Text>
                                                    </Box>
                                                    {isEditing && (
                                                        <Button
                                                            alignSelf={{ base: 'stretch', sm: 'center' }}
                                                            variant="outline"
                                                            colorPalette="teal"
                                                            onClick={() => setIsCategoriaPickerOpen(true)}
                                                            disabled={isSaving || isValidatingResponsable}
                                                        >
                                                            Gestionar categorías
                                                        </Button>
                                                    )}
                                                </Flex>
                                                {renderCategoriasConUnidades(categoriasVisibles)}
                                            </VStack>
                                        </Tabs.Content>

                                        <Tabs.Content value="unidades" px={{ base: 4, md: 6 }} py={5} minH="100%">
                                            <AreaOperativaUnidadMedidaConfig
                                                areaId={area.areaId}
                                                isReadOnly={isSpecialSystemArea}
                                                onUnidadesLoaded={handleUnidadesLoaded}
                                            />
                                        </Tabs.Content>
                                        <Tabs.Content value="despeje" px={{ base: 4, md: 6 }} py={5} minH="100%">
                                            <DespejeAreaConfig key={area.areaId} areaId={area.areaId} isReadOnly={isSpecialSystemArea} onBusyChange={setIsDespejeBusy} />
                                        </Tabs.Content>
                                        <Tabs.Content value="semiterminados" px={{ base: 4, md: 6 }} py={5} minH="100%">
                                            <Box mb={5} p={4} borderWidth="1px" borderColor="app.border" borderRadius="lg">
                                                <Field.Root disabled={isSaving || isDespejeBusy || isAssociationBusy || isSpecialSystemArea}>
                                                    <Field.Label>Reporte de cantidades observadas del área</Field.Label>
                                                    {isEditing && !isSpecialSystemArea ? <Switch.Root checked={editRequiereReporteProduccionEtapa}
                                                        disabled={isSaving || isDespejeBusy || isAssociationBusy}
                                                        onCheckedChange={({ checked }) => setEditRequiereReporteProduccionEtapa(checked)}>
                                                        <Switch.HiddenInput /><Switch.Control><Switch.Thumb /></Switch.Control>
                                                        <Switch.Label>Exigir cantidades observadas por producto al completar la etapa</Switch.Label>
                                                    </Switch.Root> : <Text>{!isSpecialSystemArea && area.requiereReporteProduccionEtapa ? 'Requerido para nuevas órdenes' : 'Desactivado'}</Text>}
                                                    <Field.HelperText>Aplica a nuevas órdenes; las existentes conservan su configuración. Registra la observación en la unidad del producto de referencia, sin implicar fabricación final ni ingreso a inventario. No reemplaza la cantidad final de la orden.</Field.HelperText>
                                                    {isEditing && <Field.HelperText>Este cambio se guarda con «Guardar datos del área».</Field.HelperText>}
                                                </Field.Root>
                                            </Box>
                                            {isOpen && <AreaOperativaSemiterminadosManufacturadosTab key={area.areaId} areaId={area.areaId}
                                                isReadOnly={isSpecialSystemArea}
                                                disabled={isSaving || isDespejeBusy}
                                                onDirtyChange={setSemiterminadosDirty} onBusyChange={setIsSemiterminadosBusy} />}
                                        </Tabs.Content>
                                        <Tabs.Content value="recursos" px={{ base: 4, md: 6 }} py={5} minH="100%">
                                            {isOpen && <AreaOperativaRecursosProduccionTab key={area.areaId} areaId={area.areaId}
                                                isReadOnly={isSpecialSystemArea}
                                                disabled={isSaving || isDespejeBusy}
                                                onDirtyChange={setRecursosDirty} onBusyChange={setIsRecursosBusy} />}
                                        </Tabs.Content>
                                </Box>
                            </Tabs.Root>
                        </Dialog.Body>
                        <Dialog.Footer
                            px={{ base: 4, md: 6 }}
                            pr={{ md: 10 }}
                            py={4}
                            borderTopWidth="1px"
                            borderColor="app.border"
                            bg="app.surface"
                            flexShrink={0}
                        >
                            {isEditing ? (
                                <Flex
                                    w="full"
                                    direction={{ base: 'column', sm: 'row' }}
                                    align={{ base: 'stretch', sm: 'center' }}
                                    justify="space-between"
                                    gap={3}
                                >
                                    <Box minH="24px">
                                        {hasChanges && <Badge colorPalette="orange">Cambios sin guardar</Badge>}
                                    </Box>
                                    <HStack justify="flex-end">
                                        <Button variant="ghost" onClick={cancelEdit} disabled={isSaving || isDespejeBusy || isAssociationBusy}>
                                            Cancelar
                                        </Button>
                                        <Button
                                            colorPalette="teal"
                                            onClick={handleSave}
                                            loading={isSaving || isValidatingResponsable}
                                            loadingText="Guardando"
                                            disabled={!canSave}><FiSave />Guardar datos del área
                                                                            </Button>
                                    </HStack>
                                </Flex>
                            ) : (
                                <HStack w="full" justify="flex-end">
                                    {!isSpecialSystemArea && (
                                        <Button colorPalette="teal" disabled={isDespejeBusy || isAssociationBusy} onClick={enterEditMode}><FiEdit />Editar área
                                                                            </Button>
                                    )}
                                    <Button variant="outline" disabled={isDespejeBusy || isAssociationBusy} onClick={handleClose}>
                                        Cerrar
                                    </Button>
                                </HStack>
                            )}
                        </Dialog.Footer>
                        <IconButton type="button" aria-label="Ampliar o ajustar tamaño del diálogo"
                            aria-describedby={resizeHintId} title="Arrastra para ajustar; flechas para cambiar tamaño; clic para ampliar"
                            position="absolute" bottom={1} right={1} size="xs" variant="ghost"
                            display={{ base: 'none', md: 'inline-flex' }} cursor="nwse-resize" touchAction="none"
                            onPointerDown={startResize} onPointerMove={moveResize}
                            onPointerUp={event => finishResize(event)} onPointerCancel={event => finishResize(event, true)}
                            onLostPointerCapture={event => finishResize(event)} onKeyDown={resizeWithKeyboard}
                            onClick={event => {
                                if (event.detail === 0 || !suppressResizeClick.current) {
                                    persistDialogSize(constrainDialogSize({ width: window.innerWidth, height: window.innerHeight }));
                                }
                                suppressResizeClick.current = false;
                            }}>
                            <FiMaximize2 />
                        </IconButton>
                    </Dialog.Content>
                </Dialog.Positioner>

                {!isSpecialSystemArea && (
                    <>
                        <UserGenericPicker
                            isOpen={isUserPickerOpen}
                            onClose={() => setIsUserPickerOpen(false)}
                            onSelectUser={handleSelectUser}
                        />

                        <CategoriaHabilitadaPickerModal
                            isOpen={isCategoriaPickerOpen}
                            onClose={() => setIsCategoriaPickerOpen(false)}
                            initialSelected={editCategoriasHabilitadas}
                            onConfirm={setEditCategoriasHabilitadas}
                            unidadesDisponibles={unidadesDisponibles}
                            allowUnidadSelection
                        />
                    </>
                )}

            </Portal>
        </Dialog.Root>
    );
}
