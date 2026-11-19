import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Alert, Badge, Box, Button, Field, Flex, Heading, HStack, Input, SimpleGrid, Spinner, Text, VStack } from '@chakra-ui/react';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL';
import { useAppToast } from '../../../components/ui/use-app-toast';
import type { AreaOperativaAsociacionItem, PaginatedResponse } from './types';

const endpoints = new EndPointsURL();

interface Props {
    areaId: number;
    isReadOnly: boolean;
    disabled?: boolean;
    onDirtyChange: (dirty: boolean) => void;
    onBusyChange: (busy: boolean) => void;
}

function errorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError<{ message?: string }>(error)) {
        if (error.response?.status === 403) return 'No tienes permiso para configurar las asociaciones de esta área.';
        if (error.response?.status === 401) return 'Tu sesión no está disponible. Inicia sesión nuevamente.';
        if (typeof error.response?.data?.message === 'string') return error.response.data.message;
    }
    return fallback;
}

export default function AreaOperativaRecursosProduccionTab({
    areaId, isReadOnly, disabled = false, onDirtyChange, onBusyChange,
}: Props) {
    const toast = useAppToast();
    const titulo = 'Recursos de producción que puede usar';
    const url = endpoints.area_operativa_recursos_produccion.replace('{areaId}', String(areaId));
    const [original, setOriginal] = useState<AreaOperativaAsociacionItem[] | null>(null);
    const [selected, setSelected] = useState<AreaOperativaAsociacionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [searchText, setSearchText] = useState('');
    const [searchRequest, setSearchRequest] = useState({ term: '', page: 0 });
    const [searching, setSearching] = useState(!isReadOnly);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [results, setResults] = useState<PaginatedResponse<AreaOperativaAsociacionItem> | null>(null);
    const selectedIds = useMemo(() => new Set(selected.map(item => item.id)), [selected]);
    const dirty = original !== null && (original.length !== selected.length || original.some(item => !selectedIds.has(item.id)));
    const locked = isReadOnly || disabled || saving || loading || original === null;

    useEffect(() => {
        const controller = new AbortController();
        axios.get<AreaOperativaAsociacionItem[]>(url, { withCredentials: true, signal: controller.signal })
            .then(response => {
                if (controller.signal.aborted) return;
                setOriginal(response.data);
                setSelected(response.data);
                setLoadError(null);
                setSaveError(null);
            })
            .catch(error => {
                if (!controller.signal.aborted) setLoadError(errorMessage(error, 'No se pudieron cargar las asociaciones. Intenta nuevamente.'));
            })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [url, loadAttempt]);

    useEffect(() => {
        if (isReadOnly) return;
        const controller = new AbortController();
        axios.get<PaginatedResponse<AreaOperativaAsociacionItem>>(url + '/catalogo', {
            withCredentials: true, signal: controller.signal,
            params: { search: searchRequest.term, page: searchRequest.page },
        })
            .then(response => { if (!controller.signal.aborted) setResults(response.data); })
            .catch(error => {
                if (!controller.signal.aborted) setSearchError(errorMessage(error, 'No se pudo consultar el catálogo. Intenta nuevamente.'));
            })
            .finally(() => { if (!controller.signal.aborted) setSearching(false); });
        return () => controller.abort();
    }, [url, searchRequest, isReadOnly]);

    useEffect(() => {
        onDirtyChange(dirty);
        return () => onDirtyChange(false);
    }, [dirty, onDirtyChange]);

    useEffect(() => {
        onBusyChange(saving);
        return () => onBusyChange(false);
    }, [saving, onBusyChange]);

    const search = (page: number, term = searchRequest.term) => {
        setSearching(true);
        setSearchError(null);
        setSearchRequest({ term, page });
    };

    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        search(0, searchText.trim());
    };

    const reload = () => {
        if (dirty && !window.confirm('¿Descartar los cambios de esta pestaña y volver a cargar sus asociaciones?')) return;
        setLoading(true);
        setLoadError(null);
        setLoadAttempt(value => value + 1);
        if (!isReadOnly) search(0);
    };

    const save = async () => {
        if (locked || !dirty) return;
        setSaving(true);
        setSaveError(null);
        try {
            const recursoIds = selected.map(item => Number(item.id));
            if (recursoIds.some(id => !Number.isSafeInteger(id) || id <= 0)) {
                throw new Error('ID de recurso inválido');
            }
            const request = { recursoIds };
            const response = await axios.put<AreaOperativaAsociacionItem[]>(url, request, { withCredentials: true });
            setOriginal(response.data);
            setSelected(response.data);
            toast({ title: 'Asociaciones guardadas', status: 'success', duration: 2500 });
        } catch (error) {
            setSaveError(errorMessage(error, 'No se pudieron guardar las asociaciones. Tus cambios siguen en esta pestaña.'));
        } finally {
            setSaving(false);
        }
    };

    const renderItem = (item: AreaOperativaAsociacionItem, associated: boolean, inCatalog = false) => (
        <Flex as="li" key={item.id} p={3} gap={3} align="center" justify="space-between"
            borderBottomWidth="1px" borderColor="app.border">
            <Box minW={0}>
                <Text fontSize="sm" fontWeight="medium" overflowWrap="anywhere">{item.nombre}</Text>
                <Text fontSize="xs" color="app.textSubtle" overflowWrap="anywhere">
                    ID: {item.id}
                </Text>
                {item.detalle && <Text fontSize="xs" color="app.textSubtle" lineClamp={2}>{item.detalle}</Text>}
            </Box>
            {!isReadOnly && (inCatalog ? (
                <Button type="button" size="xs" variant="outline" colorPalette="teal" flexShrink={0}
                    aria-label={(associated ? 'Ya asociado: ' : 'Agregar ') + item.nombre}
                    disabled={locked || associated || selected.length >= 1000}
                    onClick={() => setSelected(current => current.some(value => value.id === item.id) ? current : [...current, item])}>
                    {associated ? 'Asociado' : 'Agregar'}
                </Button>
            ) : (
                <Button type="button" size="xs" variant="ghost" flexShrink={0} aria-label={'Quitar ' + item.nombre}
                    disabled={locked} onClick={() => setSelected(current => current.filter(value => value.id !== item.id))}>
                    Quitar
                </Button>
            ))}
        </Flex>
    );

    return (
        <VStack align="stretch" gap={4}>
            <Flex gap={3} justify="space-between" align="start">
                <Box>
                    <Heading as="h3" size="sm">{titulo}</Heading>
                    <Text mt={1} fontSize="sm" color="app.textSubtle">
                        Asocia los tipos de recursos que esta área puede utilizar. Un mismo recurso puede estar asociado a varias áreas; esta lista no asigna equipos físicos ni reserva capacidad.
                    </Text>
                </Box>
                <Button type="button" size="xs" variant="ghost" flexShrink={0} onClick={reload}
                    disabled={loading || saving || disabled}>Recargar</Button>
            </Flex>
            {isReadOnly && <Alert.Root status="info"><Alert.Indicator /><Alert.Content>
                Almacén General es un área del sistema; sus asociaciones son de solo lectura.
            </Alert.Content></Alert.Root>}
            {loadError && <Alert.Root status="error"><Alert.Indicator /><Alert.Content>{loadError}</Alert.Content></Alert.Root>}
            {saveError && <Alert.Root status="error"><Alert.Indicator /><Alert.Content>{saveError}</Alert.Content></Alert.Root>}
            {loading ? <Flex justify="center" py={8} role="status"><Spinner /><Text ml={3}>Cargando asociaciones…</Text></Flex>
                : !loadError && original !== null && <>
                    {!isReadOnly && <Flex gap={3} align="center" justify="space-between" flexWrap="wrap">
                        <Text fontSize="sm" color="app.textSubtle" role="status">
                            {dirty ? 'Hay cambios sin guardar en esta pestaña.' : 'Asociaciones guardadas.'}
                        </Text>
                        <HStack flexWrap="wrap">
                            <Button type="button" size="sm" variant="ghost" disabled={locked || !dirty}
                                onClick={() => { setSelected(original); setSaveError(null); }}>Descartar cambios</Button>
                            <Button type="button" size="sm" colorPalette="teal" onClick={() => void save()}
                                disabled={locked || !dirty} loading={saving} loadingText="Guardando">
                                Guardar asociaciones
                            </Button>
                        </HStack>
                    </Flex>}
                    <SimpleGrid columns={{ base: 1, lg: isReadOnly ? 1 : 2 }} gap={4}>
                        <Box minW={0} borderWidth="1px" borderColor="app.border" borderRadius="lg" bg="app.surface">
                            <HStack p={3} borderBottomWidth="1px" borderColor="app.border">
                                <Text fontWeight="semibold" fontSize="sm">Asociados al área</Text><Badge>{selected.length}</Badge>
                            </HStack>
                            <Box as="ul" listStyleType="none" m={0} p={0} maxH="380px" overflowY="auto">
                                {selected.map(item => renderItem(item, true))}
                            </Box>
                            {selected.length === 0 && <Text p={4} fontSize="sm" color="app.textSubtle">
                                Aún no hay recursos asociados.
                            </Text>}
                        </Box>
                        {!isReadOnly && <Box minW={0} borderWidth="1px" borderColor="app.border" borderRadius="lg" bg="app.surface">
                            <Box p={3} borderBottomWidth="1px" borderColor="app.border">
                                <Text fontWeight="semibold" fontSize="sm" mb={3}>Buscar y agregar</Text>
                                <form onSubmit={submitSearch}>
                                    <HStack align="end">
                                        <Field.Root minW={0} flex={1}>
                                            <Field.Label>Nombre o ID</Field.Label>
                                            <Input size="sm" value={searchText} maxLength={200} disabled={locked}
                                                onChange={event => setSearchText(event.target.value)} />
                                        </Field.Root>
                                        <Button type="submit" size="sm" disabled={locked || searching} loading={searching}>Buscar</Button>
                                    </HStack>
                                </form>
                            </Box>
                            {searching ? <Flex p={6} justify="center" role="status"><Spinner size="sm" /><Text ml={2} fontSize="sm">Buscando…</Text></Flex>
                                : searchError ? <Box p={3}><Text role="alert" fontSize="sm">{searchError}</Text>
                                    <Button type="button" mt={2} size="xs" onClick={() => search(searchRequest.page)} disabled={locked}>Reintentar búsqueda</Button></Box>
                                    : <>
                                        <Box as="ul" listStyleType="none" m={0} p={0} maxH="380px" overflowY="auto">
                                            {results?.content.map(item => renderItem(item, selectedIds.has(item.id), true))}
                                        </Box>
                                        {results?.content.length === 0 && <Text p={4} fontSize="sm" color="app.textSubtle">No se encontraron coincidencias.</Text>}
                                        {results && results.totalPages > 1 && <Flex p={3} gap={2} justify="space-between" align="center">
                                            <Button type="button" size="xs" variant="outline" disabled={locked || results.number === 0}
                                                onClick={() => search(results.number - 1)}>Anterior</Button>
                                            <Text fontSize="xs">Página {results.number + 1} de {results.totalPages}</Text>
                                            <Button type="button" size="xs" variant="outline" disabled={locked || results.number + 1 >= results.totalPages}
                                                onClick={() => search(results.number + 1)}>Siguiente</Button>
                                        </Flex>}
                                    </>}
                        </Box>}
                    </SimpleGrid>
                </>}
        </VStack>
    );
}
