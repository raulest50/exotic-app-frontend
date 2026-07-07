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
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { finalizarDispensacionV2 } from "./DispensacionV2Service";
import type {
    DispensacionV2FinalizacionResponseDTO,
    DispensacionV2PreparacionResponseDTO,
} from "./DispensacionV2Types";
import { formatDispensacionV2Number } from "./DispensacionV2Types";

interface DispensacionV2Step5ConfirmacionProps {
    asignacion: DispensacionV2PreparacionResponseDTO;
    onBack: () => void;
}

function generateToken(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

function getAxiosErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as { error?: string; message?: string } | string | undefined;
        if (typeof data === "string" && data.trim()) return data;
        if (data && typeof data === "object") return data.message ?? data.error ?? error.message ?? fallback;
        return error.message || fallback;
    }
    return error instanceof Error ? error.message : fallback;
}

export default function DispensacionV2Step5Confirmacion({
    asignacion,
    onBack,
}: DispensacionV2Step5ConfirmacionProps) {
    const [token, setToken] = useState(generateToken);
    const [inputToken, setInputToken] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [resultado, setResultado] = useState<DispensacionV2FinalizacionResponseDTO | null>(null);
    const [error, setError] = useState<string | null>(null);
    const toast = useToast();

    const asignacionKey = useMemo(
        () => asignacion.ordenes.map((orden) => orden.ordenProduccionId).join("-"),
        [asignacion.ordenes],
    );

    useEffect(() => {
        setToken(generateToken());
        setInputToken("");
        setSubmitting(false);
        setResultado(null);
        setError(null);
    }, [asignacionKey]);

    const canConfirm = inputToken === token && !resultado && !submitting;

    const handleConfirm = async () => {
        if (!canConfirm) return;
        setSubmitting(true);
        setError(null);
        try {
            const response = await finalizarDispensacionV2(asignacion);
            setResultado(response);
            toast({
                title: "Dispensación registrada",
                description: `Se registraron ${response.ordenes.length} OPs correctamente.`,
                status: "success",
                duration: 5000,
                isClosable: true,
            });
        } catch (err) {
            const message = getAxiosErrorMessage(err, "No fue posible registrar la dispensacion v2.");
            setError(message);
            toast({
                title: "Error al registrar",
                description: message,
                status: "error",
                duration: 6000,
                isClosable: true,
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <VStack align="stretch" spacing={5}>
            <Box borderWidth="1px" borderRadius="lg" bg="app.surface" p={4}>
                <Flex justify="space-between" align="start" gap={3} wrap="wrap">
                    <Box>
                        <Heading size="md">Confirmación final</Heading>
                        <Text color="app.textMuted" fontSize="sm" mt={1}>
                            Revisión final con token local. Al confirmar se registran movimientos reales de almacén.
                        </Text>
                    </Box>
                    <Flex gap={2} wrap="wrap">
                        <Badge colorScheme="teal">{asignacion.ordenes.length} OPs</Badge>
                        <Badge colorScheme={asignacion.warnings.length > 0 ? "orange" : "green"}>
                            {asignacion.warnings.length} warnings
                        </Badge>
                        {resultado ? (
                            <Badge colorScheme="green">{resultado.ordenes.length} registradas</Badge>
                        ) : null}
                    </Flex>
                </Flex>
            </Box>

            {asignacion.warnings.length > 0 ? (
                <Alert status="warning" borderRadius="md" alignItems="flex-start">
                    <AlertIcon />
                    <Box>
                        <Text fontWeight="semibold">La operación tiene advertencias</Text>
                        <Text fontSize="sm">
                            El sistema permite continuar en v2, pero estas cantidades deben revisarse antes de registrar.
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
                        isDisabled={submitting || Boolean(resultado)}
                    />
                    <Text mt={2} fontSize="sm" color="app.textMuted">
                        Token generado: <strong>{token}</strong>
                    </Text>
                </FormControl>
            </Box>

            {error ? (
                <Alert status="error" borderRadius="md" alignItems="flex-start">
                    <AlertIcon />
                    <Box>
                        <Text fontWeight="semibold">No se pudo registrar la dispensación</Text>
                        <Text fontSize="sm">{error}</Text>
                    </Box>
                </Alert>
            ) : null}

            {resultado ? (
                <Alert status="success" borderRadius="md">
                    <AlertIcon />
                    Dispensación registrada correctamente para {resultado.ordenes.length} OPs.
                </Alert>
            ) : null}

            {resultado ? (
                <Box borderWidth="1px" borderRadius="md" bg="app.surface" p={4}>
                    <Heading size="sm" mb={3}>Transacciones registradas</Heading>
                    <TableContainer>
                        <Table size="sm" variant="simple">
                            <Thead>
                                <Tr>
                                    <Th>OP</Th>
                                    <Th>Lote producción</Th>
                                    <Th>Transacción</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {resultado.ordenes.map((orden) => (
                                    <Tr key={orden.ordenProduccionId}>
                                        <Td>{orden.ordenProduccionId}</Td>
                                        <Td>{orden.loteAsignado ?? "-"}</Td>
                                        <Td>
                                            <Badge colorScheme="teal">#{orden.transaccionId}</Badge>
                                        </Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    </TableContainer>
                </Box>
            ) : null}

            <Flex justify="flex-end" gap={3}>
                <Button variant="outline" onClick={onBack} isDisabled={submitting || Boolean(resultado)}>
                    Atrás
                </Button>
                <Button
                    colorScheme="teal"
                    onClick={handleConfirm}
                    isDisabled={!canConfirm}
                    isLoading={submitting}
                >
                    Registrar dispensación
                </Button>
            </Flex>
        </VStack>
    );
}
