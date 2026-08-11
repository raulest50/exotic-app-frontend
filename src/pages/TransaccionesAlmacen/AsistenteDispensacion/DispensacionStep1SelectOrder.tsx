import {useEffect, useMemo, useState} from 'react';
import {
    Steps,
    Badge,
    Box,
    Button,
    Flex,
    Heading,
    NativeSelect,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL';
import {CasePackResponseDTO, DispensacionDTO, DispensacionResumenResponse, InsumoDesglosado, ItemPendienteReposicion, LoteSeleccionado, TransaccionAlmacenDetalle} from '../types';
import FiltroODP_AsistDisp from './FiltroODP_AsistDisp';
import {
    getEstadoDispensacionMaterialesColor,
    getEstadoDispensacionMaterialesLabel,
    getPoliticaDispensacionInicioColor,
    getPoliticaDispensacionInicioLabel,
} from '../../Produccion/components/SeguimientoBoardUI';

interface Props {
    setActiveStep: (step:number) => void;
    setDispensacion: (dto: DispensacionDTO) => void;
    setInsumosDesglosados?: (insumos: InsumoDesglosado[]) => void;
    setOrdenProduccionId?: (id: number) => void;
    setInsumosAnidados?: (insumos: any[]) => void;
    setProductoId?: (id: string) => void;
    setInsumosEmpaque?: (insumos: InsumoDesglosado[]) => void;
    setCasePack?: (casePack: CasePackResponseDTO | null) => void;
    setCantidadProducir?: (cantidad: number | null) => void;
    setHistorialDispensaciones?: (historial: TransaccionAlmacenDetalle[]) => void;
    setLotesPorMaterial?: (lotes: Map<string, LoteSeleccionado[]>) => void;
    setLotesPorMaterialEmpaque?: (lotes: Map<string, LoteSeleccionado[]>) => void;
    setItemsPendientesReposicion?: (items: ItemPendienteReposicion[]) => void;
    setLotesPorReposicionAveria?: (lotes: Map<string, LoteSeleccionado[]>) => void;
    refreshToken?: number;
}

interface OrdenDispensacionResumen {
    ordenProduccionId?: number;
    ordenId?: number;
    productoId?: string;
    productoNombre?: string;
    producto?: {nombre?: string};
    cantidadProducir?: number;
    fechaInicio?: string;
    fechaCreacion?: string;
    estado?: string | number;
    estadoOrden?: string | number;
    politicaDispensacionInicio?: string | null;
    fechaAplicacionPoliticaDispensacion?: string | null;
    estadoDispensacionMateriales?: string | null;
    ultimaAreaDispensada?: string;
    loteAsignado?: string;
    items?: DispensacionDTO['items'];
}

interface PaginatedResponse<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
}

export default function DispensacionStep1SelectOrder({setActiveStep, setDispensacion, setInsumosDesglosados, setOrdenProduccionId, setInsumosAnidados, setProductoId, setInsumosEmpaque, setCasePack, setCantidadProducir, setHistorialDispensaciones, setLotesPorMaterial, setLotesPorMaterialEmpaque, setItemsPendientesReposicion, setLotesPorReposicionAveria, refreshToken}: Props){
    const toast = useAppToast();
    const [ordenes, setOrdenes] = useState<OrdenDispensacionResumen[]>([]);
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingOrden, setLoadingOrden] = useState<number | null>(null);
    const endpoints = useMemo(() => new EndPointsURL(), []);

    const [loteFilter, setLoteFilter] = useState<string | undefined>(undefined);

    const fetchOrdenes = async (loteAsignado?: string) => {
        setLoading(true);
        try {
            let endpoint: string;
            if (loteAsignado !== undefined) {
                endpoint = `${endpoints.dispensacion_odp_busqueda_lote}?loteAsignado=${encodeURIComponent(loteAsignado)}&page=${page}&size=${size}`;
            } else {
                endpoint = `${endpoints.dispensacion_odp_consulta}?page=${page}&size=${size}`;
            }
            const resp = await axios.get<PaginatedResponse<OrdenDispensacionResumen>>(endpoint, {withCredentials: true});
            setOrdenes(resp.data.content ?? []);
            setTotalPages(resp.data.totalPages ?? 0);
        } catch (err) {
            toast({title: 'Error al cargar órdenes', description: 'No fue posible obtener las órdenes de producción.', status: 'error', duration: 3000, isClosable: true});
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        setLoteFilter(undefined);
        fetchOrdenes();
    };

    const handleSearchByLote = (lote: string) => {
        setPage(0);
        setLoteFilter(lote);
        fetchOrdenes(lote);
    };

    useEffect(() => {
        fetchOrdenes(loteFilter);
    }, [page, size]);

    useEffect(() => {
        setPage(0);
        setLoteFilter(undefined);
        fetchOrdenes();
    }, [refreshToken]);

    const formatFecha = (fecha?: string) => {
        if(!fecha) return 'N/A';
        const parsed = new Date(fecha);
        return isNaN(parsed.getTime()) ? fecha : parsed.toLocaleString();
    };

    const handleDispensacion = async (orden: OrdenDispensacionResumen) => {
        const ordenId = orden.ordenProduccionId ?? orden.ordenId;
        const productoId = orden.productoId;

        console.log("debug Hacer Dispensacion");
        console.log(orden);

        if(!ordenId){
            toast({title: 'ID no disponible', description: 'La orden seleccionada no tiene un identificador válido.', status: 'warning', duration: 3000, isClosable: true});
            return;
        }
        setLoadingOrden(ordenId);
        try {
            const endpoint = endpoints.dispensacion_resumen_odp.replace('{ordenProduccionId}', ordenId.toString());
            const resp = await axios.get<DispensacionResumenResponse>(endpoint, {withCredentials: true});

            if (setInsumosDesglosados) {
                setInsumosDesglosados(resp.data.insumosReceta || []);
            }
            if (setInsumosEmpaque) {
                setInsumosEmpaque(resp.data.insumosEmpaque || []);
            }
            if (setCasePack) {
                setCasePack(resp.data.casePack ?? null);
            }
            if (setHistorialDispensaciones) {
                setHistorialDispensaciones(resp.data.historialDispensaciones || []);
            }
            if(setOrdenProduccionId) {
                setOrdenProduccionId(ordenId);
            }
            if (setCantidadProducir) {
                setCantidadProducir(orden.cantidadProducir ?? null);
            }
            
            if (setInsumosAnidados) {
                setInsumosAnidados([]);
            }
            if (setProductoId && productoId) {
                setProductoId(productoId);
            }
            
            // También mantener compatibilidad con el sistema anterior si es necesario
            // Por ahora, crear un DispensacionDTO vacío para mantener la estructura
            setDispensacion({ordenProduccionId: ordenId, items: []});

            if (setItemsPendientesReposicion) {
                setItemsPendientesReposicion(resp.data.itemsPendientesReposicion || []);
            }

            // Resetear lotes seleccionados al iniciar nueva dispensación
            if (setLotesPorMaterial) {
                setLotesPorMaterial(new Map());
            }
            if (setLotesPorMaterialEmpaque) {
                setLotesPorMaterialEmpaque(new Map());
            }
            if (setLotesPorReposicionAveria) {
                setLotesPorReposicionAveria(new Map());
            }

            setActiveStep(1);
        } catch (err) {
            console.error('Error fetching insumos desglosados:', err);
            toast({title: 'Error al cargar insumos', description: 'No fue posible obtener la lista de materiales necesarios.', status: 'error', duration: 3000, isClosable: true});
        } finally {
            setLoadingOrden(null);
        }
    };

    const isNextDisabled = useMemo(() => totalPages === 0 || page + 1 >= totalPages, [page, totalPages]);

    return (
        <Box p='1em' backgroundColor='app.stepperBlue'>
            <Flex align='center' justify='space-between' mb={4} gap={4}>
                <Heading fontFamily='Comfortaa Variable' size='md'>Órdenes de Producción abiertas/en progreso</Heading>
                <FiltroODP_AsistDisp 
                    onRefresh={handleRefresh} 
                    onSearchByLote={handleSearchByLote} 
                    isLoading={loading}
                />
            </Flex>
            <Box bg='app.surface' borderRadius='md' boxShadow='sm' overflowX='auto'>
                <Table.Root size='sm'>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader>Lote</Table.ColumnHeader>
                            <Table.ColumnHeader>Producto</Table.ColumnHeader>
                            <Table.ColumnHeader>Fecha</Table.ColumnHeader>
                            <Table.ColumnHeader>Materiales</Table.ColumnHeader>
                            <Table.ColumnHeader>Ultima area dispensada</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign='center'>Acciones</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {ordenes.map((orden, index) => {
                            const ordenId = orden.ordenProduccionId ?? orden.ordenId;
                            return (
                                <Table.Row key={ordenId ?? `orden-${index}`}>
                                    <Table.Cell>{orden.loteAsignado ?? 'N/A'}</Table.Cell>
                                    <Table.Cell>{orden.productoNombre ?? orden.producto?.nombre ?? 'Sin nombre'}</Table.Cell>
                                    <Table.Cell>{formatFecha(orden.fechaInicio ?? orden.fechaCreacion)}</Table.Cell>
                                    <Table.Cell>
                                        <Flex gap={2} wrap='wrap'>
                                            <Badge colorPalette={getEstadoDispensacionMaterialesColor(orden.estadoDispensacionMateriales)}>
                                                {getEstadoDispensacionMaterialesLabel(orden.estadoDispensacionMateriales)}
                                            </Badge>
                                            <Badge colorPalette={getPoliticaDispensacionInicioColor(orden.politicaDispensacionInicio)}>
                                                {getPoliticaDispensacionInicioLabel(orden.politicaDispensacionInicio)}
                                            </Badge>
                                        </Flex>
                                    </Table.Cell>
                                    <Table.Cell>{orden.ultimaAreaDispensada ?? 'Sin dispensacion'}</Table.Cell>
                                    <Table.Cell>
                                        <Flex justify='center'>
                                            <Button colorPalette='teal' size='sm' onClick={() => handleDispensacion(orden)} loading={loadingOrden === ordenId}>
                                                Hacer dispensación
                                            </Button>
                                        </Flex>
                                    </Table.Cell>
                                </Table.Row>
                            );
                        })}
                        {ordenes.length === 0 && (
                            <Table.Row>
                                <Table.Cell colSpan={6}>
                                    <Text textAlign='center' py={4}>{loading ? 'Cargando órdenes...' : 'No hay órdenes disponibles.'}</Text>
                                </Table.Cell>
                            </Table.Row>
                        )}
                    </Table.Body>
                </Table.Root>
            </Box>
            <Flex mt={4} justify='space-between' align='center' gap={4}>
                <Flex align='center' gap={2}>
                    <Text>Tamaño de página:</Text>
                    <NativeSelect.Root>
                        <NativeSelect.Field
                            value={size}
                            onValueChange={(e) => {setPage(0); setSize(parseInt(e.target.value));}}
                            width='80px'>
                            {[5,10,20,50].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                </Flex>
                <Flex align='center' gap={2}>
                    <Button onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={page === 0 || loading}>Anterior</Button>
                    <Text>Pagina {totalPages === 0 ? 0 : page + 1} de {totalPages}</Text>
                    <Button onClick={() => setPage((p) => p + 1)} disabled={loading || isNextDisabled}>Siguiente</Button>
                </Flex>
            </Flex>
        </Box>
    );
}
