import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    AlertIcon,
    Badge,
    Box,
    Button,
    Checkbox,
    Flex,
    FormControl,
    FormLabel,
    HStack,
    Input,
    Select,
    SimpleGrid,
    Spinner,
    Table,
    TableContainer,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    VStack,
    useToast,
} from '@chakra-ui/react';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import {
    CapacidadAreaOperativa,
    CapacidadAreaOperativaRequest,
    PeriodoCapacidadAreaOperativa,
    TipoCapacidadAreaOperativa,
    UnidadMedidaAreaOperativa,
    UnidadMedidaAreaOperativaRequest,
    UnidadRelacionAreaOperativa,
} from './types';

interface AreaOperativaCapacityConfigProps {
    areaId: number;
    isReadOnly?: boolean;
    visibleSections?: readonly AreaOperativaCapacitySection[];
    onUnidadesLoaded?: (unidades: UnidadMedidaAreaOperativa[]) => void;
}

type AreaOperativaCapacitySection = 'unidades' | 'capacidades';

interface CapacidadDraft {
    unidadMedidaId: number | null;
    tipoCapacidad: TipoCapacidadAreaOperativa;
    cantidad: number;
    periodo: PeriodoCapacidadAreaOperativa;
    eficiencia: number;
    vigenteDesde: string;
    vigenteHasta: string;
    descripcion: string;
    activo: boolean;
}

const UNIDADES_RELACION: UnidadRelacionAreaOperativa[] = ['ML', 'L', 'G', 'KG', 'U'];
const TIPOS_CAPACIDAD: TipoCapacidadAreaOperativa[] = ['PRODUCTIVA', 'ALMACENAMIENTO'];
const PERIODOS: PeriodoCapacidadAreaOperativa[] = ['HORA', 'TURNO', 'DIA', 'SEMANA'];
const DEFAULT_SECTIONS: readonly AreaOperativaCapacitySection[] = ['unidades', 'capacidades'];

const CAPACIDAD_LABEL: Record<TipoCapacidadAreaOperativa, string> = {
    PRODUCTIVA: 'Productiva',
    ALMACENAMIENTO: 'Almacenamiento',
};

function buildUnidadDraft(unidad?: UnidadMedidaAreaOperativa): UnidadMedidaAreaOperativaRequest {
    return {
        nombre: unidad?.nombre ?? '',
        relacionEstandar: unidad?.relacionEstandar ?? 1,
        unidadRelacion: unidad?.unidadRelacion ?? 'L',
    };
}

function buildCapacidadDraft(
    capacidad?: CapacidadAreaOperativa,
    unidades: UnidadMedidaAreaOperativa[] = [],
): CapacidadDraft {
    return {
        unidadMedidaId: capacidad?.unidadMedidaId ?? unidades[0]?.id ?? null,
        tipoCapacidad: capacidad?.tipoCapacidad ?? 'PRODUCTIVA',
        cantidad: capacidad?.cantidad ?? 1,
        periodo: capacidad?.periodo ?? 'DIA',
        eficiencia: capacidad?.eficiencia ?? 1,
        vigenteDesde: capacidad?.vigenteDesde ?? '',
        vigenteHasta: capacidad?.vigenteHasta ?? '',
        descripcion: capacidad?.descripcion ?? '',
        activo: capacidad?.activo ?? true,
    };
}

function parseNumber(value: string, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function formatNumber(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 6 }).format(Number(value ?? 0));
}

function formatUnidad(unidad: UnidadMedidaAreaOperativa): string {
    return `${unidad.nombre} (${formatNumber(unidad.relacionEstandar)} ${unidad.unidadRelacion})`;
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.message ?? error.response?.data?.error ?? error.message ?? fallback;
    }
    return error instanceof Error ? error.message : fallback;
}

function normalizeUnidadRequest(draft: UnidadMedidaAreaOperativaRequest): UnidadMedidaAreaOperativaRequest {
    return {
        nombre: draft.nombre.trim(),
        relacionEstandar: draft.relacionEstandar,
        unidadRelacion: draft.unidadRelacion,
    };
}

function normalizeCapacidadRequest(draft: CapacidadDraft): CapacidadAreaOperativaRequest {
    if (draft.unidadMedidaId === null) {
        throw new Error('Debe seleccionar una unidad de medida.');
    }

    return {
        unidadMedidaId: draft.unidadMedidaId,
        tipoCapacidad: draft.tipoCapacidad,
        cantidad: draft.cantidad,
        periodo: draft.periodo,
        eficiencia: draft.eficiencia,
        vigenteDesde: draft.vigenteDesde || null,
        vigenteHasta: draft.vigenteHasta || null,
        descripcion: draft.descripcion.trim() || null,
        activo: draft.activo,
    };
}

export default function AreaOperativaCapacityConfig({
    areaId,
    isReadOnly = false,
    visibleSections = DEFAULT_SECTIONS,
    onUnidadesLoaded,
}: AreaOperativaCapacityConfigProps) {
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const toast = useToast();

    const [unidades, setUnidades] = useState<UnidadMedidaAreaOperativa[]>([]);
    const [capacidades, setCapacidades] = useState<CapacidadAreaOperativa[]>([]);
    const [unidadDrafts, setUnidadDrafts] = useState<Record<number, UnidadMedidaAreaOperativaRequest>>({});
    const [capacidadDrafts, setCapacidadDrafts] = useState<Record<number, CapacidadDraft>>({});
    const [createUnidadDraft, setCreateUnidadDraft] = useState<UnidadMedidaAreaOperativaRequest>(buildUnidadDraft());
    const [createCapacidadDraft, setCreateCapacidadDraft] = useState<CapacidadDraft>(buildCapacidadDraft());
    const [loading, setLoading] = useState(false);
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const showUnidades = visibleSections.includes('unidades');
    const showCapacidades = visibleSections.includes('capacidades');

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const unidadesUrl = endpoints.area_operativa_unidades.replace('{areaId}', String(areaId));
            const capacidadesUrl = endpoints.area_operativa_capacidades.replace('{areaId}', String(areaId));
            const [unidadesResponse, capacidadesResponse] = await Promise.all([
                axios.get<UnidadMedidaAreaOperativa[]>(unidadesUrl, { withCredentials: true }),
                axios.get<CapacidadAreaOperativa[]>(capacidadesUrl, { withCredentials: true }),
            ]);

            const nextUnidades = unidadesResponse.data;
            setUnidades(nextUnidades);
            onUnidadesLoaded?.(nextUnidades);
            setCapacidades(capacidadesResponse.data);
            setUnidadDrafts(Object.fromEntries(nextUnidades.map((unidad) => [unidad.id, buildUnidadDraft(unidad)])));
            setCapacidadDrafts(Object.fromEntries(
                capacidadesResponse.data.map((capacidad) => [capacidad.id, buildCapacidadDraft(capacidad, nextUnidades)]),
            ));
            setCreateCapacidadDraft(buildCapacidadDraft(undefined, nextUnidades));
        } catch (loadError) {
            setError(getErrorMessage(loadError, 'No se pudieron cargar unidades y capacidades.'));
        } finally {
            setLoading(false);
        }
    }, [areaId, endpoints, onUnidadesLoaded]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const setUnidadDraftField = <K extends keyof UnidadMedidaAreaOperativaRequest>(
        unidadId: number,
        key: K,
        value: UnidadMedidaAreaOperativaRequest[K],
    ) => {
        setUnidadDrafts((prev) => ({
            ...prev,
            [unidadId]: {
                ...(prev[unidadId] ?? buildUnidadDraft()),
                [key]: value,
            },
        }));
    };

    const setCapacidadDraftField = <K extends keyof CapacidadDraft>(capacidadId: number, key: K, value: CapacidadDraft[K]) => {
        setCapacidadDrafts((prev) => ({
            ...prev,
            [capacidadId]: {
                ...(prev[capacidadId] ?? buildCapacidadDraft(undefined, unidades)),
                [key]: value,
            },
        }));
    };

    const handleCreateUnidad = async () => {
        const request = normalizeUnidadRequest(createUnidadDraft);
        if (!request.nombre || request.relacionEstandar <= 0) {
            toast({
                title: 'Datos incompletos',
                description: 'Nombre y relacion estandar positiva son obligatorios.',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setSavingKey('create-unidad');
        try {
            const url = endpoints.area_operativa_unidades.replace('{areaId}', String(areaId));
            await axios.post(url, request, { withCredentials: true });
            setCreateUnidadDraft(buildUnidadDraft());
            await loadData();
            toast({ title: 'Unidad creada', status: 'success', duration: 3000, isClosable: true });
        } catch (createError) {
            toast({
                title: 'Error al crear unidad',
                description: getErrorMessage(createError, 'No se pudo crear la unidad.'),
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSavingKey(null);
        }
    };

    const handleSaveUnidad = async (unidad: UnidadMedidaAreaOperativa) => {
        const draft = unidadDrafts[unidad.id] ?? buildUnidadDraft(unidad);
        setSavingKey(`unidad-${unidad.id}`);
        try {
            const url = endpoints.area_operativa_unidad
                .replace('{areaId}', String(areaId))
                .replace('{unidadId}', String(unidad.id));
            await axios.put(url, normalizeUnidadRequest(draft), { withCredentials: true });
            await loadData();
            toast({ title: 'Unidad actualizada', status: 'success', duration: 3000, isClosable: true });
        } catch (saveError) {
            toast({
                title: 'Error al actualizar unidad',
                description: getErrorMessage(saveError, 'No se pudo actualizar la unidad.'),
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSavingKey(null);
        }
    };

    const handleDeleteUnidad = async (unidad: UnidadMedidaAreaOperativa) => {
        if (!window.confirm(`Eliminar la unidad "${unidad.nombre}"?`)) {
            return;
        }
        setSavingKey(`unidad-delete-${unidad.id}`);
        try {
            const url = endpoints.area_operativa_unidad
                .replace('{areaId}', String(areaId))
                .replace('{unidadId}', String(unidad.id));
            await axios.delete(url, { withCredentials: true });
            await loadData();
            toast({ title: 'Unidad eliminada', status: 'success', duration: 3000, isClosable: true });
        } catch (deleteError) {
            toast({
                title: 'Error al eliminar unidad',
                description: getErrorMessage(deleteError, 'No se pudo eliminar la unidad.'),
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSavingKey(null);
        }
    };

    const handleCreateCapacidad = async () => {
        setSavingKey('create-capacidad');
        try {
            const url = endpoints.area_operativa_capacidades.replace('{areaId}', String(areaId));
            await axios.post(url, normalizeCapacidadRequest(createCapacidadDraft), { withCredentials: true });
            await loadData();
            toast({ title: 'Capacidad creada', status: 'success', duration: 3000, isClosable: true });
        } catch (createError) {
            toast({
                title: 'Error al crear capacidad',
                description: getErrorMessage(createError, 'No se pudo crear la capacidad.'),
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSavingKey(null);
        }
    };

    const handleSaveCapacidad = async (capacidad: CapacidadAreaOperativa) => {
        const draft = capacidadDrafts[capacidad.id] ?? buildCapacidadDraft(capacidad, unidades);
        setSavingKey(`capacidad-${capacidad.id}`);
        try {
            const url = endpoints.area_operativa_capacidad
                .replace('{areaId}', String(areaId))
                .replace('{capacidadId}', String(capacidad.id));
            await axios.put(url, normalizeCapacidadRequest(draft), { withCredentials: true });
            await loadData();
            toast({ title: 'Capacidad actualizada', status: 'success', duration: 3000, isClosable: true });
        } catch (saveError) {
            toast({
                title: 'Error al actualizar capacidad',
                description: getErrorMessage(saveError, 'No se pudo actualizar la capacidad.'),
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSavingKey(null);
        }
    };

    const handleDeactivateCapacidad = async (capacidad: CapacidadAreaOperativa) => {
        if (!window.confirm(`Desactivar la capacidad ${CAPACIDAD_LABEL[capacidad.tipoCapacidad]}?`)) {
            return;
        }
        setSavingKey(`capacidad-delete-${capacidad.id}`);
        try {
            const url = endpoints.area_operativa_capacidad
                .replace('{areaId}', String(areaId))
                .replace('{capacidadId}', String(capacidad.id));
            await axios.delete(url, { withCredentials: true });
            await loadData();
            toast({ title: 'Capacidad desactivada', status: 'success', duration: 3000, isClosable: true });
        } catch (deleteError) {
            toast({
                title: 'Error al desactivar capacidad',
                description: getErrorMessage(deleteError, 'No se pudo desactivar la capacidad.'),
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSavingKey(null);
        }
    };

    if (loading) {
        return (
            <Flex justify="center" py={4}>
                <Spinner />
            </Flex>
        );
    }

    return (
        <VStack align="stretch" spacing={4}>
            {error && (
                <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    {error}
                </Alert>
            )}

            {showUnidades && (
                <Box borderWidth="1px" borderRadius="md" p={3}>
                    <Text fontWeight="bold" mb={3}>Unidades del área</Text>
                    {!isReadOnly && (
                        <SimpleGrid columns={[1, 1, 4]} spacing={3} mb={4}>
                            <FormControl>
                                <FormLabel>Nombre</FormLabel>
                                <Input
                                    size="sm"
                                    value={createUnidadDraft.nombre}
                                    onChange={(event) => setCreateUnidadDraft((prev) => ({ ...prev, nombre: event.target.value }))}
                                    placeholder="Marmita"
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Relación estándar</FormLabel>
                                <Input
                                    size="sm"
                                    type="number"
                                    min={0.000001}
                                    step="0.000001"
                                    value={createUnidadDraft.relacionEstandar}
                                    onChange={(event) => setCreateUnidadDraft((prev) => ({
                                        ...prev,
                                        relacionEstandar: parseNumber(event.target.value, 1),
                                    }))}
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Unidad relación</FormLabel>
                                <Select
                                    size="sm"
                                    value={createUnidadDraft.unidadRelacion}
                                    onChange={(event) => setCreateUnidadDraft((prev) => ({
                                        ...prev,
                                        unidadRelacion: event.target.value as UnidadRelacionAreaOperativa,
                                    }))}
                                >
                                    {UNIDADES_RELACION.map((unidadRelacion) => (
                                        <option key={unidadRelacion} value={unidadRelacion}>{unidadRelacion}</option>
                                    ))}
                                </Select>
                            </FormControl>
                            <Flex align="end">
                                <Button
                                    size="sm"
                                    colorScheme="teal"
                                    onClick={handleCreateUnidad}
                                    isLoading={savingKey === 'create-unidad'}
                                >
                                    Crear unidad
                                </Button>
                            </Flex>
                        </SimpleGrid>
                    )}

                    {unidades.length === 0 ? (
                        <Text color="app.textSubtle" fontSize="sm">Sin unidades configuradas.</Text>
                    ) : (
                        <TableContainer>
                            <Table size="sm">
                                <Thead>
                                    <Tr>
                                        <Th>Nombre</Th>
                                        <Th>Relación estándar</Th>
                                        <Th>Unidad relación</Th>
                                        {!isReadOnly && <Th>Acciones</Th>}
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {unidades.map((unidad) => {
                                        const draft = unidadDrafts[unidad.id] ?? buildUnidadDraft(unidad);
                                        return (
                                            <Tr key={unidad.id}>
                                                <Td>
                                                    <Input
                                                        size="sm"
                                                        value={draft.nombre}
                                                        isReadOnly={isReadOnly}
                                                        onChange={(event) => setUnidadDraftField(unidad.id, 'nombre', event.target.value)}
                                                    />
                                                </Td>
                                                <Td>
                                                    <Input
                                                        size="sm"
                                                        type="number"
                                                        min={0.000001}
                                                        step="0.000001"
                                                        value={draft.relacionEstandar}
                                                        isReadOnly={isReadOnly}
                                                        onChange={(event) => setUnidadDraftField(
                                                            unidad.id,
                                                            'relacionEstandar',
                                                            parseNumber(event.target.value, 1),
                                                        )}
                                                    />
                                                </Td>
                                                <Td>
                                                    <Select
                                                        size="sm"
                                                        value={draft.unidadRelacion}
                                                        isDisabled={isReadOnly}
                                                        onChange={(event) => setUnidadDraftField(
                                                            unidad.id,
                                                            'unidadRelacion',
                                                            event.target.value as UnidadRelacionAreaOperativa,
                                                        )}
                                                    >
                                                        {UNIDADES_RELACION.map((unidadRelacion) => (
                                                            <option key={unidadRelacion} value={unidadRelacion}>{unidadRelacion}</option>
                                                        ))}
                                                    </Select>
                                                </Td>
                                                {!isReadOnly && (
                                                    <Td>
                                                        <HStack>
                                                            <Button
                                                                size="sm"
                                                                colorScheme="green"
                                                                onClick={() => handleSaveUnidad(unidad)}
                                                                isLoading={savingKey === `unidad-${unidad.id}`}
                                                            >
                                                                Guardar
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                colorScheme="red"
                                                                onClick={() => handleDeleteUnidad(unidad)}
                                                                isLoading={savingKey === `unidad-delete-${unidad.id}`}
                                                            >
                                                                Eliminar
                                                            </Button>
                                                        </HStack>
                                                    </Td>
                                                )}
                                            </Tr>
                                        );
                                    })}
                                </Tbody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>
            )}

            {showCapacidades && (
                <Box borderWidth="1px" borderRadius="md" p={3}>
                    <Text fontWeight="bold" mb={3}>Capacidades del área</Text>
                    {!isReadOnly && (
                        <SimpleGrid columns={[1, 1, 4]} spacing={3} mb={4}>
                            <FormControl>
                                <FormLabel>Unidad</FormLabel>
                                <Select
                                    size="sm"
                                    value={createCapacidadDraft.unidadMedidaId ?? ''}
                                    onChange={(event) => setCreateCapacidadDraft((prev) => ({
                                        ...prev,
                                        unidadMedidaId: event.target.value ? Number(event.target.value) : null,
                                    }))}
                                >
                                    {unidades.map((unidad) => (
                                        <option key={unidad.id} value={unidad.id}>{formatUnidad(unidad)}</option>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl>
                                <FormLabel>Tipo</FormLabel>
                                <Select
                                    size="sm"
                                    value={createCapacidadDraft.tipoCapacidad}
                                    onChange={(event) => setCreateCapacidadDraft((prev) => ({
                                        ...prev,
                                        tipoCapacidad: event.target.value as TipoCapacidadAreaOperativa,
                                    }))}
                                >
                                    {TIPOS_CAPACIDAD.map((tipo) => (
                                        <option key={tipo} value={tipo}>{CAPACIDAD_LABEL[tipo]}</option>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl>
                                <FormLabel>Cantidad</FormLabel>
                                <Input
                                    size="sm"
                                    type="number"
                                    min={0.000001}
                                    step="0.000001"
                                    value={createCapacidadDraft.cantidad}
                                    onChange={(event) => setCreateCapacidadDraft((prev) => ({
                                        ...prev,
                                        cantidad: parseNumber(event.target.value, 1),
                                    }))}
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Periodo</FormLabel>
                                <Select
                                    size="sm"
                                    value={createCapacidadDraft.periodo}
                                    onChange={(event) => setCreateCapacidadDraft((prev) => ({
                                        ...prev,
                                        periodo: event.target.value as PeriodoCapacidadAreaOperativa,
                                    }))}
                                >
                                    {PERIODOS.map((periodo) => (
                                        <option key={periodo} value={periodo}>{periodo}</option>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl>
                                <FormLabel>Eficiencia</FormLabel>
                                <Input
                                    size="sm"
                                    type="number"
                                    min={0}
                                    max={1}
                                    step="0.0001"
                                    value={createCapacidadDraft.eficiencia}
                                    onChange={(event) => setCreateCapacidadDraft((prev) => ({
                                        ...prev,
                                        eficiencia: parseNumber(event.target.value, 1),
                                    }))}
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Desde</FormLabel>
                                <Input
                                    size="sm"
                                    type="date"
                                    value={createCapacidadDraft.vigenteDesde}
                                    onChange={(event) => setCreateCapacidadDraft((prev) => ({ ...prev, vigenteDesde: event.target.value }))}
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Hasta</FormLabel>
                                <Input
                                    size="sm"
                                    type="date"
                                    value={createCapacidadDraft.vigenteHasta}
                                    onChange={(event) => setCreateCapacidadDraft((prev) => ({ ...prev, vigenteHasta: event.target.value }))}
                                />
                            </FormControl>
                            <Flex align="end">
                                <Button
                                    size="sm"
                                    colorScheme="teal"
                                    onClick={handleCreateCapacidad}
                                    isDisabled={unidades.length === 0}
                                    isLoading={savingKey === 'create-capacidad'}
                                >
                                    Crear capacidad
                                </Button>
                            </Flex>
                        </SimpleGrid>
                    )}

                    {capacidades.length === 0 ? (
                        <Text color="app.textSubtle" fontSize="sm">Sin capacidades configuradas.</Text>
                    ) : (
                        <TableContainer>
                            <Table size="sm">
                                <Thead>
                                    <Tr>
                                        <Th>Unidad</Th>
                                        <Th>Tipo</Th>
                                        <Th>Cantidad</Th>
                                        <Th>Periodo</Th>
                                        <Th>Eficiencia</Th>
                                        <Th>Vigencia</Th>
                                        <Th>Estado</Th>
                                        {!isReadOnly && <Th>Acciones</Th>}
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {capacidades.map((capacidad) => {
                                        const draft = capacidadDrafts[capacidad.id] ?? buildCapacidadDraft(capacidad, unidades);
                                        return (
                                            <Tr key={capacidad.id}>
                                                <Td>
                                                    <Select
                                                        size="sm"
                                                        value={draft.unidadMedidaId ?? ''}
                                                        isDisabled={isReadOnly}
                                                        onChange={(event) => setCapacidadDraftField(
                                                            capacidad.id,
                                                            'unidadMedidaId',
                                                            event.target.value ? Number(event.target.value) : null,
                                                        )}
                                                    >
                                                        {unidades.map((unidad) => (
                                                            <option key={unidad.id} value={unidad.id}>{formatUnidad(unidad)}</option>
                                                        ))}
                                                    </Select>
                                                </Td>
                                                <Td>
                                                    <Select
                                                        size="sm"
                                                        value={draft.tipoCapacidad}
                                                        isDisabled={isReadOnly}
                                                        onChange={(event) => setCapacidadDraftField(
                                                            capacidad.id,
                                                            'tipoCapacidad',
                                                            event.target.value as TipoCapacidadAreaOperativa,
                                                        )}
                                                    >
                                                        {TIPOS_CAPACIDAD.map((tipo) => (
                                                            <option key={tipo} value={tipo}>{CAPACIDAD_LABEL[tipo]}</option>
                                                        ))}
                                                    </Select>
                                                </Td>
                                                <Td>
                                                    <Input
                                                        size="sm"
                                                        type="number"
                                                        min={0.000001}
                                                        step="0.000001"
                                                        value={draft.cantidad}
                                                        isReadOnly={isReadOnly}
                                                        onChange={(event) => setCapacidadDraftField(
                                                            capacidad.id,
                                                            'cantidad',
                                                            parseNumber(event.target.value, 1),
                                                        )}
                                                    />
                                                </Td>
                                                <Td>
                                                    <Select
                                                        size="sm"
                                                        value={draft.periodo}
                                                        isDisabled={isReadOnly}
                                                        onChange={(event) => setCapacidadDraftField(
                                                            capacidad.id,
                                                            'periodo',
                                                            event.target.value as PeriodoCapacidadAreaOperativa,
                                                        )}
                                                    >
                                                        {PERIODOS.map((periodo) => (
                                                            <option key={periodo} value={periodo}>{periodo}</option>
                                                        ))}
                                                    </Select>
                                                </Td>
                                                <Td>
                                                    <Input
                                                        size="sm"
                                                        type="number"
                                                        min={0}
                                                        max={1}
                                                        step="0.0001"
                                                        value={draft.eficiencia}
                                                        isReadOnly={isReadOnly}
                                                        onChange={(event) => setCapacidadDraftField(
                                                            capacidad.id,
                                                            'eficiencia',
                                                            parseNumber(event.target.value, 1),
                                                        )}
                                                    />
                                                </Td>
                                                <Td>
                                                    <VStack align="stretch" spacing={1}>
                                                        <Input
                                                            size="sm"
                                                            type="date"
                                                            value={draft.vigenteDesde}
                                                            isReadOnly={isReadOnly}
                                                            onChange={(event) => setCapacidadDraftField(capacidad.id, 'vigenteDesde', event.target.value)}
                                                        />
                                                        <Input
                                                            size="sm"
                                                            type="date"
                                                            value={draft.vigenteHasta}
                                                            isReadOnly={isReadOnly}
                                                            onChange={(event) => setCapacidadDraftField(capacidad.id, 'vigenteHasta', event.target.value)}
                                                        />
                                                    </VStack>
                                                </Td>
                                                <Td>
                                                    <Badge colorScheme={draft.activo ? 'green' : 'gray'}>
                                                        {draft.activo ? 'Activa' : 'Inactiva'}
                                                    </Badge>
                                                </Td>
                                                {!isReadOnly && (
                                                    <Td>
                                                        <HStack>
                                                            <Checkbox
                                                                size="sm"
                                                                isChecked={draft.activo}
                                                                onChange={(event) => setCapacidadDraftField(capacidad.id, 'activo', event.target.checked)}
                                                            >
                                                                Activa
                                                            </Checkbox>
                                                            <Button
                                                                size="sm"
                                                                colorScheme="green"
                                                                onClick={() => handleSaveCapacidad(capacidad)}
                                                                isLoading={savingKey === `capacidad-${capacidad.id}`}
                                                            >
                                                                Guardar
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                colorScheme="red"
                                                                onClick={() => handleDeactivateCapacidad(capacidad)}
                                                                isDisabled={!capacidad.activo}
                                                                isLoading={savingKey === `capacidad-delete-${capacidad.id}`}
                                                            >
                                                                Desactivar
                                                            </Button>
                                                        </HStack>
                                                    </Td>
                                                )}
                                            </Tr>
                                        );
                                    })}
                                </Tbody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>
            )}
        </VStack>
    );
}
