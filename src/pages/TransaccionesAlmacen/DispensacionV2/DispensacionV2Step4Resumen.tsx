import {
    Alert,
    AlertIcon,
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
        <VStack align="stretch" spacing={5}>
            <Box borderWidth="1px" borderRadius="lg" bg="app.surface" p={4}>
                <Flex justify="space-between" align="start" gap={3} wrap="wrap">
                    <Box>
                        <Heading size="md">Resumen consolidado</Heading>
                        <Text color="app.textMuted" fontSize="sm" mt={1}>
                            Vista consolidada por OP. Los lotes origen quedan ocultos hasta abrir el detalle.
                        </Text>
                    </Box>
                    <Flex gap={2} wrap="wrap">
                        <Badge colorScheme="teal">{asignacion.ordenes.length} OPs</Badge>
                        <Badge colorScheme={asignacion.warnings.length > 0 ? "orange" : "green"}>
                            {asignacion.warnings.length} warnings
                        </Badge>
                    </Flex>
                </Flex>
            </Box>

            {asignacion.warnings.length > 0 ? (
                <Alert status="warning" borderRadius="md" alignItems="flex-start">
                    <AlertIcon />
                    <Box>
                        <Text fontWeight="semibold">Advertencias de dispensacion</Text>
                        {asignacion.warnings.slice(0, 8).map((warning) => (
                            <Text key={warning} fontSize="sm">{warning}</Text>
                        ))}
                        {asignacion.warnings.length > 8 ? (
                            <Text fontSize="sm">Y {asignacion.warnings.length - 8} advertencias mas.</Text>
                        ) : null}
                    </Box>
                </Alert>
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
                            <Badge colorScheme="purple">
                                {formatDispensacionV2Number(orden.cantidadProducir)} und
                            </Badge>
                            <Badge colorScheme="teal">{orden.area.nombre}</Badge>
                            <Button size="sm" variant="outline" onClick={() => setDetalleOrden(orden)}>
                                Detalle lotes
                            </Button>
                        </Flex>
                    </Flex>

                    <TableContainer>
                        <Table size="sm" variant="simple">
                            <Thead>
                                <Tr>
                                    <Th>Material</Th>
                                    <Th isNumeric>Actual</Th>
                                    <Th isNumeric>Historico</Th>
                                    <Th isNumeric>Total</Th>
                                    <Th isNumeric>Receta</Th>
                                    <Th>Lotes</Th>
                                    <Th>Estado</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {orden.materiales
                                    .filter((material) => material.checked || material.cantidadHistorica > 0)
                                    .map((material) => {
                                        const cantidadActual = getCantidadActualEfectiva(material);
                                        const lotesCount = material.lotesOrigen?.length ?? 0;
                                        return (
                                            <Tr key={material.productoId} bg={material.excedeReceta ? "orange.50" : undefined}>
                                                <Td>
                                                    <Text fontWeight="semibold" fontSize="sm">{material.productoNombre}</Text>
                                                    <Text fontSize="xs" color="app.textMuted">{material.productoId}</Text>
                                                </Td>
                                                <Td isNumeric>
                                                    {formatDispensacionV2Number(cantidadActual)} {material.tipoUnidades}
                                                </Td>
                                                <Td isNumeric>
                                                    {formatDispensacionV2Number(material.cantidadHistorica)} {material.tipoUnidades}
                                                </Td>
                                                <Td isNumeric>
                                                    {formatDispensacionV2Number(material.totalConHistorico)} {material.tipoUnidades}
                                                </Td>
                                                <Td isNumeric>
                                                    {formatDispensacionV2Number(material.cantidadReceta)} {material.tipoUnidades}
                                                </Td>
                                                <Td>
                                                    {material.inventareable && material.checked ? (
                                                        <Badge colorScheme={lotesCount > 0 ? "teal" : "orange"}>
                                                            {lotesCount} lotes
                                                        </Badge>
                                                    ) : (
                                                        <Badge colorScheme="gray">No aplica</Badge>
                                                    )}
                                                </Td>
                                                <Td>
                                                    {material.warning ? (
                                                        <Badge colorScheme={material.excedeReceta ? "orange" : "gray"} whiteSpace="normal">
                                                            {material.warning}
                                                        </Badge>
                                                    ) : (
                                                        <Badge colorScheme="green">OK</Badge>
                                                    )}
                                                </Td>
                                            </Tr>
                                        );
                                    })}
                            </Tbody>
                        </Table>
                    </TableContainer>
                </Box>
            ))}

            <Box borderWidth="1px" borderRadius="md" bg="app.surface" p={4}>
                <Heading size="sm" mb={3}>Total por material</Heading>
                <TableContainer>
                    <Table size="sm" variant="striped">
                        <Thead>
                            <Tr>
                                <Th>Material</Th>
                                <Th isNumeric>Actual total</Th>
                                <Th isNumeric>Historico total</Th>
                                <Th isNumeric>Total</Th>
                                <Th isNumeric>Receta total</Th>
                                <Th>Estado</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {asignacion.totalesMateriales.map((material) => (
                                <Tr key={material.productoId} bg={material.excedeReceta ? "orange.50" : undefined}>
                                    <Td>
                                        <Text fontWeight="semibold" fontSize="sm">{material.productoNombre}</Text>
                                        <Text fontSize="xs" color="app.textMuted">{material.productoId}</Text>
                                    </Td>
                                    <Td isNumeric>
                                        {formatDispensacionV2Number(material.cantidadADispensarTotal)} {material.tipoUnidades}
                                    </Td>
                                    <Td isNumeric>
                                        {formatDispensacionV2Number(material.cantidadHistoricaTotal)} {material.tipoUnidades}
                                    </Td>
                                    <Td isNumeric>
                                        {formatDispensacionV2Number(material.totalConHistorico)} {material.tipoUnidades}
                                    </Td>
                                    <Td isNumeric>
                                        {formatDispensacionV2Number(material.cantidadRecetaTotal)} {material.tipoUnidades}
                                    </Td>
                                    <Td>
                                        {material.warning ? (
                                            <Badge colorScheme="orange" whiteSpace="normal">{material.warning}</Badge>
                                        ) : (
                                            <Badge colorScheme="green">OK</Badge>
                                        )}
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </TableContainer>
            </Box>

            <Flex justify="flex-end" gap={3}>
                <Button variant="outline" onClick={onBack}>
                    Atrás
                </Button>
                <Button colorScheme="teal" onClick={onNext}>
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
