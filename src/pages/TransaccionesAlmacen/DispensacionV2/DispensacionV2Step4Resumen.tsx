import {
    Steps,
    Alert,
    Badge,
    Box,
    Button,
    Flex,
    Heading,
    Table,
    TableContainer,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import { getCantidadActualEfectiva, recalcularDispensacionV2 } from "./DispensacionV2Calculations";
import DispensacionV2DetalleLotesModal from "./DispensacionV2DetalleLotesModal";
import type {
    DispensacionV2OrdenDTO,
    DispensacionV2PreparacionResponseDTO,
} from "./DispensacionV2Types";
import { formatDispensacionV2Number } from "./DispensacionV2Types";

interface DispensacionV2Step4ResumenProps {
    asignacion: DispensacionV2PreparacionResponseDTO;
    onAsignacionChange: (asignacion: DispensacionV2PreparacionResponseDTO) => void;
    onBack: () => void;
    onNext: () => void;
}

export default function DispensacionV2Step4Resumen({
    asignacion,
    onAsignacionChange,
    onBack,
    onNext,
}: DispensacionV2Step4ResumenProps) {
    const [detalleOrden, setDetalleOrden] = useState<DispensacionV2OrdenDTO | null>(null);

    const handleSaveOrden = (ordenActualizada: DispensacionV2OrdenDTO) => {
        const next = {
            ...asignacion,
            ordenes: asignacion.ordenes.map((orden) =>
                orden.ordenProduccionId === ordenActualizada.ordenProduccionId ? ordenActualizada : orden,
            ),
        };
        onAsignacionChange(recalcularDispensacionV2(next));
        setDetalleOrden(null);
    };

    return (
        <VStack align="stretch" gap={5}>
            <Box borderWidth="1px" borderRadius="lg" bg="app.surface" p={4}>
                <Flex justify="space-between" align="start" gap={3} wrap="wrap">
                    <Box>
                        <Heading size="md">Resumen consolidado</Heading>
                        <Text color="app.textMuted" fontSize="sm" mt={1}>
                            Vista consolidada por OP. Los lotes origen quedan ocultos hasta abrir el detalle.
                        </Text>
                    </Box>
                    <Flex gap={2} wrap="wrap">
                        <Badge colorPalette="teal">{asignacion.ordenes.length} OPs</Badge>
                        <Badge colorPalette={asignacion.warnings.length > 0 ? "orange" : "green"}>
                            {asignacion.warnings.length} warnings
                        </Badge>
                    </Flex>
                </Flex>
            </Box>

            {asignacion.warnings.length > 0 ? (
                <Alert.Root status="warning" borderRadius="md" alignItems="flex-start">
                    <Alert.Indicator />
                    <Box>
                        <Text fontWeight="semibold">Advertencias de dispensacion</Text>
                        {asignacion.warnings.slice(0, 8).map((warning) => (
                            <Text key={warning} fontSize="sm">{warning}</Text>
                        ))}
                        {asignacion.warnings.length > 8 ? (
                            <Text fontSize="sm">Y {asignacion.warnings.length - 8} advertencias mas.</Text>
                        ) : null}
                    </Box>
                </Alert.Root>
            ) : null}

            {asignacion.ordenes.map((orden) => (
                <Box key={orden.ordenProduccionId} borderWidth="1px" borderRadius="md" bg="app.surface" p={4}>
                    <Flex justify="space-between" align="start" gap={3} wrap="wrap" mb={3}>
                        <Box>
                            <Heading size="sm">
                                OP {orden.ordenProduccionId} - {orden.loteAsignado ?? "Sin lote"}
                            </Heading>
                            <Text fontSize="sm" color="app.textMuted">
                                {orden.productoTerminadoNombre} ({orden.productoTerminadoId})
                            </Text>
                        </Box>
                        <Flex gap={2} wrap="wrap" justify="end">
                            <Badge colorPalette="purple">
                                {formatDispensacionV2Number(orden.cantidadProducir)} und
                            </Badge>
                            <Badge colorPalette="teal">{orden.area.nombre}</Badge>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDetalleOrden(orden)}
                                disabled={!orden.materiales.some(
                                    (material) => material.checked && material.inventareable,
                                )}
                            >
                                Lotes físicos
                            </Button>
                        </Flex>
                    </Flex>

                    <Table.ScrollArea>
                        <Table.Root size="sm" variant="simple">
                            <Table.Header>
                                <Table.Row>
                                    <Table.ColumnHeader>Material</Table.ColumnHeader>
                                    <Table.ColumnHeader textAlign='end'>Actual</Table.ColumnHeader>
                                    <Table.ColumnHeader textAlign='end'>Historico</Table.ColumnHeader>
                                    <Table.ColumnHeader textAlign='end'>Total</Table.ColumnHeader>
                                    <Table.ColumnHeader textAlign='end'>Receta</Table.ColumnHeader>
                                    <Table.ColumnHeader>Lotes</Table.ColumnHeader>
                                    <Table.ColumnHeader>Estado</Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {orden.materiales
                                    .filter((material) => material.checked || material.cantidadHistorica > 0)
                                    .map((material) => {
                                        const cantidadActual = getCantidadActualEfectiva(material);
                                        const lotesCount = material.lotesOrigen?.length ?? 0;
                                        return (
                                            <Table.Row key={material.productoId} bg={material.excedeReceta ? "orange.50" : undefined}>
                                                <Table.Cell>
                                                    <Text fontWeight="semibold" fontSize="sm">{material.productoNombre}</Text>
                                                    <Text fontSize="xs" color="app.textMuted">{material.productoId}</Text>
                                                </Table.Cell>
                                                <Table.Cell textAlign='end'>
                                                    {formatDispensacionV2Number(cantidadActual)} {material.tipoUnidades}
                                                </Table.Cell>
                                                <Table.Cell textAlign='end'>
                                                    {formatDispensacionV2Number(material.cantidadHistorica)} {material.tipoUnidades}
                                                </Table.Cell>
                                                <Table.Cell textAlign='end'>
                                                    {formatDispensacionV2Number(material.totalConHistorico)} {material.tipoUnidades}
                                                </Table.Cell>
                                                <Table.Cell textAlign='end'>
                                                    {formatDispensacionV2Number(material.cantidadReceta)} {material.tipoUnidades}
                                                </Table.Cell>
                                                <Table.Cell>
                                                    {material.consumoDirecto && material.checked ? (
                                                        <Badge colorPalette="purple">Consumo directo</Badge>
                                                    ) : material.inventareable && material.checked ? (
                                                        <Badge colorPalette={lotesCount > 0 ? "teal" : "orange"}>
                                                            {lotesCount} lotes
                                                        </Badge>
                                                    ) : (
                                                        <Badge colorPalette="gray">No aplica</Badge>
                                                    )}
                                                </Table.Cell>
                                                <Table.Cell>
                                                    {material.consumoDirecto && material.checked ? (
                                                        <Badge colorPalette="purple">Sin efecto en stock</Badge>
                                                    ) : material.warning ? (
                                                        <Badge colorPalette={material.excedeReceta ? "orange" : "gray"} whiteSpace="normal">
                                                            {material.warning}
                                                        </Badge>
                                                    ) : (
                                                        <Badge colorPalette="green">OK</Badge>
                                                    )}
                                                </Table.Cell>
                                            </Table.Row>
                                        );
                                    })}
                            </Table.Body>
                        </Table.Root>
                    </Table.ScrollArea>
                </Box>
            ))}

            <Box borderWidth="1px" borderRadius="md" bg="app.surface" p={4}>
                <Heading size="sm" mb={3}>Total por material</Heading>
                <Table.ScrollArea>
                    <Table.Root size="sm" variant="striped">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>Material</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign='end'>Actual total</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign='end'>Historico total</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign='end'>Total</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign='end'>Receta total</Table.ColumnHeader>
                                <Table.ColumnHeader>Estado</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {asignacion.totalesMateriales.map((material) => (
                                <Table.Row key={material.productoId} bg={material.excedeReceta ? "orange.50" : undefined}>
                                    <Table.Cell>
                                        <Text fontWeight="semibold" fontSize="sm">{material.productoNombre}</Text>
                                        <Text fontSize="xs" color="app.textMuted">{material.productoId}</Text>
                                    </Table.Cell>
                                    <Table.Cell textAlign='end'>
                                        {formatDispensacionV2Number(material.cantidadADispensarTotal)} {material.tipoUnidades}
                                    </Table.Cell>
                                    <Table.Cell textAlign='end'>
                                        {formatDispensacionV2Number(material.cantidadHistoricaTotal)} {material.tipoUnidades}
                                    </Table.Cell>
                                    <Table.Cell textAlign='end'>
                                        {formatDispensacionV2Number(material.totalConHistorico)} {material.tipoUnidades}
                                    </Table.Cell>
                                    <Table.Cell textAlign='end'>
                                        {formatDispensacionV2Number(material.cantidadRecetaTotal)} {material.tipoUnidades}
                                    </Table.Cell>
                                    <Table.Cell>
                                        {material.warning ? (
                                            <Badge colorPalette="orange" whiteSpace="normal">{material.warning}</Badge>
                                        ) : (
                                            <Badge colorPalette="green">OK</Badge>
                                        )}
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Table.ScrollArea>
            </Box>

            <Flex justify="flex-end" gap={3}>
                <Button variant="outline" onClick={onBack}>
                    Atrás
                </Button>
                <Button colorPalette="teal" onClick={onNext}>
                    Confirmar revisión
                </Button>
            </Flex>

            <DispensacionV2DetalleLotesModal
                orden={detalleOrden}
                onClose={() => setDetalleOrden(null)}
                onSave={handleSaveOrden}
            />
        </VStack>
    );
}
