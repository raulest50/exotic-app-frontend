import {
    Alert,
    AlertIcon,
    Badge,
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    Heading,
    Input,
    Table,
    TableContainer,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    VStack,
    useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import type { DispensacionV2PreparacionResponseDTO } from "./DispensacionV2Types";
import { formatDispensacionV2Number } from "./DispensacionV2Types";

interface DispensacionV2Step5ConfirmacionProps {
    asignacion: DispensacionV2PreparacionResponseDTO;
    onBack: () => void;
}

function generateToken(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

export default function DispensacionV2Step5Confirmacion({
    asignacion,
    onBack,
}: DispensacionV2Step5ConfirmacionProps) {
    const [token, setToken] = useState(generateToken);
    const [inputToken, setInputToken] = useState("");
    const [confirmed, setConfirmed] = useState(false);
    const toast = useToast();

    const asignacionKey = useMemo(
        () => asignacion.ordenes.map((orden) => orden.ordenProduccionId).join("-"),
        [asignacion.ordenes],
    );

    useEffect(() => {
        setToken(generateToken());
        setInputToken("");
        setConfirmed(false);
    }, [asignacionKey]);

    const canConfirm = inputToken === token && !confirmed;

    const handleConfirm = () => {
        if (!canConfirm) return;
        setConfirmed(true);
        toast({
            title: "Preview confirmado",
            description: "La revisión de Dispensacion v2 fue confirmada localmente. Aun no se registran movimientos.",
            status: "success",
            duration: 4000,
            isClosable: true,
        });
    };

    return (
        <VStack align="stretch" spacing={5}>
            <Box borderWidth="1px" borderRadius="lg" bg="app.surface" p={4}>
                <Flex justify="space-between" align="start" gap={3} wrap="wrap">
                    <Box>
                        <Heading size="md">Confirmación preview</Heading>
                        <Text color="app.textMuted" fontSize="sm" mt={1}>
                            Revisión final con token local. Esta versión no registra movimientos de almacén.
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
                        <Text fontWeight="semibold">La operación tiene advertencias</Text>
                        <Text fontSize="sm">
                            El sistema permite continuar en v2, pero estas cantidades deben revisarse antes del registro real.
                        </Text>
                    </Box>
                </Alert>
            ) : null}

            <Box borderWidth="1px" borderRadius="md" bg="app.surface" p={4}>
                <Heading size="sm" mb={3}>Resumen final por material</Heading>
                <TableContainer>
                    <Table size="sm" variant="striped">
                        <Thead>
                            <Tr>
                                <Th>Material</Th>
                                <Th isNumeric>Actual</Th>
                                <Th isNumeric>Historico</Th>
                                <Th isNumeric>Total</Th>
                                <Th isNumeric>Receta</Th>
                                <Th>Estado</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {asignacion.totalesMateriales.map((material) => (
                                <Tr key={material.productoId}>
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

            <Box borderWidth="1px" borderRadius="md" bg="app.surface" p={4}>
                <FormControl isRequired maxW="320px">
                    <FormLabel>Token de verificación</FormLabel>
                    <Input
                        value={inputToken}
                        onChange={(event) => setInputToken(event.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="Ingrese el token"
                        inputMode="numeric"
                        maxLength={4}
                    />
                    <Text mt={2} fontSize="sm" color="app.textMuted">
                        Token generado: <strong>{token}</strong>
                    </Text>
                </FormControl>
            </Box>

            {confirmed ? (
                <Alert status="success" borderRadius="md">
                    <AlertIcon />
                    Preview confirmado localmente. El registro real queda pendiente para la siguiente iteración.
                </Alert>
            ) : null}

            <Flex justify="flex-end" gap={3}>
                <Button variant="outline" onClick={onBack}>
                    Atrás
                </Button>
                <Button colorScheme="teal" onClick={handleConfirm} isDisabled={!canConfirm}>
                    Confirmar preview
                </Button>
            </Flex>
        </VStack>
    );
}
