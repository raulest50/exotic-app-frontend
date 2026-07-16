import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    AlertIcon,
    Badge,
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    Heading,
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
        <VStack align="stretch" spacing={5}>
            <Flex
                direction={{ base: 'column', sm: 'row' }}
                justify="space-between"
                align={{ base: 'stretch', sm: 'flex-start' }}
                gap={3}
            >
                <Box>
                    <Heading as="h3" size="sm">Unidades de medida</Heading>
                    <Text color="app.textSubtle" fontSize="sm" mt={1}>
                        Configure las equivalencias utilizadas por esta área operativa.
                    </Text>
                </Box>
                {!isReadOnly && (
                    <Badge colorScheme="blue" alignSelf={{ base: 'flex-start', sm: 'center' }}>
                        Guardado individual
                    </Badge>
                )}
            </Flex>

            {error && (
                <Alert status="error" borderRadius="lg">
                    <AlertIcon />
                    {error}
                </Alert>
            )}

            {!isReadOnly && (
                <Box
                    borderWidth="1px"
                    borderColor="app.border"
                    borderRadius="xl"
                    bg="app.surface"
                    p={{ base: 4, md: 5 }}
                >
                    <Box mb={4}>
                        <Heading as="h4" size="sm">Crear una unidad</Heading>
                        <Text color="app.textSubtle" fontSize="sm" mt={1}>
                            Registre el nombre y su relación con una unidad estándar.
                        </Text>
                    </Box>
                    <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={4}>
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
                </Box>
            )}

            <Box
                borderWidth="1px"
                borderColor="app.border"
                borderRadius="xl"
                bg="app.surface"
                overflow="hidden"
            >
                <Flex
                    px={{ base: 4, md: 5 }}
                    py={4}
                    justify="space-between"
                    align="center"
                    borderBottomWidth={unidades.length > 0 ? '1px' : 0}
                    borderColor="app.border"
                >
                    <Box>
                        <Heading as="h4" size="sm">Unidades registradas</Heading>
                        <Text color="app.textSubtle" fontSize="sm" mt={1}>
                            {isReadOnly
                                ? 'Listado de unidades configuradas para esta área.'
                                : 'Edite y guarde cada unidad de manera independiente.'}
                        </Text>
                    </Box>
                    <Badge colorScheme="teal">{unidades.length}</Badge>
                </Flex>

                {unidades.length === 0 ? (
                    <Flex
                        minH="180px"
                        align="center"
                        justify="center"
                        direction="column"
                        textAlign="center"
                        px={6}
                        py={10}
                    >
                        <Text fontWeight="semibold">Sin unidades configuradas</Text>
                        <Text color="app.textSubtle" fontSize="sm" mt={1}>
                            Las unidades creadas para el área aparecerán en esta sección.
                        </Text>
                    </Flex>
                ) : (
                    <>
                    <TableContainer display={{ base: 'none', md: 'block' }}>
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
                                                    bg={isReadOnly ? 'app.inputReadonly' : undefined}
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
                                                    bg={isReadOnly ? 'app.inputReadonly' : undefined}
                                                />
                                            </Td>
                                            <Td>
                                                <Select
                                                    size="sm"
                                                    value={draft.unidadRelacion}
                                                    isDisabled={isReadOnly}
                                                    bg={isReadOnly ? 'app.inputReadonly' : undefined}
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
                                                            colorScheme="teal"
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
                        <VStack
                            display={{ base: 'flex', md: 'none' }}
                            align="stretch"
                            spacing={0}
                            divider={<Box borderBottomWidth="1px" borderColor="app.border" />}
                        >
                            {unidades.map((unidad) => {
                                const draft = unidadDrafts[unidad.id] ?? buildUnidadDraft(unidad);
                                return (
                                    <Box key={unidad.id} p={4}>
                                        <Flex justify="space-between" align="center" mb={4}>
                                            <Text fontWeight="semibold">Unidad #{unidad.id}</Text>
                                            <Badge colorScheme="gray">{draft.unidadRelacion}</Badge>
                                        </Flex>

                                        <VStack align="stretch" spacing={4}>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Nombre</FormLabel>
                                                <Input
                                                    size="sm"
                                                    value={draft.nombre}
                                                    isReadOnly={isReadOnly}
                                                    bg={isReadOnly ? 'app.inputReadonly' : undefined}
                                                    onChange={(event) => setUnidadDraftField(
                                                        unidad.id,
                                                        'nombre',
                                                        event.target.value,
                                                    )}
                                                />
                                            </FormControl>

                                            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                                                <FormControl>
                                                    <FormLabel fontSize="sm">Relación estándar</FormLabel>
                                                    <Input
                                                        size="sm"
                                                        type="number"
                                                        min={0.000001}
                                                        step="0.000001"
                                                        value={draft.relacionEstandar}
                                                        isReadOnly={isReadOnly}
                                                        bg={isReadOnly ? 'app.inputReadonly' : undefined}
                                                        onChange={(event) => setUnidadDraftField(
                                                            unidad.id,
                                                            'relacionEstandar',
                                                            parseNumber(event.target.value, 1),
                                                        )}
                                                    />
                                                </FormControl>
                                                <FormControl>
                                                    <FormLabel fontSize="sm">Unidad relación</FormLabel>
                                                    <Select
                                                        size="sm"
                                                        value={draft.unidadRelacion}
                                                        isDisabled={isReadOnly}
                                                        bg={isReadOnly ? 'app.inputReadonly' : undefined}
                                                        onChange={(event) => setUnidadDraftField(
                                                            unidad.id,
                                                            'unidadRelacion',
                                                            event.target.value as UnidadRelacionAreaOperativa,
                                                        )}
                                                    >
                                                        {UNIDADES_RELACION.map((unidadRelacion) => (
                                                            <option key={unidadRelacion} value={unidadRelacion}>
                                                                {unidadRelacion}
                                                            </option>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </SimpleGrid>

                                            {!isReadOnly && (
                                                <HStack justify="flex-end">
                                                    <Button
                                                        size="sm"
                                                        colorScheme="teal"
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
                                            )}
                                        </VStack>
                                    </Box>
                                );
                            })}
                        </VStack>
                    </>
                )}
            </Box>
        </VStack>
    );
}
