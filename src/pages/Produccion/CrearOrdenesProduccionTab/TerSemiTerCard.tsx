import {
    Card,
    HStack,
    IconButton,
    Heading,
    VStack,
    Text,
    Flex,
    Box,
    Tag,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableContainer,
    Spinner,
    Collapsible,
    Button,
    Separator,
} from '@chakra-ui/react';
import { FaSearch, FaChevronDown, FaChevronUp, FaList } from 'react-icons/fa';
import { ProductoWithInsumos, InsumoWithStock } from '../types.tsx';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';

interface TerSemiTerCardProps {
    productoSeleccionado: ProductoWithInsumos | null;
    canProduce: boolean;
    onSearchClick: () => void;
    cantidadAProducir?: number;
}

type InsumoWithStockResponse = Omit<InsumoWithStock, 'tipo_producto' | 'subInsumos'> & {
    tipo_producto?: string;
    tipoProducto?: string;
    tipoUnidades?: string;
    subInsumos?: InsumoWithStockResponse[];
};

const TerSemiTerCard = ({ productoSeleccionado, canProduce, onSearchClick, cantidadAProducir = 1 }: TerSemiTerCardProps) => {
    const producto = productoSeleccionado?.producto;
    const insumos = productoSeleccionado?.insumos ?? [];
    const endPoints = new EndPointsURL();

    // Estado para controlar qué semiterminados están expandidos
    const [expandedSemiterminados, setExpandedSemiterminados] = useState<Record<number, boolean>>({});

    // Función para formatear cantidades numéricas
    const formatCantidad = (valor: number): string => {
        // Si es entero, no mostrar decimales
        if (Number.isInteger(valor)) {
            return valor.toLocaleString('es-CO');
        }
        // Si tiene decimales, mostrar hasta 2 significativos (sin ceros finales)
        const formatted = valor.toFixed(2);
        const trimmed = parseFloat(formatted).toString();
        return parseFloat(trimmed).toLocaleString('es-CO', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
    };

    // Función para obtener la unidad de medida (UMB)
    const obtenerUMB = (insumo: InsumoWithStock): string => {
        // Usar el campo tipoUnidades del insumo en lugar de hardcodear "KG"
        return insumo.tipoUnidades || "KG"; // Usar "KG" como fallback si tipoUnidades no está definido
    };

    // Función para calcular la cantidad ajustada según la cantidad a producir
    const calcularCantidadAjustada = (cantidadBase: number): number => {
        return cantidadBase * cantidadAProducir;
    };

    // Verificar si hay suficiente stock para la cantidad ajustada
    const verificarStockSuficiente = (insumo: InsumoWithStock): boolean => {
        const cantidadAjustada = calcularCantidadAjustada(insumo.cantidadRequerida);
        return insumo.stockActual >= cantidadAjustada;
    };


    // Función para determinar si un insumo es un semiterminado
    const esSemiterminado = (insumo: InsumoWithStock): boolean => {
        if (insumo.tipo_producto === 'S') {
            return true;
        }

        // Respaldo para datos antiguos que aún no tengan la clasificación explícita
        return insumo.productoNombre.toUpperCase().includes('SEMI');
    };

    // Función para manejar el clic en el botón de expandir/colapsar
    const toggleSemiterminado = (insumoId: number) => {
        // console.log('INICIO toggleSemiterminado - insumoId:', insumoId);
        // console.log('Estado actual de expandedSemiterminados:', expandedSemiterminados);

        // Encontrar el insumo correspondiente para poder mostrar sus subinsumos
        const insumoClickeado = insumos.find(insumo => insumo.insumoId === insumoId);
        // console.log('Insumo encontrado en insumos principales:', insumoClickeado);

        // Si no se encuentra en los insumos principales, buscar en los subinsumos
        const insumoEnSubinsumos = !insumoClickeado ? 
            insumos.flatMap(insumo => insumo.subInsumos || [])
                  .find(subInsumo => subInsumo.insumoId === insumoId) : null;
        // console.log('Insumo encontrado en subinsumos:', insumoEnSubinsumos);

        // Usar el insumo encontrado (ya sea en insumos principales o subinsumos)
        const insumoFinal = insumoClickeado || insumoEnSubinsumos;

        // Obtener el estado actual de expansión
        const estadoActual = expandedSemiterminados[insumoId] || false;

        // Calcular el nuevo estado (invertir el actual)
        const nuevoEstado = !estadoActual;

        // Imprimir información de depuración
        // console.log('Detalles del insumo clickeado:', {
        //     insumoId,
        //     nombre: insumoFinal?.productoNombre || 'No encontrado',
        //     tipo_producto: insumoFinal?.tipo_producto || 'Desconocido',
        //     estadoActual: estadoActual ? 'Expandido' : 'Colapsado',
        //     nuevoEstado: nuevoEstado ? 'Expandido' : 'Colapsado',
        //     tieneSubInsumos: insumoFinal?.subInsumos?.length > 0,
        //     cantidadSubInsumos: insumoFinal?.subInsumos?.length || 0
        // });

        // if (insumoFinal?.subInsumos?.length) {
        //     console.log('Subinsumos del insumo clickeado:', insumoFinal.subInsumos);
        // }

        // Simplemente cambiar el estado de expandido/colapsado
        setExpandedSemiterminados(prev => {
            const nuevoEstado = { 
                ...prev, 
                [insumoId]: !prev[insumoId] 
            };
            // console.log('Nuevo estado de expandedSemiterminados:', nuevoEstado);
            return nuevoEstado;
        });
    };

    // Componente recursivo para renderizar insumos y sus subinsumos
    const renderInsumoRecursivo = (insumo: InsumoWithStock, nivel: number = 0, parentId: string = '') => {
        // Clave React para el elemento (composite ID)
        const reactKey = `${parentId}-${insumo.insumoId}`;

        // ID real del insumo (usado para el estado de expansión)
        const insumoId = insumo.insumoId;

        const cantidadAjustada = calcularCantidadAjustada(insumo.cantidadRequerida);
        const tieneStock = verificarStockSuficiente(insumo);
        const esSemi = esSemiterminado(insumo);
        const isExpanded = expandedSemiterminados[insumoId] || false;
        const tieneSubInsumos = insumo.subInsumos && insumo.subInsumos.length > 0;

        // Imprimir información de depuración para cada insumo renderizado
        // console.log('Renderizando insumo:', {
        //     reactKey,
        //     insumoId,
        //     nombre: insumo.productoNombre,
        //     esSemi,
        //     tieneSubInsumos,
        //     isExpanded,
        //     expandedState: expandedSemiterminados,
        //     nivel,
        //     parentId
        // });

        // Crear un array de elementos JSX para evitar espacios en blanco
        const elements = [];

        // Añadir la fila principal
        elements.push(
            <Table.Row 
                key={`row-${reactKey}`}
                bg={esSemi ? `purple.${50 + nivel * 10}` : undefined}
                borderLeftWidth={esSemi ? "4px" : "0"}
                borderLeftColor="purple.400"
                // Hacer la fila clickeable solo si es semiterminado y tiene subinsumos
                cursor={(esSemi && tieneSubInsumos) ? "pointer" : "default"}
                // Añadir efecto hover a todas las filas, con un color especial para semiterminados con subinsumos
                _hover={(esSemi && tieneSubInsumos) ? { bg: "purple.100" } : { bg: "gray.100" }}
                // Log de depuración para todos los clicks en filas
                onClick={(e) => {
                    // Log básico para todos los clicks
                    // console.log(`Fila clickeada: ${insumo.productoNombre} (ID: ${insumoId}), esSemi: ${esSemi}, tieneSubInsumos: ${tieneSubInsumos}`);

                    // Solo llamar a toggleSemiterminado si es semiterminado y tiene subinsumos
                    if (esSemi && tieneSubInsumos) {
                        // console.log(`Llamando a toggleSemiterminado para ${insumo.productoNombre} (ID: ${insumoId})`);
                        toggleSemiterminado(insumoId);
                    } else {
                        // console.log(`No se llama a toggleSemiterminado porque ${!esSemi ? 'no es semiterminado' : 'no tiene subinsumos'}`);
                    }
                }}
            >
                <Table.Cell>{insumo.productoId}</Table.Cell>
                <Table.Cell fontWeight="medium">
                    {nivel > 0 && <Box as="span" ml={`${nivel}rem`} />}
                    {insumo.productoNombre}
                    {esSemi && (
                        <Tag.Root ml={2} size="sm" colorPalette="purple">
                            Semiterminado
                        </Tag.Root>
                    )}
                </Table.Cell>
                <Table.Cell>{obtenerUMB(insumo)}</Table.Cell>
                <Table.Cell textAlign='end'>{formatCantidad(insumo.cantidadRequerida)}</Table.Cell>
                <Table.Cell fontWeight="bold" textAlign='end'>{formatCantidad(cantidadAjustada)}</Table.Cell>
                <Table.Cell textAlign='end'>{formatCantidad(insumo.stockActual)}</Table.Cell>
                <Table.Cell>
                    <Tag.Root colorPalette={tieneStock ? 'green' : 'red'}>
                        {tieneStock ? 'Suficiente' : 'Insuficiente'}
                    </Tag.Root>
                </Table.Cell>
                <Table.Cell>
                    {(esSemi && tieneSubInsumos) && (
                        <Box color="purple.500">
                            {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                        </Box>
                    )}
                </Table.Cell>
            </Table.Row>
        );

        // Añadir la fila de subinsumos si es necesario
        if (tieneSubInsumos && isExpanded) {
            elements.push(
                <Table.Row key={`subrow-${reactKey}`}>
                    <Table.Cell colSpan={8} p={0}>
                        <Collapsible.Root open={isExpanded}>
                            <Collapsible.Content>
                                <Box 
                                    p={4} 
                                    bg="gray.50" 
                                    borderWidth="1px" 
                                    borderColor="purple.200"
                                    borderRadius="md"
                                    m={2}
                                >
                                    <Flex align="center" mb={2}>
                                        <FaList color="purple" />
                                        <Text ml={2} fontWeight="bold" color="purple.700">
                                            Componentes del semiterminado
                                        </Text>
                                    </Flex>

                                    <Table.Root variant="simple" size="sm" colorPalette="purple">
                                        <Table.Header bg="purple.100">
                                            <Table.Row>
                                                <Table.ColumnHeader>Código</Table.ColumnHeader>
                                                <Table.ColumnHeader>Componente</Table.ColumnHeader>
                                                <Table.ColumnHeader>UMB</Table.ColumnHeader>
                                                <Table.ColumnHeader textAlign='end'>Cantidad</Table.ColumnHeader>
                                                <Table.ColumnHeader textAlign='end'>Cantidad Total</Table.ColumnHeader>
                                                <Table.ColumnHeader textAlign='end'>Stock</Table.ColumnHeader>
                                                <Table.ColumnHeader>Estado</Table.ColumnHeader>
                                                <Table.ColumnHeader></Table.ColumnHeader>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {insumo.subInsumos?.map(subInsumo => 
                                                renderInsumoRecursivo(subInsumo, nivel + 1, insumoId)
                                            )}
                                        </Table.Body>
                                    </Table.Root>
                                </Box>
                            </Collapsible.Content>
                        </Collapsible.Root>
                    </Table.Cell>
                </Table.Row>
            );
        }

        // Devolver un fragmento con el array de elementos
        return <React.Fragment key={reactKey}>{elements}</React.Fragment>;
    };

    return (
        <Card.Root variant="outline" borderColor="blue.200" w="full">
            <Card.Header bg="blue.50">
                <HStack>
                    <IconButton aria-label="Buscar terminado" onClick={onSearchClick}><FaSearch /></IconButton>
                    <Heading size="sm">
                        {producto ? producto.nombre : 'Selecciona un terminado'}
                    </Heading>
                </HStack>
            </Card.Header>
            <Separator />
            <Card.Body>
                {producto ? (
                    <VStack align="stretch" gap={4}>
                        <VStack align="start" gap={1}>
                            <Text fontSize="sm" fontWeight="medium">
                                Nombre: {producto.nombre}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                                ID: {producto.productoId}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                                Tipo: {producto.tipo_producto}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                                Unidad: {producto.tipoUnidades}
                            </Text>
                            {/* Añadir esta línea para mostrar la categoría */}
                            {producto.categoriaNombre && (
                                <Text fontSize="sm" color="gray.600">
                                    Categoría: {producto.categoriaNombre}
                                </Text>
                            )}
                        </VStack>
                        <Separator />
                        <VStack align="stretch" gap={2}>
                            <Text fontWeight="medium">
                                Insumos requeridos (Cantidad a producir: {cantidadAProducir})
                            </Text>
                            {insumos.length === 0 ? (
                                <Text fontSize="sm" color="gray.500">
                                    No se registran insumos para este producto.
                                </Text>
                            ) : (
                                <Table.ScrollArea>
                                    <Table.Root variant="simple" size="sm">
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.ColumnHeader>Código</Table.ColumnHeader>
                                                <Table.ColumnHeader>Insumo</Table.ColumnHeader>
                                                <Table.ColumnHeader>UMB</Table.ColumnHeader>
                                                <Table.ColumnHeader textAlign='end'>Cantidad Base</Table.ColumnHeader>
                                                <Table.ColumnHeader textAlign='end'>Cantidad Total</Table.ColumnHeader>
                                                <Table.ColumnHeader textAlign='end'>Stock Actual</Table.ColumnHeader>
                                                <Table.ColumnHeader>Estado</Table.ColumnHeader>
                                                <Table.ColumnHeader></Table.ColumnHeader> {/* Columna para el botón de expandir */}
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {insumos.map((insumo) => renderInsumoRecursivo(insumo))}
                                        </Table.Body>
                                    </Table.Root>
                                </Table.ScrollArea>
                            )}
                        </VStack>
                        <Text fontWeight="medium" color={canProduce ? 'green.600' : 'red.600'}>
                            {canProduce
                                ? `Stock suficiente para producir ${cantidadAProducir} unidad(es) de este producto.`
                                : `Stock insuficiente para producir ${cantidadAProducir} unidad(es) de este producto.`}
                        </Text>
                    </VStack>
                ) : (
                    <VStack align="stretch" gap={3}>
                        <Text fontSize="sm" color="gray.600">
                            Aún no se ha seleccionado un producto terminado.
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                            Usa el botón de búsqueda para elegir un producto y ver sus detalles e insumos requeridos.
                        </Text>
                    </VStack>
                )}
            </Card.Body>
        </Card.Root>
    );
};

export default TerSemiTerCard;
