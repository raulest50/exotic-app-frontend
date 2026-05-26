import { type ChangeEvent, useEffect, useState } from 'react';
import {
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Text,
    Flex,
    Button,
    IconButton,
    Input,
    Box,
    Badge,
    useToast,
    Collapse,
    Checkbox
} from '@chakra-ui/react';
import { AddIcon, MinusIcon, ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';

import {
    IngresoOcmDraftItem,
    IngresoOcmDraftLoteField,
} from '../ingresoOcmTypes';

interface Props {
    draftItem: IngresoOcmDraftItem;
    previewByLineKey: Record<string, string>;
    isPreviewLoading: boolean;
    cantidadYaRecibida: number;
    maxPermitido: number;
    maxLotesPorMaterial: number;
    onChangeLote: (
        itemIndex: number,
        lineKey: string,
        field: IngresoOcmDraftLoteField,
        value: string | number
    ) => void;
    onAddLote: (itemIndex: number) => void;
    onRemoveLote: (itemIndex: number, lineKey: string) => void;
    onToggleExcluded: (itemIndex: number, excluded: boolean) => void;
}

export function CardIngresoMaterial({
    draftItem,
    previewByLineKey,
    isPreviewLoading,
    cantidadYaRecibida,
    maxPermitido,
    maxLotesPorMaterial,
    onChangeLote,
    onAddLote,
    onRemoveLote,
    onToggleExcluded,
}: Props) {
    const toast = useToast();
    const [isExpanded, setIsExpanded] = useState(false);
    const { item, itemIndex, excluded, lotes } = draftItem;
    const totalCantidad = lotes.reduce((sum, lote) => sum + lote.cantidad, 0);
    const isValid = excluded || (totalCantidad <= maxPermitido + 0.01 && totalCantidad > 0);

    useEffect(() => {
        if (excluded) {
            setIsExpanded(false);
        }
    }, [excluded]);

    const handleExcludedChange = (e: ChangeEvent<HTMLInputElement>) => {
        onToggleExcluded(itemIndex, e.target.checked);
    };

    const handleAddLote = () => {
        if (lotes.length >= maxLotesPorMaterial) {
            toast({
                title: "Limite alcanzado",
                description: `No se pueden agregar mas de ${maxLotesPorMaterial} lotes por material.`,
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        onAddLote(itemIndex);
    };

    const handleRemoveLote = (lineKey: string) => {
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

        onRemoveLote(itemIndex, lineKey);
    };

    const handleLoteChange = (
        lineKey: string,
        field: IngresoOcmDraftLoteField,
        value: string | number
    ) => {
        onChangeLote(itemIndex, lineKey, field, value);
    };

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
                            {isValid ? "Valido" : "Pendiente"}
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
                                        isDisabled={lotes.length >= maxLotesPorMaterial}
                                    >
                                        Agregar Lote
                                    </Button>
                                </Flex>

                                <Table size="sm" variant="simple" bg="white">
                                    <Thead>
                                        <Tr>
                                            <Th>Lote #</Th>
                                            <Th>Lote Interno</Th>
                                            <Th>Fecha Fabricacion</Th>
                                            <Th>Fecha Vencimiento</Th>
                                            <Th>Cantidad</Th>
                                            <Th textAlign="center">Acciones</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {lotes.map((lote, index) => {
                                            const preview = previewByLineKey[lote.lineKey];
                                            return (
                                                <Tr key={lote.lineKey}>
                                                    <Td fontWeight="semibold">{index + 1}</Td>
                                                    <Td>
                                                        <Badge colorScheme={preview ? "blue" : "gray"}>
                                                            {isPreviewLoading && lote.cantidad > 0
                                                                ? "Calculando"
                                                                : preview || "Pendiente"}
                                                        </Badge>
                                                    </Td>
                                                    <Td>
                                                        <Input
                                                            type="date"
                                                            size="sm"
                                                            value={lote.productionDate}
                                                            onChange={(e) => handleLoteChange(lote.lineKey, 'productionDate', e.target.value)}
                                                        />
                                                    </Td>
                                                    <Td>
                                                        <Input
                                                            type="date"
                                                            size="sm"
                                                            value={lote.expirationDate}
                                                            onChange={(e) => handleLoteChange(lote.lineKey, 'expirationDate', e.target.value)}
                                                            isRequired
                                                        />
                                                    </Td>
                                                    <Td>
                                                        <Input
                                                            type="number"
                                                            size="sm"
                                                            value={lote.cantidad}
                                                            onChange={(e) => handleLoteChange(lote.lineKey, 'cantidad', parseFloat(e.target.value) || 0)}
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
                                                            onClick={() => handleRemoveLote(lote.lineKey)}
                                                            isDisabled={lotes.length <= 1}
                                                        />
                                                    </Td>
                                                </Tr>
                                            );
                                        })}
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
