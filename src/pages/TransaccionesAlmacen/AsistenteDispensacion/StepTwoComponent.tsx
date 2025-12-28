import {
    Box,
    Button,
    Flex,
    Heading,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr
} from '@chakra-ui/react';
import {useState} from 'react';
import {DispensacionDTO, InsumoDesglosado, LoteSeleccionado} from '../types';
import {LotePickerDispensacion} from './AsistenteDispensacionComponents/LotePickerDispensacion';

interface Props {
    setActiveStep: (step:number)=>void;
    dispensacion: DispensacionDTO | null;
    setDispensacion: (dto: DispensacionDTO) => void;
    insumosDesglosados?: InsumoDesglosado[];
    ordenProduccionId?: number | null;
    lotesPorMaterial?: Map<string, LoteSeleccionado[]>;
    setLotesPorMaterial?: (lotes: Map<string, LoteSeleccionado[]>) => void;
}

export default function StepTwoComponent({setActiveStep, dispensacion, setDispensacion, insumosDesglosados, ordenProduccionId, lotesPorMaterial: lotesPorMaterialProp, setLotesPorMaterial: setLotesPorMaterialProp}: Props){
    // Estado para lotes seleccionados por material (key: productoId)
    // Si viene como prop, usarlo; sino crear estado local
    const [lotesPorMaterialLocal, setLotesPorMaterialLocal] = useState<Map<string, LoteSeleccionado[]>>(new Map());
    const lotesPorMaterial = lotesPorMaterialProp || lotesPorMaterialLocal;
    const setLotesPorMaterial = setLotesPorMaterialProp || setLotesPorMaterialLocal;
    
    const [modalAbierto, setModalAbierto] = useState<{productoId: string; productoNombre: string; cantidadRequerida: number} | null>(null);

    const handleAbrirModal = (insumo: InsumoDesglosado) => {
        setModalAbierto({
            productoId: insumo.productoId,
            productoNombre: insumo.productoNombre,
            cantidadRequerida: insumo.cantidadTotalRequerida
        });
    };

    const handleCerrarModal = () => {
        setModalAbierto(null);
    };

    const handleAceptarLotes = (productoId: string, lotes: LoteSeleccionado[]) => {
        const nuevoMap = new Map(lotesPorMaterial);
        nuevoMap.set(productoId, lotes);
        setLotesPorMaterial(nuevoMap);
    };

    const formatDate = (date: string | null | undefined): string => {
        if (!date) return 'N/A';
        try {
            return new Date(date).toLocaleDateString('es-ES');
        } catch {
            return 'N/A';
        }
    };

    // Si hay insumos desglosados, mostrar esos; sino, usar el sistema anterior
    if(insumosDesglosados && insumosDesglosados.length > 0) {
        return (
            <Box p='1em' bg='blue.50'>
                <Flex direction='column' gap={4} align='center'>
                    <Heading fontFamily='Comfortaa Variable'>Materiales Necesarios</Heading>
                    <Text fontFamily='Comfortaa Variable' fontSize='sm' color='gray.600'>
                        Lista completa desglosada de materiales base requeridos para la orden de producción
                    </Text>
                    <Box bg='white' borderRadius='md' boxShadow='sm' overflowX='auto' w='full' maxW='1200px'>
                        <Table size='sm'>
                            <Thead>
                                <Tr>
                                    <Th>ID Producto</Th>
                                    <Th>Nombre</Th>
                                    <Th>Cantidad Requerida</Th>
                                    <Th>Unidad</Th>
                                    <Th>Acción</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {insumosDesglosados.length === 0 ? (
                                    <Tr>
                                        <Td colSpan={5} textAlign='center' py={4}>
                                            <Text>No hay materiales registrados</Text>
                                        </Td>
                                    </Tr>
                                ) : (
                                    insumosDesglosados.map((insumo, idx) => {
                                        const lotesSeleccionados = lotesPorMaterial.get(insumo.productoId) || [];
                                        return (
                                            <>
                                                <Tr key={insumo.productoId || idx}>
                                                    <Td>{insumo.productoId}</Td>
                                                    <Td>{insumo.productoNombre}</Td>
                                                    <Td>{insumo.cantidadTotalRequerida.toFixed(2)}</Td>
                                                    <Td>{insumo.tipoUnidades}</Td>
                                                    <Td>
                                                        <Button
                                                            size='sm'
                                                            colorScheme='teal'
                                                            onClick={() => handleAbrirModal(insumo)}
                                                        >
                                                            Definir Lotes
                                                        </Button>
                                                    </Td>
                                                </Tr>
                                                {/* Subrows para mostrar lotes seleccionados */}
                                                {lotesSeleccionados.length > 0 && lotesSeleccionados.map((lote, loteIdx) => (
                                                    <Tr key={`${insumo.productoId}-lote-${lote.loteId}`} bg='gray.50'>
                                                        <Td></Td>
                                                        <Td pl={8} fontSize='xs' color='gray.600'>
                                                            └─ Lote: {lote.batchNumber}
                                                        </Td>
                                                        <Td fontSize='xs' color='gray.600'>
                                                            {lote.cantidad.toFixed(2)}
                                                        </Td>
                                                        <Td fontSize='xs' color='gray.600'>
                                                            {formatDate(lote.expirationDate)}
                                                        </Td>
                                                        <Td></Td>
                                                    </Tr>
                                                ))}
                                            </>
                                        );
                                    })
                                )}
                            </Tbody>
                        </Table>
                    </Box>
                    <Flex w='40%' gap={4}>
                        <Button flex='1' onClick={()=>setActiveStep(0)}>Atrás</Button>
                        <Button 
                            flex='1' 
                            colorScheme='teal' 
                            onClick={() => {
                                // Guardar lotesPorMaterial antes de avanzar
                                if (setLotesPorMaterial) {
                                    setLotesPorMaterial(lotesPorMaterial);
                                }
                                setActiveStep(2);
                            }}
                        >
                            Continuar
                        </Button>
                    </Flex>
                </Flex>

                {/* Modal para seleccionar lotes */}
                {modalAbierto && (
                    <LotePickerDispensacion
                        isOpen={true}
                        onClose={handleCerrarModal}
                        onAccept={(lotes) => handleAceptarLotes(modalAbierto.productoId, lotes)}
                        productoId={modalAbierto.productoId}
                        productoNombre={modalAbierto.productoNombre}
                        cantidadRequerida={modalAbierto.cantidadRequerida}
                    />
                )}
            </Box>
        );
    }

    // Sistema anterior (compatibilidad)
    if(!dispensacion){
        return <Text>No se ha cargado ninguna orden.</Text>;
    }

    return (
        <Box p='1em' bg='blue.50'>
            <Flex direction='column' gap={4} align='center'>
                <Heading fontFamily='Comfortaa Variable'>Dispensación Sugerida</Heading>
                <Text>No hay insumos disponibles para mostrar.</Text>
                <Flex w='40%' gap={4}>
                    <Button flex='1' onClick={()=>setActiveStep(0)}>Atrás</Button>
                    <Button flex='1' colorScheme='teal' onClick={()=>setActiveStep(2)}>Continuar</Button>
                </Flex>
            </Flex>
        </Box>
    );
}
