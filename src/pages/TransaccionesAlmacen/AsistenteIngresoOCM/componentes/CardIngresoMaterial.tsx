import { type ChangeEvent, useEffect, useState } from 'react';
import { useColorModeValue } from "../../../../components/ui/color-mode";
import {
    Steps,
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
    Collapsible,
    Checkbox,
} from '@chakra-ui/react';
import {
    IngresoOcmDraftItem,
    IngresoOcmDraftLoteField,
} from '../ingresoOcmTypes';

import { LuChevronDown, LuChevronUp, LuMinus, LuPlus } from 'react-icons/lu';

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
    const invalidRowBg = useColorModeValue("red.50", "red.900");

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
            <Table.Row bg={!isValid && !excluded ? invalidRowBg : excluded ? "app.surfaceMuted" : "app.surface"}>
                <Table.Cell>
                    <Flex align="center" gap={2}>
                        <Checkbox.Root
                            aria-label={`Excluir material ${item.material.productoId}`}
                            checked={excluded}
                            onCheckedChange={handleExcludedChange}
                            colorPalette="red"><Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control></Checkbox.Root>
                        <Text fontWeight="semibold" as={excluded ? "s" : undefined} color={excluded ? "app.textSubtle" : undefined}>
                            {item.material.nombre}
                        </Text>
                    </Flex>
                </Table.Cell>
                <Table.Cell>{item.material.productoId}</Table.Cell>
                <Table.Cell>
                    {item.cantidad} {item.material.tipoUnidades}
                    {cantidadYaRecibida > 0 && (
                        <Text fontSize="xs" color="blue.600">
                            (Recibido: {cantidadYaRecibida.toFixed(2)}, Restante: {maxPermitido.toFixed(2)})
                        </Text>
                    )}
                </Table.Cell>
                <Table.Cell>
                    {excluded ? (
                        <Badge colorPalette="gray" fontSize="md">
                            Excluido
                        </Badge>
                    ) : (
                        <Badge colorPalette={isValid ? "green" : "red"} fontSize="md">
                            {totalCantidad} {item.material.tipoUnidades}
                        </Badge>
                    )}
                </Table.Cell>
                <Table.Cell>
                    {excluded ? (
                        <Badge colorPalette="gray">
                            No recibido
                        </Badge>
                    ) : (
                        <Badge colorPalette={isValid ? "green" : "orange"}>
                            {isValid ? "Valido" : "Pendiente"}
                        </Badge>
                    )}
                </Table.Cell>
                <Table.Cell textAlign="center">
                    {!excluded && (
                        <IconButton
                            aria-label={`${isExpanded ? "Ocultar" : "Mostrar"} lotes de ${item.material.productoId}`}
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}>{isExpanded ? <LuChevronUp /> : <LuChevronDown />}</IconButton>
                    )}
                </Table.Cell>
            </Table.Row>
            {!excluded && (
                <Table.Row>
                    <Table.Cell colSpan={6} p={0}>
                        <Collapsible.Root open={isExpanded}>
                            <Collapsible.Content>
                                <Box p={4} bg="app.surfaceSubtle">
                                    <Flex justifyContent="space-between" alignItems="center" mb={4}>
                                        <Text fontWeight="semibold">Lotes del Material</Text>
                                        <Button
                                            aria-label={`Agregar lote a ${item.material.productoId}`}
                                            colorPalette="teal"
                                            size="sm"
                                            onClick={handleAddLote}
                                            disabled={lotes.length >= maxLotesPorMaterial}><LuPlus />Agregar Lote
                                                                                </Button>
                                    </Flex>

                                    <Table.Root size="sm" variant="simple" bg="app.surface">
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.ColumnHeader>Lote #</Table.ColumnHeader>
                                                <Table.ColumnHeader>Lote Interno</Table.ColumnHeader>
                                                <Table.ColumnHeader>Fecha Fabricacion</Table.ColumnHeader>
                                                <Table.ColumnHeader>Fecha Vencimiento</Table.ColumnHeader>
                                                <Table.ColumnHeader>Cantidad</Table.ColumnHeader>
                                                <Table.ColumnHeader textAlign="center">Acciones</Table.ColumnHeader>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {lotes.map((lote, index) => {
                                                const preview = previewByLineKey[lote.lineKey];
                                                return (
                                                    <Table.Row key={lote.lineKey}>
                                                        <Table.Cell fontWeight="semibold">{index + 1}</Table.Cell>
                                                        <Table.Cell>
                                                            <Badge colorPalette={preview ? "blue" : "gray"}>
                                                                {isPreviewLoading && lote.cantidad > 0
                                                                    ? "Calculando"
                                                                    : preview || "Pendiente"}
                                                            </Badge>
                                                        </Table.Cell>
                                                        <Table.Cell>
                                                            <Input
                                                                aria-label={`Fecha de fabricacion lote ${index + 1} de ${item.material.productoId}`}
                                                                type="date"
                                                                size="sm"
                                                                value={lote.productionDate}
                                                                onValueChange={(e) => handleLoteChange(lote.lineKey, 'productionDate', e.target.value)}
                                                            />
                                                        </Table.Cell>
                                                        <Table.Cell>
                                                            <Input
                                                                aria-label={`Fecha de vencimiento lote ${index + 1} de ${item.material.productoId}`}
                                                                type="date"
                                                                size="sm"
                                                                value={lote.expirationDate}
                                                                onValueChange={(e) => handleLoteChange(lote.lineKey, 'expirationDate', e.target.value)}
                                                                required
                                                            />
                                                        </Table.Cell>
                                                        <Table.Cell>
                                                            <Input
                                                                aria-label={`Cantidad lote ${index + 1} de ${item.material.productoId}`}
                                                                type="number"
                                                                size="sm"
                                                                value={lote.cantidad}
                                                                onValueChange={(e) => handleLoteChange(lote.lineKey, 'cantidad', parseFloat(e.target.value) || 0)}
                                                                min={0}
                                                                max={maxPermitido}
                                                                w="100px"
                                                            />
                                                        </Table.Cell>
                                                        <Table.Cell textAlign="center">
                                                            <IconButton
                                                                aria-label={`Eliminar lote ${index + 1} de ${item.material.productoId}`}
                                                                size="sm"
                                                                colorPalette="red"
                                                                onClick={() => handleRemoveLote(lote.lineKey)}
                                                                disabled={lotes.length <= 1}><LuMinus /></IconButton>
                                                        </Table.Cell>
                                                    </Table.Row>
                                                );
                                            })}
                                        </Table.Body>
                                    </Table.Root>

                                    {!isValid && (
                                        <Text color="red.500" mt={2} fontSize="sm">
                                            La suma de las cantidades debe ser mayor a 0 y no debe exceder {maxPermitido.toFixed(2)}
                                            {cantidadYaRecibida > 0 && ` (ordenado: ${item.cantidad}, ya recibido: ${cantidadYaRecibida.toFixed(2)})`}.
                                        </Text>
                                    )}
                                </Box>
                            </Collapsible.Content>
                        </Collapsible.Root>
                    </Table.Cell>
                </Table.Row>
            )}
        </>
    );
}
