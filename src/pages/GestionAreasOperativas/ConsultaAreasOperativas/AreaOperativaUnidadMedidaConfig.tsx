import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    AlertIcon,
    Box,
    Button,
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
    UnidadMedidaAreaOperativa,
    UnidadMedidaAreaOperativaRequest,
    UnidadRelacionAreaOperativa,
} from './types';

interface AreaOperativaUnidadMedidaConfigProps {
    areaId: number;
    isReadOnly?: boolean;
    onUnidadesLoaded?: (unidades: UnidadMedidaAreaOperativa[]) => void;
}

const UNIDADES_RELACION: UnidadRelacionAreaOperativa[] = ['ML', 'L', 'G', 'KG', 'U'];

function buildUnidadDraft(unidad?: UnidadMedidaAreaOperativa): UnidadMedidaAreaOperativaRequest {
    return {
        nombre: unidad?.nombre ?? '',
        relacionEstandar: unidad?.relacionEstandar ?? 1,
        unidadRelacion: unidad?.unidadRelacion ?? 'L',
    };
}

function parseNumber(value: string, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
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

export default function AreaOperativaUnidadMedidaConfig({
    areaId,
    isReadOnly = false,
    onUnidadesLoaded,
}: AreaOperativaUnidadMedidaConfigProps) {
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const toast = useToast();

    const [unidades, setUnidades] = useState<UnidadMedidaAreaOperativa[]>([]);
    const [unidadDrafts, setUnidadDrafts] = useState<Record<number, UnidadMedidaAreaOperativaRequest>>({});
    const [createUnidadDraft, setCreateUnidadDraft] = useState<UnidadMedidaAreaOperativaRequest>(buildUnidadDraft());
    const [loading, setLoading] = useState(false);
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const unidadesUrl = endpoints.area_operativa_unidades.replace('{areaId}', String(areaId));
            const unidadesResponse = await axios.get<UnidadMedidaAreaOperativa[]>(unidadesUrl, { withCredentials: true });

            const nextUnidades = unidadesResponse.data;
            setUnidades(nextUnidades);
            onUnidadesLoaded?.(nextUnidades);
            setUnidadDrafts(Object.fromEntries(nextUnidades.map((unidad) => [unidad.id, buildUnidadDraft(unidad)])));
        } catch (loadError) {
            setError(getErrorMessage(loadError, 'No se pudieron cargar las unidades.'));
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
        </VStack>
    );
}
