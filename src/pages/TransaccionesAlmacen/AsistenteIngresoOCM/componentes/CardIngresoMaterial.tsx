import { useState, useEffect } from 'react';
import {
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Heading, 
    Text, 
    Flex, 
    Button, 
    IconButton, 
    FormControl, 
    FormLabel, 
    Input, 
    Box,
    Badge,
    useToast,
    Collapse,
    Checkbox
} from '@chakra-ui/react';
import { AddIcon, MinusIcon, ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import { ItemOrdenCompra, Lote, Movimiento, TipoMovimiento, Almacen } from '../../types.tsx';

interface LoteConCantidad extends Lote {
    cantidad: number;
}

interface Props {
    item: ItemOrdenCompra;
    onMovimientosChange: (movimientos: Movimiento[]) => void;
    onExcludedChange?: (excluded: boolean) => void;
    isExcluded?: boolean;
    cantidadYaRecibida?: number;
}

export function CardIngresoMaterial({ item, onMovimientosChange, onExcludedChange, isExcluded = false, cantidadYaRecibida = 0 }: Props) {
    const toast = useToast();
    const maxPermitido = Math.max(item.cantidad - cantidadYaRecibida, 0);
    const [lotes, setLotes] = useState<LoteConCantidad[]>([
        {
            batchNumber: '',
            productionDate: '',
            expirationDate: '',
            cantidad: Math.min(item.cantidad, maxPermitido)
        }
    ]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [excluded, setExcluded] = useState(isExcluded);

    const MAX_LOTES = 3;

    // Actualizar los movimientos cuando cambian los lotes o el estado de exclusión
    useEffect(() => {
        // Si el material está excluido, no generar movimientos
        if (excluded) {
            onMovimientosChange([]);
            return;
        }

        const movimientos: Movimiento[] = lotes
            .filter(lote => lote.cantidad > 0 && lote.expirationDate)
            .map(lote => ({
                cantidad: lote.cantidad,
                producto: item.material,
                tipoMovimiento: TipoMovimiento.COMPRA,
                almacen: Almacen.GENERAL,
                lote: {
                    batchNumber: lote.batchNumber || undefined,
                    productionDate: lote.productionDate,
                    expirationDate: lote.expirationDate
                },
                fechaMovimiento: new Date().toISOString()
            }));

        onMovimientosChange(movimientos);
    }, [lotes, item, onMovimientosChange, excluded]);

    // Notificar al padre cuando cambia el estado de exclusión
    useEffect(() => {
        if (onExcludedChange) {
            onExcludedChange(excluded);
        }
    }, [excluded, onExcludedChange]);

    // Sincronizar con prop externa
    useEffect(() => {
        setExcluded(isExcluded);
    }, [isExcluded]);

    const handleExcludedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newExcluded = e.target.checked;
        setExcluded(newExcluded);
        
        // Si se marca como excluido, colapsar y limpiar lotes
        if (newExcluded) {
            setIsExpanded(false);
            setLotes([{
                batchNumber: '',
                productionDate: '',
                expirationDate: '',
                cantidad: 0
            }]);
        } else {
            setLotes([{
                batchNumber: '',
                productionDate: '',
                expirationDate: '',
                cantidad: Math.min(item.cantidad, maxPermitido)
            }]);
        }
    };

    const handleAddLote = () => {
        if (lotes.length >= MAX_LOTES) {
            toast({
                title: "Límite alcanzado",
                description: `No se pueden agregar más de ${MAX_LOTES} lotes por material.`,
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setLotes([...lotes, {
            batchNumber: '',
            productionDate: '',
            expirationDate: '',
            cantidad: 0
        }]);
    };

    const handleRemoveLote = (index: number) => {
        if (lotes.length <= 1) {
            toast({
                title: "No se puede eliminar",
                description: "Debe haber al menos un lote por material.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        const newLotes = [...lotes];
        newLotes.splice(index, 1);
        setLotes(newLotes);
    };

    const handleLoteChange = (index: number, field: keyof LoteConCantidad, value: string | number) => {
        const newLotes = [...lotes];
        newLotes[index] = {
            ...newLotes[index],
            [field]: value
        };
        setLotes(newLotes);
    };

    const totalCantidad = lotes.reduce((sum, lote) => sum + lote.cantidad, 0);
    const isValid = excluded || (totalCantidad <= maxPermitido + 0.01 && totalCantidad > 0);

    return (
        <>
            <Tr bg={!isValid && !excluded ? "red.50" : excluded ? "gray.100" : "white"}>
                <Td>
                    <Flex align="center" gap={2}>
                        <Checkbox
                            isChecked={excluded}
                            onChange={handleExcludedChange}
                            colorScheme="red"
                        />
                        <Text fontWeight="semibold" as={excluded ? "s" : undefined} color={excluded ? "gray.500" : undefined}>
                            {item.material.nombre}
                        </Text>
                    </Flex>
                </Td>
                <Td>{item.material.productoId}</Td>
                <Td>
                    {item.cantidad} {item.material.tipoUnidades}
                    {cantidadYaRecibida > 0 && (
                        <Text fontSize="xs" color="blue.600">
                            (Recibido: {cantidadYaRecibida.toFixed(2)}, Restante: {maxPermitido.toFixed(2)})
                        </Text>
                    )}
                </Td>
                <Td>
                    {excluded ? (
                        <Badge colorScheme="gray" fontSize="md">
                            Excluido
                        </Badge>
                    ) : (
                        <Badge colorScheme={isValid ? "green" : "red"} fontSize="md">
                            {totalCantidad} {item.material.tipoUnidades}
                        </Badge>
                    )}
                </Td>
                <Td>
                    {excluded ? (
                        <Badge colorScheme="gray">
                            No recibido
                        </Badge>
                    ) : (
                        <Badge colorScheme={isValid ? "green" : "orange"}>
                            {isValid ? "Válido" : "Pendiente"}
                        </Badge>
                    )}
                </Td>
                <Td textAlign="center">
                    {!excluded && (
                        <IconButton
                            aria-label={isExpanded ? "Ocultar lotes" : "Mostrar lotes"}
                            icon={isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                        />
                    )}
                </Td>
            </Tr>
            {!excluded && (
                <Tr>
                    <Td colSpan={6} p={0}>
                        <Collapse in={isExpanded} animateOpacity>
                        <Box p={4} bg="gray.50">
                            <Flex justifyContent="space-between" alignItems="center" mb={4}>
                                <Text fontWeight="semibold">Lotes del Material</Text>
                                <Button
                                    leftIcon={<AddIcon />}
                                    colorScheme="teal"
                                    size="sm"
                                    onClick={handleAddLote}
                                    isDisabled={lotes.length >= MAX_LOTES}
                                >
                                    Agregar Lote
                                </Button>
                            </Flex>
                            
                            <Table size="sm" variant="simple" bg="white">
                                <Thead>
                                    <Tr>
                                        <Th>Lote #</Th>
                                        <Th>Batch Number</Th>
                                        <Th>Fecha Fabricación</Th>
                                        <Th>Fecha Vencimiento</Th>
                                        <Th>Cantidad</Th>
                                        <Th textAlign="center">Acciones</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {lotes.map((lote, index) => (
                                        <Tr key={index}>
                                            <Td fontWeight="semibold">{index + 1}</Td>
                                            <Td>
                                                <Input
                                                    type="text"
                                                    size="sm"
                                                    value={lote.batchNumber || ''}
                                                    onChange={(e) => handleLoteChange(index, 'batchNumber', e.target.value)}
                                                    placeholder="Opcional"
                                                />
                                            </Td>
                                            <Td>
                                                <Input
                                                    type="date"
                                                    size="sm"
                                                    value={lote.productionDate || ''}
                                                    onChange={(e) => handleLoteChange(index, 'productionDate', e.target.value)}
                                                />
                                            </Td>
                                            <Td>
                                                <Input
                                                    type="date"
                                                    size="sm"
                                                    value={lote.expirationDate || ''}
                                                    onChange={(e) => handleLoteChange(index, 'expirationDate', e.target.value)}
                                                    isRequired
                                                />
                                            </Td>
                                            <Td>
                                                <Input
                                                    type="number"
                                                    size="sm"
                                                    value={lote.cantidad}
                                                    onChange={(e) => handleLoteChange(index, 'cantidad', parseInt(e.target.value) || 0)}
                                                    min={0}
                                                    max={maxPermitido}
                                                    w="100px"
                                                />
                                            </Td>
                                            <Td textAlign="center">
                                                <IconButton
                                                    aria-label="Eliminar lote"
                                                    icon={<MinusIcon />}
                                                    size="sm"
                                                    colorScheme="red"
                                                    onClick={() => handleRemoveLote(index)}
                                                    isDisabled={lotes.length <= 1}
                                                />
                                            </Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                            
                            {!isValid && (
                                <Text color="red.500" mt={2} fontSize="sm">
                                    La suma de las cantidades debe ser mayor a 0 y no debe exceder {maxPermitido.toFixed(2)}
                                    {cantidadYaRecibida > 0 && ` (ordenado: ${item.cantidad}, ya recibido: ${cantidadYaRecibida.toFixed(2)})`}.
                                </Text>
                            )}
                        </Box>
                    </Collapse>
                </Td>
            </Tr>
            )}
        </>
    );
}
