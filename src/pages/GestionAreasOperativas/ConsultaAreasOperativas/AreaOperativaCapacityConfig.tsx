import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    AlertIcon,
    Badge,
    Box,
    Button,
    Checkbox,
    Divider,
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
    ConversionUnidadAreaOperativaResponse,
    DimensionUnidadAreaOperativa,
    PeriodoCapacidadAreaOperativa,
    TipoCapacidadAreaOperativa,
    UnidadMedidaAreaOperativa,
    UnidadMedidaAreaOperativaRequest,
} from './types';

interface AreaOperativaCapacityConfigProps {
    areaId: number;
    isReadOnly?: boolean;
    visibleSections?: readonly AreaOperativaCapacitySection[];
    onUnidadesLoaded?: (unidades: UnidadMedidaAreaOperativa[]) => void;
}

type AreaOperativaCapacitySection = 'unidades' | 'capacidades' | 'conversion';

interface UnidadDraft extends UnidadMedidaAreaOperativaRequest {
    descripcion: string;
}

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

const DIMENSIONES: DimensionUnidadAreaOperativa[] = ['VOLUMEN', 'MASA', 'CONTEO', 'TIEMPO'];
const TIPOS_CAPACIDAD: TipoCapacidadAreaOperativa[] = ['PRODUCTIVA', 'ALMACENAMIENTO'];
const PERIODOS: PeriodoCapacidadAreaOperativa[] = ['HORA', 'TURNO', 'DIA', 'SEMANA'];

const DEFAULT_SECTIONS: readonly AreaOperativaCapacitySection[] = ['unidades', 'capacidades', 'conversion'];

const UNIDADES_ESTANDAR: Record<DimensionUnidadAreaOperativa, string[]> = {
    VOLUMEN: ['L'],
    MASA: ['KG'],
    CONTEO: ['U'],
    TIEMPO: ['MIN'],
};

const DIMENSION_LABEL: Record<DimensionUnidadAreaOperativa, string> = {
    VOLUMEN: 'Volumen',
    MASA: 'Masa',
    CONTEO: 'Conteo',
    TIEMPO: 'Tiempo',
};

const CAPACIDAD_LABEL: Record<TipoCapacidadAreaOperativa, string> = {
    PRODUCTIVA: 'Productiva',
    ALMACENAMIENTO: 'Almacenamiento',
};

function buildUnidadDraft(unidad?: UnidadMedidaAreaOperativa): UnidadDraft {
    return {
        codigo: unidad?.codigo ?? '',
        nombre: unidad?.nombre ?? '',
        descripcion: unidad?.descripcion ?? '',
        dimension: unidad?.dimension ?? 'VOLUMEN',
        unidadEstandar: unidad?.unidadEstandar ?? 'L',
        cantidadUnidadEstandar: unidad?.cantidadUnidadEstandar ?? 1,
        principal: unidad?.principal ?? false,
        discreta: unidad?.discreta ?? false,
        activo: unidad?.activo ?? true,
    };
}

function buildCapacidadDraft(
    capacidad?: CapacidadAreaOperativa,
    unidades: UnidadMedidaAreaOperativa[] = [],
): CapacidadDraft {
    const defaultUnidad = unidades.find((unidad) => unidad.activo)?.id ?? unidades[0]?.id ?? null;
    return {
        unidadMedidaId: capacidad?.unidadMedidaId ?? defaultUnidad,
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

function getErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.message ?? error.response?.data?.error ?? error.message ?? fallback;
    }
    return error instanceof Error ? error.message : fallback;
}

function normalizeUnidadRequest(draft: UnidadDraft): UnidadMedidaAreaOperativaRequest {
    return {
        codigo: draft.codigo.trim(),
        nombre: draft.nombre.trim(),
        descripcion: draft.descripcion.trim() || null,
        dimension: draft.dimension,
        unidadEstandar: draft.unidadEstandar,
        cantidadUnidadEstandar: draft.cantidadUnidadEstandar,
        principal: draft.principal,
        discreta: draft.discreta,
        activo: draft.activo,
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
    const [unidadDrafts, setUnidadDrafts] = useState<Record<number, UnidadDraft>>({});
    const [capacidadDrafts, setCapacidadDrafts] = useState<Record<number, CapacidadDraft>>({});
    const [createUnidadDraft, setCreateUnidadDraft] = useState<UnidadDraft>(buildUnidadDraft());
    const [createCapacidadDraft, setCreateCapacidadDraft] = useState<CapacidadDraft>(buildCapacidadDraft());
    const [loading, setLoading] = useState(false);
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [conversionOrigenId, setConversionOrigenId] = useState<number | null>(null);
    const [conversionDestinoId, setConversionDestinoId] = useState<number | null>(null);
    const [conversionCantidad, setConversionCantidad] = useState(1);
    const [conversionResult, setConversionResult] = useState<ConversionUnidadAreaOperativaResponse | null>(null);

    const unidadesActivas = useMemo(() => unidades.filter((unidad) => unidad.activo), [unidades]);
    const showUnidades = visibleSections.includes('unidades');
    const showCapacidades = visibleSections.includes('capacidades');
    const showConversion = visibleSections.includes('conversion');

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

            const firstActive = nextUnidades.find((unidad) => unidad.activo) ?? null;
            const secondActive = nextUnidades.find((unidad) => unidad.activo && unidad.id !== firstActive?.id) ?? firstActive;
            setConversionOrigenId(firstActive?.id ?? null);
            setConversionDestinoId(secondActive?.id ?? null);
            setConversionResult(null);
        } catch (loadError) {
            setError(getErrorMessage(loadError, 'No se pudieron cargar unidades y capacidades.'));
        } finally {
            setLoading(false);
        }
    }, [areaId, endpoints, onUnidadesLoaded]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const setUnidadDraftField = <K extends keyof UnidadDraft>(unidadId: number, key: K, value: UnidadDraft[K]) => {
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
        if (!request.codigo || !request.nombre) {
            toast({
                title: 'Datos incompletos',
                description: 'Codigo y nombre son obligatorios.',
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

    const handleDeactivateUnidad = async (unidad: UnidadMedidaAreaOperativa) => {
        if (!window.confirm(`Desactivar la unidad "${unidad.codigo}"?`)) {
            return;
        }
        setSavingKey(`unidad-delete-${unidad.id}`);
        try {
            const url = endpoints.area_operativa_unidad
                .replace('{areaId}', String(areaId))
                .replace('{unidadId}', String(unidad.id));
            await axios.delete(url, { withCredentials: true });
            await loadData();
            toast({ title: 'Unidad desactivada', status: 'success', duration: 3000, isClosable: true });
        } catch (deleteError) {
            toast({
                title: 'Error al desactivar unidad',
                description: getErrorMessage(deleteError, 'No se pudo desactivar la unidad.'),
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

    const handleConvert = async () => {
        if (!conversionOrigenId || !conversionDestinoId) {
            return;
        }
        setSavingKey('conversion');
        try {
            const response = await axios.post<ConversionUnidadAreaOperativaResponse>(
                endpoints.area_operativa_conversion_unidades,
                {
                    unidadOrigenId: conversionOrigenId,
                    cantidadOrigen: conversionCantidad,
                    unidadDestinoId: conversionDestinoId,
                },
                { withCredentials: true },
            );
            setConversionResult(response.data);
        } catch (convertError) {
            setConversionResult(null);
            toast({
                title: 'Conversion no disponible',
                description: getErrorMessage(convertError, 'No se pudo convertir entre estas unidades.'),
                status: 'warning',
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
                    <SimpleGrid columns={[1, 1, 3]} spacing={3} mb={4}>
                        <FormControl>
                            <FormLabel>Codigo</FormLabel>
                            <Input
                                size="sm"
                                value={createUnidadDraft.codigo}
                                onChange={(event) => setCreateUnidadDraft((prev) => ({ ...prev, codigo: event.target.value }))}
                                placeholder="MARMITA"
                            />
                        </FormControl>
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
                            <FormLabel>Dimension</FormLabel>
                            <Select
                                size="sm"
                                value={createUnidadDraft.dimension}
                                onChange={(event) => {
                                    const dimension = event.target.value as DimensionUnidadAreaOperativa;
                                    setCreateUnidadDraft((prev) => ({
                                        ...prev,
                                        dimension,
                                        unidadEstandar: UNIDADES_ESTANDAR[dimension][0],
                                    }));
                                }}
                            >
                                {DIMENSIONES.map((dimension) => (
                                    <option key={dimension} value={dimension}>{DIMENSION_LABEL[dimension]}</option>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl>
                            <FormLabel>Unidad estandar</FormLabel>
                            <Select
                                size="sm"
                                value={createUnidadDraft.unidadEstandar}
                                onChange={(event) => setCreateUnidadDraft((prev) => ({ ...prev, unidadEstandar: event.target.value }))}
                            >
                                {UNIDADES_ESTANDAR[createUnidadDraft.dimension].map((unidadEstandar) => (
                                    <option key={unidadEstandar} value={unidadEstandar}>{unidadEstandar}</option>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl>
                            <FormLabel>Cantidad en unidad estandar</FormLabel>
                            <Input
                                size="sm"
                                type="number"
                                min={0.000001}
                                step="0.000001"
                                value={createUnidadDraft.cantidadUnidadEstandar}
                                onChange={(event) => setCreateUnidadDraft((prev) => ({
                                    ...prev,
                                    cantidadUnidadEstandar: parseNumber(event.target.value, 1),
                                }))}
                            />
                        </FormControl>
                        <FormControl>
                            <FormLabel>Opciones</FormLabel>
                            <HStack h="32px" spacing={3}>
                                <Checkbox
                                    size="sm"
                                    isChecked={createUnidadDraft.principal}
                                    onChange={(event) => setCreateUnidadDraft((prev) => ({ ...prev, principal: event.target.checked }))}
                                >
                                    Principal
                                </Checkbox>
                                <Checkbox
                                    size="sm"
                                    isChecked={createUnidadDraft.discreta}
                                    onChange={(event) => setCreateUnidadDraft((prev) => ({ ...prev, discreta: event.target.checked }))}
                                >
                                    Discreta
                                </Checkbox>
                            </HStack>
                        </FormControl>
                        <FormControl gridColumn={['auto', 'auto', 'span 2']}>
                            <FormLabel>Descripcion</FormLabel>
                            <Input
                                size="sm"
                                value={createUnidadDraft.descripcion}
                                onChange={(event) => setCreateUnidadDraft((prev) => ({ ...prev, descripcion: event.target.value }))}
                                placeholder="Opcional"
                            />
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
                                    <Th>Codigo</Th>
                                    <Th>Nombre</Th>
                                    <Th>Dimension</Th>
                                    <Th>Unidad estandar</Th>
                                    <Th>Cantidad estandar</Th>
                                    <Th>Estado</Th>
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
                                                    value={draft.codigo}
                                                    isReadOnly={isReadOnly}
                                                    onChange={(event) => setUnidadDraftField(unidad.id, 'codigo', event.target.value)}
                                                />
                                            </Td>
                                            <Td>
                                                <Input
                                                    size="sm"
                                                    value={draft.nombre}
                                                    isReadOnly={isReadOnly}
                                                    onChange={(event) => setUnidadDraftField(unidad.id, 'nombre', event.target.value)}
                                                />
                                            </Td>
                                            <Td>
                                                <Select
                                                    size="sm"
                                                    value={draft.dimension}
                                                    isDisabled={isReadOnly}
                                                    onChange={(event) => {
                                                        const dimension = event.target.value as DimensionUnidadAreaOperativa;
                                                        setUnidadDrafts((prev) => ({
                                                            ...prev,
                                                            [unidad.id]: {
                                                                ...draft,
                                                                dimension,
                                                                unidadEstandar: UNIDADES_ESTANDAR[dimension][0],
                                                            },
                                                        }));
                                                    }}
                                                >
                                                    {DIMENSIONES.map((dimension) => (
                                                        <option key={dimension} value={dimension}>{DIMENSION_LABEL[dimension]}</option>
                                                    ))}
                                                </Select>
                                            </Td>
                                            <Td>
                                                <Select
                                                    size="sm"
                                                    value={draft.unidadEstandar}
                                                    isDisabled={isReadOnly}
                                                    onChange={(event) => setUnidadDraftField(unidad.id, 'unidadEstandar', event.target.value)}
                                                >
                                                    {UNIDADES_ESTANDAR[draft.dimension].map((unidadEstandar) => (
                                                        <option key={unidadEstandar} value={unidadEstandar}>{unidadEstandar}</option>
                                                    ))}
                                                </Select>
                                            </Td>
                                            <Td>
                                                <Input
                                                    size="sm"
                                                    type="number"
                                                    min={0.000001}
                                                    step="0.000001"
                                                    value={draft.cantidadUnidadEstandar}
                                                    isReadOnly={isReadOnly}
                                                    onChange={(event) => setUnidadDraftField(
                                                        unidad.id,
                                                        'cantidadUnidadEstandar',
                                                        parseNumber(event.target.value, 1),
                                                    )}
                                                />
                                            </Td>
                                            <Td>
                                                <VStack align="start" spacing={1}>
                                                    <Badge colorScheme={draft.activo ? 'green' : 'gray'}>
                                                        {draft.activo ? 'Activa' : 'Inactiva'}
                                                    </Badge>
                                                    {draft.principal && <Badge colorScheme="blue">Principal</Badge>}
                                                    {draft.discreta && <Badge colorScheme="purple">Discreta</Badge>}
                                                </VStack>
                                            </Td>
                                            {!isReadOnly && (
                                                <Td>
                                                    <HStack>
                                                        <Checkbox
                                                            size="sm"
                                                            isChecked={draft.activo}
                                                            onChange={(event) => setUnidadDraftField(unidad.id, 'activo', event.target.checked)}
                                                        >
                                                            Activa
                                                        </Checkbox>
                                                        <Checkbox
                                                            size="sm"
                                                            isChecked={draft.principal}
                                                            onChange={(event) => setUnidadDraftField(unidad.id, 'principal', event.target.checked)}
                                                        >
                                                            Principal
                                                        </Checkbox>
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
                                                            onClick={() => handleDeactivateUnidad(unidad)}
                                                            isDisabled={!unidad.activo}
                                                            isLoading={savingKey === `unidad-delete-${unidad.id}`}
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
                                isDisabled={unidadesActivas.length === 0}
                            >
                                <option value="">Seleccione</option>
                                {unidadesActivas.map((unidad) => (
                                    <option key={unidad.id} value={unidad.id}>
                                        {unidad.codigo} - {unidad.nombre}
                                    </option>
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
                                isDisabled={unidadesActivas.length === 0}
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
                                                        <option key={unidad.id} value={unidad.id}>
                                                            {unidad.codigo} - {unidad.nombre}{unidad.activo ? '' : ' (inactiva)'}
                                                        </option>
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

            {showConversion && (
            <Box borderWidth="1px" borderRadius="md" p={3}>
                <Text fontWeight="bold" mb={3}>Probar equivalencia</Text>
                {unidadesActivas.length < 1 ? (
                    <Text color="app.textSubtle" fontSize="sm">Crea unidades activas para probar conversiones.</Text>
                ) : (
                    <>
                        <SimpleGrid columns={[1, 1, 4]} spacing={3}>
                            <FormControl>
                                <FormLabel>Cantidad</FormLabel>
                                <Input
                                    size="sm"
                                    type="number"
                                    min={0.000001}
                                    step="0.000001"
                                    value={conversionCantidad}
                                    onChange={(event) => setConversionCantidad(parseNumber(event.target.value, 1))}
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Origen</FormLabel>
                                <Select
                                    size="sm"
                                    value={conversionOrigenId ?? ''}
                                    onChange={(event) => setConversionOrigenId(event.target.value ? Number(event.target.value) : null)}
                                >
                                    {unidadesActivas.map((unidad) => (
                                        <option key={unidad.id} value={unidad.id}>
                                            {unidad.codigo}
                                        </option>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl>
                                <FormLabel>Destino</FormLabel>
                                <Select
                                    size="sm"
                                    value={conversionDestinoId ?? ''}
                                    onChange={(event) => setConversionDestinoId(event.target.value ? Number(event.target.value) : null)}
                                >
                                    {unidadesActivas.map((unidad) => (
                                        <option key={unidad.id} value={unidad.id}>
                                            {unidad.codigo}
                                        </option>
                                    ))}
                                </Select>
                            </FormControl>
                            <Flex align="end">
                                <Button
                                    size="sm"
                                    colorScheme="blue"
                                    onClick={handleConvert}
                                    isLoading={savingKey === 'conversion'}
                                >
                                    Convertir
                                </Button>
                            </Flex>
                        </SimpleGrid>
                        {conversionResult && (
                            <>
                                <Divider my={3} />
                                <Text fontSize="sm">
                                    {formatNumber(conversionResult.cantidadOrigen)} {conversionResult.unidadOrigen.codigo}
                                    {' = '}
                                    {formatNumber(conversionResult.cantidadDestino)} {conversionResult.unidadDestino.codigo}
                                    {' '}
                                    <Text as="span" color="app.textSubtle">
                                        ({formatNumber(conversionResult.cantidadEstandar)} {conversionResult.unidadEstandar})
                                    </Text>
                                </Text>
                            </>
                        )}
                    </>
                )}
            </Box>
            )}
        </VStack>
    );
}
