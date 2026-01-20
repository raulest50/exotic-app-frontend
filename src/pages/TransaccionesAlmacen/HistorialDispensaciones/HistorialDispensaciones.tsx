import { useState } from 'react';
import { Flex, Text, Alert, AlertIcon, Box, Container, StepDescription, StepNumber, StepSeparator, StepStatus, Button, Heading, Spinner } from '@chakra-ui/react';
import { Step, StepIcon, StepIndicator, Stepper, StepTitle } from '@chakra-ui/icons';
import { useSteps } from '@chakra-ui/react';
import { FiltroHistorialDispensaciones } from './FiltroHistorialDispensaciones.tsx';
import TablaDispensaciones from './TablaDispensaciones.tsx';
import BetterPagination from '../../../components/BetterPagination/BetterPagination.tsx';
import { TransaccionAlmacen, PaginatedResponse, FiltroHistDispensacionDTO } from './types';
import { DispensacionDTO, InsumoDesglosado, LoteSeleccionado, InsumosDesglosadosResponse } from '../types';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import { useToast } from '@chakra-ui/react';
import DispensacionAdicionalStep1EditItems from './DispensacionAdicionalStep1EditItems.tsx';
import DispensacionAdicionalStep2ReviewSubmit from './DispensacionAdicionalStep2ReviewSubmit.tsx';

const endpoints = new EndPointsURL();

const steps = [
    {title:'Primero', description:'Orden Seleccionada'},
    {title:'Segundo', description:'Editar Dispensación'},
    {title:'Tercero', description:'Revisar y Enviar'}
];

export function HistorialDispensaciones() {
    const toast = useToast();
    const [dispensaciones, setDispensaciones] = useState<TransaccionAlmacen[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(0);
    const [size, setSize] = useState<number>(10);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [filtroActual, setFiltroActual] = useState<FiltroHistDispensacionDTO | null>(null);
    
    // Estados para dispensación adicional
    const [showDispensacionAdicional, setShowDispensacionAdicional] = useState<boolean>(false);
    const [ordenProduccionIdSeleccionada, setOrdenProduccionIdSeleccionada] = useState<number | null>(null);
    const [dispensacionAdicional, setDispensacionAdicional] = useState<DispensacionDTO | null>(null);
    const [insumosDesglosadosAdicional, setInsumosDesglosadosAdicional] = useState<InsumoDesglosado[]>([]);
    const [insumosAnidadosAdicional, setInsumosAnidadosAdicional] = useState<any[]>([]);
    const [productoIdAdicional, setProductoIdAdicional] = useState<string | null>(null);
    const [insumosEmpaqueAdicional, setInsumosEmpaqueAdicional] = useState<InsumoDesglosado[]>([]);
    const [lotesPorMaterialAdicional, setLotesPorMaterialAdicional] = useState<Map<string, LoteSeleccionado[]>>(new Map());
    const [lotesPorMaterialEmpaqueAdicional, setLotesPorMaterialEmpaqueAdicional] = useState<Map<string, LoteSeleccionado[]>>(new Map());
    const [loadingInsumos, setLoadingInsumos] = useState<boolean>(false);
    
    const {activeStep, setActiveStep} = useSteps({index:0, count:steps.length});

    const buscarDispensaciones = async (filtro: FiltroHistDispensacionDTO, pagina: number = 0, tamanoPagina: number = size) => {
        setLoading(true);
        setError(null);

        try {
            const filtroConPagina = {
                ...filtro,
                page: pagina,
                size: tamanoPagina,
            };

            const response = await axios.post<PaginatedResponse<TransaccionAlmacen>>(
                endpoints.historial_dispensacion_filter,
                filtroConPagina,
                { withCredentials: true }
            );

            setDispensaciones(response.data.content ?? []);
            setTotalPages(response.data.totalPages ?? 0);
            setPage(pagina);
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Error al buscar dispensaciones';
            setError(errorMessage);
            toast({
                title: 'Error',
                description: errorMessage,
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            setDispensaciones([]);
            setTotalPages(0);
        } finally {
            setLoading(false);
        }
    };

    const handleBuscar = (filtro: FiltroHistDispensacionDTO) => {
        setFiltroActual(filtro);
        buscarDispensaciones(filtro, 0);
    };

    const handleLimpiar = () => {
        setDispensaciones([]);
        setTotalPages(0);
        setPage(0);
        setError(null);
        setFiltroActual(null);
    };

    const handlePageChange = (newPage: number) => {
        if (filtroActual) {
            buscarDispensaciones(filtroActual, newPage);
        }
    };

    const handleSizeChange = (newSize: number) => {
        setSize(newSize);
        if (filtroActual) {
            buscarDispensaciones(filtroActual, 0, newSize); // Reset to first page with new size
        }
    };

    const handleDispensacionAdicional = async (transaccionId: number, ordenProduccionId: number) => {
        setOrdenProduccionIdSeleccionada(ordenProduccionId);
        setLoadingInsumos(true);
        setShowDispensacionAdicional(true);
        setActiveStep(0);
        
        try {
            // Llamar al endpoint para obtener insumos desglosados (incluye materiales de empaque)
            const endpoint = endpoints.insumos_desglosados_orden.replace('{ordenProduccionId}', ordenProduccionId.toString());
            const resp = await axios.get<InsumosDesglosadosResponse>(endpoint, {withCredentials: true});
            
            // Separar insumos de receta e insumos de empaque
            setInsumosDesglosadosAdicional(resp.data.insumosReceta || []);
            setInsumosEmpaqueAdicional(resp.data.insumosEmpaque || []);
            
            // Intentar obtener estructura anidada si hay insumos
            if (resp.data.insumosReceta && resp.data.insumosReceta.length > 0) {
                // Intentar obtener el productoId de la orden para obtener estructura anidada
                // Por ahora, intentar obtener estructura anidada si es posible
                try {
                    // Necesitamos el productoId de la orden - intentar obtenerlo desde el endpoint de órdenes
                    // Por ahora, continuamos sin estructura anidada si no está disponible
                    setInsumosAnidadosAdicional([]);
                } catch (nestedErr) {
                    console.warn('No se pudo obtener estructura anidada:', nestedErr);
                    setInsumosAnidadosAdicional([]);
                }
            }
            
            // Crear un DispensacionDTO básico
            setDispensacionAdicional({ordenProduccionId: ordenProduccionId, items: []});
            
            // Avanzar al paso 1 después de cargar
            setActiveStep(1);
        } catch (err: any) {
            console.error('Error fetching insumos desglosados:', err);
            toast({
                title: 'Error al cargar insumos',
                description: err.response?.data?.message || 'No fue posible obtener la lista de materiales necesarios.',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            setShowDispensacionAdicional(false);
        } finally {
            setLoadingInsumos(false);
        }
    };

    const handleCancelarDispensacionAdicional = () => {
        setShowDispensacionAdicional(false);
        setOrdenProduccionIdSeleccionada(null);
        setDispensacionAdicional(null);
        setInsumosDesglosadosAdicional([]);
        setInsumosAnidadosAdicional([]);
        setProductoIdAdicional(null);
        setInsumosEmpaqueAdicional([]);
        setLotesPorMaterialAdicional(new Map());
        setLotesPorMaterialEmpaqueAdicional(new Map());
        setActiveStep(0);
    };

    const handleCompletarDispensacionAdicional = () => {
        // Refrescar la lista de dispensaciones
        if (filtroActual) {
            buscarDispensaciones(filtroActual, page, size);
        }
        handleCancelarDispensacionAdicional();
    };

    // Renderizar paso del stepper
    const renderStep = () => {
        if (activeStep === 0) {
            // Paso 1: Mostrar información de la orden seleccionada
            return (
                <Box p='1em' bg='orange.50'>
                    <Flex direction='column' gap={4} align='center'>
                        <Heading fontFamily='Comfortaa Variable' color='orange.700'>Orden de Producción Seleccionada</Heading>
                        {loadingInsumos ? (
                            <Flex direction='column' align='center' gap={4}>
                                <Spinner size='xl' color='orange.500' />
                                <Text>Cargando materiales...</Text>
                            </Flex>
                        ) : (
                            <>
                                <Text fontSize='lg'>
                                    <strong>ID Orden:</strong> {ordenProduccionIdSeleccionada}
                                </Text>
                                <Text fontSize='sm' color='gray.600'>
                                    Los materiales han sido cargados. Puede continuar al siguiente paso.
                                </Text>
                                <Flex w='40%' gap={4}>
                                    <Button flex='1' onClick={handleCancelarDispensacionAdicional}>Cancelar</Button>
                                    <Button flex='1' colorScheme='orange' onClick={() => setActiveStep(1)}>Continuar</Button>
                                </Flex>
                            </>
                        )}
                    </Flex>
                </Box>
            );
        }
        if (activeStep === 1) {
            return (
                <DispensacionAdicionalStep1EditItems
                    setActiveStep={setActiveStep} 
                    dispensacion={dispensacionAdicional} 
                    setDispensacion={setDispensacionAdicional}
                    insumosDesglosados={insumosDesglosadosAdicional}
                    ordenProduccionId={ordenProduccionIdSeleccionada}
                    lotesPorMaterial={lotesPorMaterialAdicional}
                    setLotesPorMaterial={setLotesPorMaterialAdicional}
                    insumosAnidados={insumosAnidadosAdicional}
                    productoId={productoIdAdicional}
                    insumosEmpaque={insumosEmpaqueAdicional}
                    lotesPorMaterialEmpaque={lotesPorMaterialEmpaqueAdicional}
                    setLotesPorMaterialEmpaque={setLotesPorMaterialEmpaqueAdicional}
                />
            );
        }
        if (activeStep === 2) {
            return (
                <DispensacionAdicionalStep2ReviewSubmit
                    setActiveStep={setActiveStep} 
                    dispensacion={dispensacionAdicional}
                    insumosDesglosados={insumosDesglosadosAdicional}
                    ordenProduccionId={ordenProduccionIdSeleccionada}
                    lotesPorMaterial={lotesPorMaterialAdicional}
                    insumosEmpaque={insumosEmpaqueAdicional}
                    lotesPorMaterialEmpaque={lotesPorMaterialEmpaqueAdicional}
                    onComplete={handleCompletarDispensacionAdicional}
                />
            );
        }
        return null;
    };

    // Si se está mostrando el asistente de dispensación adicional, mostrar el stepper
    if (showDispensacionAdicional) {
        return (
            <Container minW={['auto','container.lg','container.xl']} w='full' h='full'>
                <Flex direction='column' gap={4}>
                    <Stepper index={activeStep} p='1em' backgroundColor='orange.50' w='full'>
                        {steps.map((step, index)=>(
                            <Step key={index}>
                                <StepIndicator>
                                    <StepStatus complete={<StepIcon />} incomplete={<StepNumber />} active={<StepNumber />}/>
                                </StepIndicator>
                                <Box flexShrink='0'>
                                    <StepTitle>{step.title}</StepTitle>
                                    <StepDescription>{step.description}</StepDescription>
                                </Box>
                                <StepSeparator />
                            </Step>
                        ))}
                    </Stepper>
                    {renderStep()}
                </Flex>
            </Container>
        );
    }

    // Vista normal del historial
    return (
        <Flex direction="column" p={4} gap={4}>
            <FiltroHistorialDispensaciones
                onBuscar={handleBuscar}
                onLimpiar={handleLimpiar}
            />

            {error && (
                <Alert status="error">
                    <AlertIcon />
                    {error}
                </Alert>
            )}

            {dispensaciones.length > 0 || loading ? (
                <>
                    <TablaDispensaciones
                        dispensaciones={dispensaciones}
                        loading={loading}
                        onDispensacionAdicional={handleDispensacionAdicional}
                    />

                    {totalPages > 0 && (
                        <BetterPagination
                            page={page}
                            size={size}
                            totalPages={totalPages}
                            loading={loading}
                            onPageChange={handlePageChange}
                            onSizeChange={handleSizeChange}
                        />
                    )}
                </>
            ) : filtroActual && !loading ? (
                <Text textAlign="center" py={8} color="gray.500">
                    No se encontraron dispensaciones con los filtros seleccionados.
                </Text>
            ) : null}
        </Flex>
    );
}
