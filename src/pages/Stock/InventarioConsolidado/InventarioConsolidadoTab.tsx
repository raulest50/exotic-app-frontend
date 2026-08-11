import React, { useEffect, useRef, useState } from 'react';
import {
    Box,
    Button,
    Checkbox,
    Container,
    Flex,
    HStack,
    IconButton,
    Input,
    NativeSelect,
    Stack,
    Text,
    useDisclosure,
    VStack,
    Wrap,
    WrapItem,
    Field,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from 'axios';
import '@fontsource-variable/league-spartan';

import '@fontsource/anton';
import EndPointsURL from '../../../api/EndPointsURL.tsx';

import {
    AlcanceStock,
    AlmacenStock,
    InventarioConsolidadoPageDTO,
    ProductStockDTO,
} from '../types.tsx';
import AlcanceStockHelpModal from './AlcanceStockHelpModal.tsx';
import ListaProductos from './ListaProductos.tsx';
import { LuHelpCircle } from 'react-icons/lu';

const endPoints = new EndPointsURL();

const TODOS_LOS_ALMACENES: AlmacenStock[] = [
    'GENERAL',
    'AVERIAS',
    'CALIDAD',
    'DEVOLUCIONES',
];

const ALMACEN_LABELS: Record<AlmacenStock, string> = {
    GENERAL: 'General',
    AVERIAS: 'Averías',
    CALIDAD: 'Calidad',
    DEVOLUCIONES: 'Devoluciones',
};

type AppliedInventorySearch = {
    searchTerm: string;
    tipoBusqueda: string;
    alcance: AlcanceStock;
    almacenes: AlmacenStock[];
};

function getAlmacenesIncluidos(
    alcance: AlcanceStock,
    almacenesPersonalizados: AlmacenStock[],
): AlmacenStock[] {
    switch (alcance) {
        case 'DISPONIBLE_OPERATIVO':
            return ['GENERAL'];
        case 'RESTRINGIDO':
            return ['AVERIAS', 'CALIDAD', 'DEVOLUCIONES'];
        case 'PERSONALIZADO':
            return almacenesPersonalizados;
        case 'FISICO_TOTAL':
        default:
            return TODOS_LOS_ALMACENES;
    }
}

function formatFechaHoraCorte(fechaHoraCorte: string | null): string {
    if (!fechaHoraCorte) {
        return 'Sin consultar';
    }

    const fecha = new Date(fechaHoraCorte);
    if (Number.isNaN(fecha.getTime())) {
        return fechaHoraCorte;
    }

    return new Intl.DateTimeFormat('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'America/Bogota',
    }).format(fecha);
}

function InventarioConsolidadoTab() {
    const toast = useAppToast();
    const helpModal = useDisclosure();

    const [searchTerm, setSearchTerm] = useState('');
    const [tipoBusqueda, setTipoBusqueda] = useState('NOMBRE');
    const [alcance, setAlcance] = useState<AlcanceStock>('FISICO_TOTAL');
    const [almacenesPersonalizados, setAlmacenesPersonalizados] =
        useState<AlmacenStock[]>(TODOS_LOS_ALMACENES);
    const [productos, setProductos] = useState<ProductStockDTO[]>([]);
    const [pageProductos, setPageProductos] = useState(0);
    const [totalPagesProductos, setTotalPagesProductos] = useState(0);
    const [fechaHoraCorte, setFechaHoraCorte] = useState<string | null>(null);
    const [loadingProductos, setLoadingProductos] = useState(false);
    const [downloadingInventario, setDownloadingInventario] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [appliedSearch, setAppliedSearch] = useState<AppliedInventorySearch | null>(null);
    const [pageSize, setPageSize] = useState(10);

    const pageSizeRef = useRef(10);
    const activeRequestRef = useRef<AbortController | null>(null);
    const requestSequenceRef = useRef(0);

    useEffect(() => () => {
        requestSequenceRef.current += 1;
        activeRequestRef.current?.abort();
    }, []);

    const handleSearch = async (
        page: number,
        nextAlcance: AlcanceStock = alcance,
        nextAlmacenesPersonalizados: AlmacenStock[] = almacenesPersonalizados,
    ) => {
        activeRequestRef.current?.abort();
        const controller = new AbortController();
        activeRequestRef.current = controller;
        const requestSequence = ++requestSequenceRef.current;
        const almacenesIncluidos = getAlmacenesIncluidos(
            nextAlcance,
            nextAlmacenesPersonalizados,
        );
        const requestSearchTerm = searchTerm;
        const requestTipoBusqueda = tipoBusqueda;

        setLoadingProductos(true);
        try {
            const response = await axios.get<InventarioConsolidadoPageDTO>(
                endPoints.inventario_consolidado,
                {
                    params: {
                        searchTerm: requestSearchTerm,
                        tipoBusqueda: requestTipoBusqueda,
                        page,
                        size: pageSizeRef.current,
                        alcance: nextAlcance,
                        almacenes:
                            nextAlcance === 'PERSONALIZADO'
                                ? almacenesIncluidos.join(',')
                                : undefined,
                    },
                    signal: controller.signal,
                },
            );

            if (requestSequence !== requestSequenceRef.current) {
                return;
            }

            setProductos(response.data.content);
            setPageProductos(response.data.number);
            setTotalPagesProductos(response.data.totalPages);
            setFechaHoraCorte(response.data.fechaHoraCorte);
            setAppliedSearch({
                searchTerm: requestSearchTerm,
                tipoBusqueda: requestTipoBusqueda,
                alcance: response.data.alcance,
                almacenes: response.data.almacenesIncluidos,
            });
            setHasSearched(true);
        } catch (error) {
            if (axios.isCancel(error) || controller.signal.aborted) {
                return;
            }

            if (requestSequence === requestSequenceRef.current) {
                setProductos([]);
                setPageProductos(0);
                setTotalPagesProductos(0);
                setFechaHoraCorte(null);
                setAppliedSearch(null);
                toast({
                    title: 'No fue posible consultar el inventario',
                    description: 'Revisa la conexión e intenta nuevamente.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        } finally {
            if (requestSequence === requestSequenceRef.current) {
                setLoadingProductos(false);
            }
        }
    };

    const handlePageSizeChange = (size: number) => {
        pageSizeRef.current = size;
        setPageSize(size);
    };

    const handleScopeChange = (nextAlcance: AlcanceStock) => {
        setAlcance(nextAlcance);
        setPageProductos(0);
        if (hasSearched || loadingProductos) {
            void handleSearch(0, nextAlcance, almacenesPersonalizados);
        }
    };

    const handleToggleAlmacen = (almacen: AlmacenStock) => {
        const isSelected = almacenesPersonalizados.includes(almacen);
        const nextAlmacenes = isSelected
            ? almacenesPersonalizados.filter((item) => item !== almacen)
            : TODOS_LOS_ALMACENES.filter(
                (item) => item === almacen || almacenesPersonalizados.includes(item),
            );

        if (nextAlmacenes.length === 0) {
            toast({
                title: 'Selecciona al menos un almacén',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setAlmacenesPersonalizados(nextAlmacenes);
        setPageProductos(0);
        if (hasSearched || loadingProductos) {
            void handleSearch(0, 'PERSONALIZADO', nextAlmacenes);
        }
    };

    const onKeyPressInputBuscar = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            void handleSearch(0);
        }
    };

    const handlePageChangeProductos = (page: number) => {
        void handleSearch(page);
    };

    const handleDownloadInventario = async () => {
        const almacenesIncluidos = getAlmacenesIncluidos(
            alcance,
            almacenesPersonalizados,
        );
        const exportSearch = appliedSearch ?? {
            searchTerm,
            tipoBusqueda,
            alcance,
            almacenes: almacenesIncluidos,
        };
        setDownloadingInventario(true);
        try {
            const response = await axios.post(
                endPoints.exportar_inventario_excel,
                {
                    searchTerm: exportSearch.searchTerm,
                    tipoBusqueda: exportSearch.tipoBusqueda,
                    alcance: exportSearch.alcance,
                    almacenes:
                        exportSearch.alcance === 'PERSONALIZADO'
                            ? exportSearch.almacenes
                            : [],
                },
                { responseType: 'blob' },
            );
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'inventario.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
        } catch (error) {
            console.error('Error downloading inventory Excel:', error);
            toast({
                title: 'No fue posible descargar el reporte',
                description: 'Intenta nuevamente en unos momentos.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setDownloadingInventario(false);
        }
    };

    const almacenesIncluidos = getAlmacenesIncluidos(
        alcance,
        almacenesPersonalizados,
    );
    const descripcionAlcance = `Incluye ${almacenesIncluidos
        .map((almacen) => ALMACEN_LABELS[almacen])
        .join(', ')}.`;

    return (
        <>
            <Container minW={['auto', 'container.lg', 'container.xl']} w="full" h="full">
                <VStack h="full" w="full" align="stretch" gap={4}>
                    <Box w="full" borderWidth="1px" borderRadius="md" p={{ base: 3, md: 4 }}>
                        <Text fontSize="lg" fontWeight="bold" mb={3}>
                            Inventario consolidado
                        </Text>
                        <Flex
                            direction={{ base: 'column', md: 'row' }}
                            justify="space-between"
                            align={{ base: 'stretch', md: 'flex-start' }}
                            gap={4}
                        >
                            <Field.Root maxW={{ base: 'full', md: '520px' }}>
                                <Field.Label mb={1}>Alcance del stock</Field.Label>
                                <HStack align="stretch">
                                    <NativeSelect.Root>
                                        <NativeSelect.Field
                                            value={alcance}
                                            onChange={(event) =>
                                                handleScopeChange(event.target.value as AlcanceStock)
                                            }>
                                            <option value="FISICO_TOTAL">Inventario físico total</option>
                                            <option value="DISPONIBLE_OPERATIVO">Disponible operativo</option>
                                            <option value="RESTRINGIDO">
                                                Stock restringido/no disponible
                                            </option>
                                            <option value="PERSONALIZADO">Personalizado</option>
                                        </NativeSelect.Field>
                                        <NativeSelect.Indicator />
                                    </NativeSelect.Root>
                                    <IconButton
                                        aria-label="Explicar los alcances del stock"
                                        variant="outline"
                                        onClick={helpModal.onOpen}><LuHelpCircle /></IconButton>
                                </HStack>
                                <Field.HelperText>{descripcionAlcance}</Field.HelperText>
                            </Field.Root>

                            <Box textAlign={{ base: 'left', md: 'right' }}>
                                <Text fontSize="sm" color="gray.500">
                                    Fecha y hora de corte
                                </Text>
                                <Text fontWeight="semibold">
                                    {loadingProductos
                                        ? 'Actualizando…'
                                        : formatFechaHoraCorte(fechaHoraCorte)}
                                </Text>
                            </Box>
                        </Flex>

                        {alcance === 'PERSONALIZADO' && (
                            <Box mt={4}>
                                <Text fontSize="sm" fontWeight="semibold" mb={2}>
                                    Almacenes incluidos
                                </Text>
                                <Wrap spacingX={6} spacingY={2}>
                                    {TODOS_LOS_ALMACENES.map((almacen) => (
                                        <WrapItem key={almacen}>
                                            <Checkbox.Root
                                                checked={almacenesPersonalizados.includes(almacen)}
                                                onCheckedChange={() => handleToggleAlmacen(almacen)}
                                            ><Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Label>
                                                {ALMACEN_LABELS[almacen]}
                                            </Checkbox.Label></Checkbox.Root>
                                        </WrapItem>
                                    ))}
                                </Wrap>
                            </Box>
                        )}
                    </Box>

                    <Field.Root>
                        <Stack direction={{ base: 'column', lg: 'row' }} gap={2}>
                            <Input
                                placeholder="Buscar producto por nombre o ID"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                onKeyDown={onKeyPressInputBuscar}
                            />
                            <NativeSelect.Root>
                                <NativeSelect.Field
                                    value={tipoBusqueda}
                                    onChange={(event) => setTipoBusqueda(event.target.value)}
                                    w={{ base: 'full', lg: '150px' }}
                                    flexShrink={0}>
                                    <option value="NOMBRE">Nombre</option>
                                    <option value="ID">ID</option>
                                </NativeSelect.Field>
                                <NativeSelect.Indicator />
                            </NativeSelect.Root>
                            <Button
                                onClick={() => void handleSearch(0)}
                                loading={loadingProductos}
                                loadingText="Buscando"
                                flexShrink={0}
                            >
                                Buscar
                            </Button>
                            <Button
                                colorPalette="teal"
                                onClick={handleDownloadInventario}
                                loading={downloadingInventario}
                                disabled={loadingProductos}
                                loadingText="Generando"
                                flexShrink={0}
                            >
                                Reporte inventario
                            </Button>
                        </Stack>
                    </Field.Root>

                    <Box w="full">
                        <ListaProductos
                            productos={productos}
                            loadingProductos={loadingProductos}
                            pageProductos={pageProductos}
                            totalPagesProductos={totalPagesProductos}
                            handlePageChangeProductos={handlePageChangeProductos}
                            pageSize={pageSize}
                            onPageSizeChange={handlePageSizeChange}
                        />
                    </Box>
                </VStack>
            </Container>

            <AlcanceStockHelpModal
                isOpen={helpModal.open}
                onClose={helpModal.onClose}
            />
        </>
    );
}

export default InventarioConsolidadoTab;
