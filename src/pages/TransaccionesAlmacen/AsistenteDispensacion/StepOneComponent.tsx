import {useEffect, useMemo, useState} from 'react';
import {
    Box,
    Button,
    Flex,
    Heading,
    Select,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    useToast
} from '@chakra-ui/react';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL';
import {CasePackResponseDTO, DispensacionDTO, DispensacionFormularioDTO, InsumoDesglosado, InsumosDesglosadosResponse} from '../types';
import FiltroODP_AsistDisp from './FiltroODP_AsistDisp';

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
    items?: DispensacionDTO['items'];
}

interface PaginatedResponse<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
}

export default function StepOneComponentV2({setActiveStep, setDispensacion, setInsumosDesglosados, setOrdenProduccionId, setInsumosAnidados, setProductoId, setInsumosEmpaque, setCasePack, setCantidadProducir}: Props){
    const toast = useToast();
    const [ordenes, setOrdenes] = useState<OrdenDispensacionResumen[]>([]);
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingOrden, setLoadingOrden] = useState<number | null>(null);
    const endpoints = useMemo(() => new EndPointsURL(), []);

    const fetchOrdenes = async (ordenId?: number) => {
        setLoading(true);
        try {
            let endpoint = `${endpoints.dispensacion_odp_consulta}?page=${page}&size=${size}`;
            if (ordenId !== undefined) {
                endpoint += `&ordenId=${ordenId}`;
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
        fetchOrdenes();
    };

    const handleSearchById = (ordenId: number) => {
        setPage(0); // Reset to first page when searching
        fetchOrdenes(ordenId);
    };

    useEffect(() => {
        fetchOrdenes();
    }, [page, size]);

    const formatFecha = (fecha?: string) => {
        if(!fecha) return 'N/A';
        const parsed = new Date(fecha);
        return isNaN(parsed.getTime()) ? fecha : parsed.toLocaleString();
    };

    const formatEstado = (estado?: string | number) => {
        if(typeof estado === 'number'){
            if(estado === 0) return 'Abierta';
            if(estado === 1) return 'En progreso';
        }
        return estado ?? 'Desconocido';
    };

    const mapDispensacionFormulario = (data: DispensacionFormularioDTO): DispensacionDTO => {
        const dispensaciones = data.dispensaciones ?? [];
        const lotesRecomendados = data.lotesRecomendados ?? [];
        const items = dispensaciones.map((dispensacion) => {
            const loteRecomendado = lotesRecomendados.find((lote) => lote.seguimientoId === dispensacion.seguimientoId);

            return {
                seguimientoId: dispensacion.seguimientoId,
                producto: dispensacion.producto,
                lote: {
                    loteId: loteRecomendado?.loteId ?? 0,
                    batchNumber: loteRecomendado?.batchNumber ?? 'N/A',
                    cantidadDisponible: loteRecomendado?.cantidadDisponible ?? 0,
                },
                cantidadSugerida: loteRecomendado?.cantidadSugerida ?? 0,
                cantidad: loteRecomendado?.cantidadSugerida ?? 0,
            };
        });

        return {
            ordenProduccionId: data.ordenProduccionId,
            items,
        };
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
            // Llamar al endpoint para obtener insumos desglosados (ahora incluye materiales de empaque)
            const endpoint = endpoints.insumos_desglosados_orden.replace('{ordenProduccionId}', ordenId.toString());
            const resp = await axios.get<InsumosDesglosadosResponse>(endpoint, {withCredentials: true});
            
            // Separar insumos de receta e insumos de empaque
            if(setInsumosDesglosados) {
                setInsumosDesglosados(resp.data.insumosReceta || []);
            }
            if(setInsumosEmpaque) {
                setInsumosEmpaque(resp.data.insumosEmpaque || []);
            }
            if(setOrdenProduccionId) {
                setOrdenProduccionId(ordenId);
            }
            if (setCantidadProducir) {
                setCantidadProducir(orden.cantidadProducir ?? null);
            }
            
            // Si tenemos productoId, obtener estructura anidada para visualización jerárquica
            if (productoId && setInsumosAnidados && setProductoId) {
                try {
                    const nestedEndpoint = endpoints.insumos_with_stock.replace('{id}', encodeURIComponent(productoId));
                    const nestedResp = await axios.get<any[]>(nestedEndpoint, {withCredentials: true});
                    const nestedData = Array.isArray(nestedResp.data) ? nestedResp.data : nestedResp.data?.content ?? [];
                    setInsumosAnidados(nestedData);
                    setProductoId(productoId);
                } catch (nestedErr) {
                    console.warn('No se pudo obtener estructura anidada, se usará estructura plana:', nestedErr);
                    // Continuar sin estructura anidada (fallback a estructura plana)
                    setInsumosAnidados([]);
                }
            }

            if (productoId && setCasePack) {
                try {
                    const casePackEndpoint = endpoints.case_pack_terminado.replace('{id}', encodeURIComponent(productoId));
                    const casePackResp = await axios.get<CasePackResponseDTO>(casePackEndpoint, {withCredentials: true});
                    setCasePack(casePackResp.data ?? null);
                } catch (casePackErr) {
                    console.warn('No se pudo obtener CasePack del terminado:', casePackErr);
                    setCasePack(null);
                }
            }
            
            // También mantener compatibilidad con el sistema anterior si es necesario
            // Por ahora, crear un DispensacionDTO vacío para mantener la estructura
            setDispensacion({ordenProduccionId: ordenId, items: []});
            
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
        <Box p='1em' backgroundColor='blue.50'>
            <Flex align='center' justify='space-between' mb={4} gap={4}>
                <Heading fontFamily='Comfortaa Variable' size='md'>Órdenes de Producción abiertas/en progreso</Heading>
                <FiltroODP_AsistDisp 
                    onRefresh={handleRefresh} 
                    onSearchById={handleSearchById} 
                    isLoading={loading}
                />
            </Flex>
            <Box bg='white' borderRadius='md' boxShadow='sm' overflowX='auto'>
                <Table size='sm'>
                    <Thead>
                        <Tr>
                            <Th>ID</Th>
                            <Th>Producto</Th>
                            <Th>Fecha</Th>
                            <Th>Estado</Th>
                            <Th textAlign='center'>Acciones</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {ordenes.map((orden, index) => {
                            const ordenId = orden.ordenProduccionId ?? orden.ordenId;
                            return (
                                <Tr key={ordenId ?? `orden-${index}`}>
                                    <Td>{ordenId ?? 'N/A'}</Td>
                                    <Td>{orden.productoNombre ?? orden.producto?.nombre ?? 'Sin nombre'}</Td>
                                    <Td>{formatFecha(orden.fechaInicio ?? orden.fechaCreacion)}</Td>
                                    <Td>{formatEstado(orden.estado ?? orden.estadoOrden)}</Td>
                                    <Td>
                                        <Flex justify='center'>
                                            <Button colorScheme='teal' size='sm' onClick={() => handleDispensacion(orden)} isLoading={loadingOrden === ordenId}>
                                                Hacer dispensación
                                            </Button>
                                        </Flex>
                                    </Td>
                                </Tr>
                            );
                        })}
                        {ordenes.length === 0 && (
                            <Tr>
                                <Td colSpan={5}>
                                    <Text textAlign='center' py={4}>{loading ? 'Cargando órdenes...' : 'No hay órdenes disponibles.'}</Text>
                                </Td>
                            </Tr>
                        )}
                    </Tbody>
                </Table>
            </Box>
            <Flex mt={4} justify='space-between' align='center' gap={4}>
                <Flex align='center' gap={2}>
                    <Text>Tamaño de página:</Text>
                    <Select value={size} onChange={(e) => {setPage(0); setSize(parseInt(e.target.value));}} width='80px'>
                        {[5,10,20,50].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </Select>
                </Flex>
                <Flex align='center' gap={2}>
                    <Button onClick={() => setPage((p) => Math.max(p - 1, 0))} isDisabled={page === 0 || loading}>Anterior</Button>
                    <Text>Pagina {totalPages === 0 ? 0 : page + 1} de {totalPages}</Text>
                    <Button onClick={() => setPage((p) => p + 1)} isDisabled={loading || isNextDisabled}>Siguiente</Button>
                </Flex>
            </Flex>
        </Box>
    );
}
