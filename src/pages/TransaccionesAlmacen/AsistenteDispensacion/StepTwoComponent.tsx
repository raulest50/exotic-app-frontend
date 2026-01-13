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
    Tr,
    Tag,
    Collapse
} from '@chakra-ui/react';
import React, {useState, useMemo} from 'react';
import {FaChevronDown, FaChevronUp} from 'react-icons/fa';
import {DispensacionDTO, InsumoDesglosado, LoteSeleccionado} from '../types';
import {LotePickerDispensacion} from './AsistenteDispensacionComponents/LotePickerDispensacion';
import {InsumoWithStock} from '../../Produccion/types';

interface Props {
    setActiveStep: (step:number)=>void;
    dispensacion: DispensacionDTO | null;
    setDispensacion: (dto: DispensacionDTO) => void;
    insumosDesglosados?: InsumoDesglosado[];
    ordenProduccionId?: number | null;
    lotesPorMaterial?: Map<string, LoteSeleccionado[]>;
    setLotesPorMaterial?: (lotes: Map<string, LoteSeleccionado[]>) => void;
    insumosAnidados?: any[];
    productoId?: string | null;
}

type InsumoWithStockResponse = Omit<InsumoWithStock, 'tipo_producto' | 'subInsumos'> & {
    tipo_producto?: string;
    tipoProducto?: string;
    tipoUnidades?: string;
    subInsumos?: InsumoWithStockResponse[];
};

export default function StepTwoComponent({
    setActiveStep, 
    dispensacion, 
    setDispensacion, 
    insumosDesglosados, 
    ordenProduccionId, 
    lotesPorMaterial: lotesPorMaterialProp, 
    setLotesPorMaterial: setLotesPorMaterialProp,
    insumosAnidados = [],
    productoId
}: Props){
    // Estado para lotes seleccionados por material (key: productoId)
    // Si viene como prop, usarlo; sino crear estado local
    const [lotesPorMaterialLocal, setLotesPorMaterialLocal] = useState<Map<string, LoteSeleccionado[]>>(new Map());
    const lotesPorMaterial = lotesPorMaterialProp || lotesPorMaterialLocal;
    const setLotesPorMaterial = setLotesPorMaterialProp || setLotesPorMaterialLocal;
    
    const [modalAbierto, setModalAbierto] = useState<{productoId: string; productoNombre: string; cantidadRequerida: number} | null>(null);
    
    // Estado para controlar qué semiterminados están expandidos
    const [expandedSemiterminados, setExpandedSemiterminados] = useState<Record<string, boolean>>({});

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

    // Función para normalizar insumos anidados del backend
    const normalizeInsumo = (insumo: InsumoWithStockResponse): InsumoWithStock => ({
        ...insumo,
        tipo_producto: insumo.tipo_producto ?? insumo.tipoProducto ?? '',
        tipoUnidades: insumo.tipoUnidades ?? 'KG',
        subInsumos: (insumo.subInsumos ?? []).map(normalizeInsumo)
    });

    // Función para fusionar estructura anidada con datos planos
    const mergeInsumosData = (
        nestedInsumos: InsumoWithStock[], 
        flatInsumos: InsumoDesglosado[]
    ): InsumoDesglosado[] => {
        // Crear un mapa de datos planos por productoId para acceso rápido
        const flatMap = new Map<string, InsumoDesglosado>();
        flatInsumos.forEach(insumo => {
            flatMap.set(insumo.productoId, insumo);
        });

        // Función recursiva para fusionar
        const mergeRecursive = (nested: InsumoWithStock[]): InsumoDesglosado[] => {
            return nested.map(insumo => {
                const flatData = flatMap.get(String(insumo.productoId));
                // Obtener inventareable del insumo anidado (si tiene) o del plano, con default true
                const inventareable = flatData?.inventareable ?? (insumo as any).inventareable ?? true;
                const merged: InsumoDesglosado = {
                    productoId: String(insumo.productoId),
                    productoNombre: insumo.productoNombre,
                    cantidadTotalRequerida: flatData?.cantidadTotalRequerida ?? insumo.cantidadRequerida,
                    tipoUnidades: flatData?.tipoUnidades ?? insumo.tipoUnidades ?? 'KG',
                    tipoProducto: flatData?.tipoProducto ?? (insumo.tipo_producto === 'S' ? 'SEMITERMINADO' : 'MATERIAL'),
                    tipo_producto: insumo.tipo_producto,
                    seguimientoId: flatData?.seguimientoId,
                    lotesSeleccionados: flatData?.lotesSeleccionados,
                    inventareable: inventareable,
                    subInsumos: insumo.subInsumos && insumo.subInsumos.length > 0 
                        ? mergeRecursive(insumo.subInsumos) 
                        : undefined
                };
                return merged;
            });
        };

        return mergeRecursive(nestedInsumos);
    };

    // Procesar insumos: usar estructura anidada si está disponible, sino usar plana
    const insumosProcesados = useMemo(() => {
        if (insumosAnidados && insumosAnidados.length > 0 && insumosDesglosados && insumosDesglosados.length > 0) {
            const normalized = insumosAnidados.map(normalizeInsumo);
            return mergeInsumosData(normalized, insumosDesglosados);
        }
        // Fallback a estructura plana
        return insumosDesglosados || [];
    }, [insumosAnidados, insumosDesglosados]);

    // Función para determinar si un insumo es un semiterminado
    const esSemiterminado = (insumo: InsumoDesglosado): boolean => {
        return insumo.tipo_producto === 'S' || insumo.tipoProducto === 'SEMITERMINADO';
    };

    // Función para determinar si un insumo es inventariable
    const esInventariable = (insumo: InsumoDesglosado): boolean => {
        // Si inventareable es undefined o null, asumir true (comportamiento por defecto)
        return insumo.inventareable !== false;
    };

    // Función para manejar el clic en el botón de expandir/colapsar
    const toggleSemiterminado = (productoId: string) => {
        setExpandedSemiterminados(prev => ({
            ...prev,
            [productoId]: !prev[productoId]
        }));
    };

    // Componente recursivo para renderizar insumos y sus subinsumos
    const renderInsumoRecursivo = (insumo: InsumoDesglosado, nivel: number = 0, parentId: string = '') => {
        const reactKey = `${parentId}-${insumo.productoId}`;
        const esSemi = esSemiterminado(insumo);
        const tieneSubInsumos = insumo.subInsumos && insumo.subInsumos.length > 0;
        const isExpanded = expandedSemiterminados[insumo.productoId] || false;
        const lotesSeleccionados = lotesPorMaterial.get(insumo.productoId) || [];
        const esMaterial = !esSemi && !tieneSubInsumos; // Solo materiales (leaf nodes) pueden tener lotes
        const esInvent = esInventariable(insumo); // Verificar si es inventariable

        const elements = [];

        // Añadir la fila principal
        elements.push(
            <Tr 
                key={`row-${reactKey}`}
                bg={esSemi ? `purple.${50 + nivel * 10}` : undefined}
                borderLeftWidth={esSemi ? "4px" : "0"}
                borderLeftColor="purple.400"
                cursor={(esSemi && tieneSubInsumos) ? "pointer" : "default"}
                _hover={(esSemi && tieneSubInsumos) ? { bg: "purple.100" } : { bg: "gray.100" }}
                onClick={(e) => {
                    if (esSemi && tieneSubInsumos) {
                        toggleSemiterminado(insumo.productoId);
                    }
                }}
            >
                <Td>{insumo.productoId}</Td>
                <Td fontWeight="medium">
                    {nivel > 0 && <Box as="span" ml={`${nivel * 0.5}rem`} />}
                    {insumo.productoNombre}
                    {esSemi && (
                        <Tag ml={2} size="sm" colorScheme="purple">
                            Semiterminado
                        </Tag>
                    )}
                    {!esInvent && (
                        <Tag ml={2} size="sm" colorScheme="gray" variant="outline">
                            No inventariable
                        </Tag>
                    )}
                </Td>
                <Td>{insumo.cantidadTotalRequerida.toFixed(2)}</Td>
                <Td>{insumo.tipoUnidades}</Td>
                <Td>
                    {esMaterial && esInvent ? (
                        <Button
                            size='sm'
                            colorScheme='teal'
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAbrirModal(insumo);
                            }}
                        >
                            Definir Lotes
                        </Button>
                    ) : esMaterial && !esInvent ? (
                        <Text fontSize='xs' color='gray.500' fontStyle='italic'>
                            No requiere lote
                        </Text>
                    ) : (
                        esSemi && tieneSubInsumos && (
                            <Box color="purple.500" display="inline-flex" alignItems="center">
                                {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                            </Box>
                        )
                    )}
                </Td>
            </Tr>
        );

        // Añadir subrows para lotes seleccionados (solo para materiales)
        if (esMaterial && lotesSeleccionados.length > 0) {
            lotesSeleccionados.forEach((lote) => {
                elements.push(
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
                );
            });
        }

        // Añadir la fila de subinsumos si es necesario
        if (tieneSubInsumos && isExpanded) {
            elements.push(
                <Tr key={`subrow-${reactKey}`}>
                    <Td colSpan={5} p={0}>
                        <Collapse in={isExpanded} animateOpacity>
                            <Box 
                                p={4} 
                                bg="gray.50" 
                                borderWidth="1px" 
                                borderColor="purple.200"
                                borderRadius="md"
                                m={2}
                            >
                                <Table variant="simple" size="sm" colorScheme="purple">
                                    <Thead bg="purple.100">
                                        <Tr>
                                            <Th>ID Producto</Th>
                                            <Th>Componente</Th>
                                            <Th>Cantidad Requerida</Th>
                                            <Th>Unidad</Th>
                                            <Th>Acción</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {insumo.subInsumos?.map(subInsumo => 
                                            renderInsumoRecursivo(subInsumo, nivel + 1, insumo.productoId)
                                        )}
                                    </Tbody>
                                </Table>
                            </Box>
                        </Collapse>
                    </Td>
                </Tr>
            );
        }

        return <>{elements}</>;
    };

    // Si hay insumos desglosados, mostrar esos; sino, usar el sistema anterior
    if(insumosProcesados && insumosProcesados.length > 0) {
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
                                {insumosProcesados.length === 0 ? (
                                    <Tr>
                                        <Td colSpan={5} textAlign='center' py={4}>
                                            <Text>No hay materiales registrados</Text>
                                        </Td>
                                    </Tr>
                                ) : (
                                    insumosProcesados.map((insumo) => 
                                        <React.Fragment key={insumo.productoId}>
                                            {renderInsumoRecursivo(insumo)}
                                        </React.Fragment>
                                    )
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
