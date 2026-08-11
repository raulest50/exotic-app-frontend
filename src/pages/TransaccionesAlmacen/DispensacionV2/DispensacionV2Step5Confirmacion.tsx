import {
    Steps,
    Alert,
    Badge,
    Box,
    Button,
    Flex,
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
    Field,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { finalizarDispensacionV2 } from "./DispensacionV2Service";
import type { DispensacionV2PreparacionResponseDTO } from "./DispensacionV2Types";
import { formatDispensacionV2Number } from "./DispensacionV2Types";

interface DispensacionV2Step5ConfirmacionProps {
    asignacion: DispensacionV2PreparacionResponseDTO;
    onBack: () => void;
    onSuccess: () => void;
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
    onSuccess,
}: DispensacionV2Step5ConfirmacionProps) {
    const [token, setToken] = useState(generateToken);
    const [inputToken, setInputToken] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const toast = useAppToast();

    const asignacionKey = useMemo(
        () => asignacion.ordenes.map((orden) => orden.ordenProduccionId).join("-"),
        [asignacion.ordenes],
    );

    useEffect(() => {
        setToken(generateToken());
        setInputToken("");
        setSubmitting(false);
        setError(null);
    }, [asignacionKey]);

    const canConfirm = inputToken === token && !submitting;

    const handleConfirm = async () => {
        if (!canConfirm) return;
        setSubmitting(true);
        setError(null);
        try {
            const response = await finalizarDispensacionV2(asignacion);
            toast({
                title: "Dispensación registrada",
                description: `Se registraron ${response.ordenes.length} OPs correctamente.`,
                status: "success",
                duration: 5000,
                isClosable: true,
            });
            onSuccess();
        } catch (err) {
            const message = getAxiosErrorMessage(err, "No fue posible registrar la dispensacion v2.");
            setError(message);
            setSubmitting(false);
            toast({
                title: "Error al registrar",
                description: message,
                status: "error",
                duration: 6000,
                isClosable: true,
            });
        }
    };

    return (
        <VStack align="stretch" gap={5}>
            <Box borderWidth="1px" borderRadius="lg" bg="app.surface" p={4}>
                <Flex justify="space-between" align="start" gap={3} wrap="wrap">
                    <Box>
                        <Heading size="md">Confirmación final</Heading>
                        <Text color="app.textMuted" fontSize="sm" mt={1}>
                            Revisión final con token local. Al confirmar se registran movimientos reales de almacén.
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
                        <Text fontWeight="semibold">La operación tiene advertencias</Text>
                        <Text fontSize="sm">
                            El sistema permite continuar en v2, pero estas cantidades deben revisarse antes de registrar.
                        </Text>
                    </Box>
                </Alert.Root>
            ) : null}

            <Box borderWidth="1px" borderRadius="md" bg="app.surface" p={4}>
                <Heading size="sm" mb={3}>Resumen final por material</Heading>
                <Table.ScrollArea>
                    <Table.Root size="sm" variant="striped">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>Material</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign='end'>Actual</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign='end'>Historico</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign='end'>Total</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign='end'>Receta</Table.ColumnHeader>
                                <Table.ColumnHeader>Estado</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {asignacion.totalesMateriales.map((material) => {
                                const seDispensa = material.cantidadADispensarTotal > 0;
                                const rowBg = material.warning ? "orange.50" : seDispensa ? "teal.50" : undefined;
                                return (
                                    <Table.Row key={material.productoId} sx={rowBg ? { "> td": { bg: rowBg } } : undefined}>
                                        <Table.Cell>
                                            <Flex align="center" gap={2} wrap="wrap">
                                                <Text fontWeight="semibold" fontSize="sm">{material.productoNombre}</Text>
                                                {seDispensa ? <Badge colorPalette="teal">Dispensa</Badge> : null}
                                            </Flex>
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
                                );
                            })}
                        </Table.Body>
                    </Table.Root>
                </Table.ScrollArea>
            </Box>

            <Box borderWidth="1px" borderRadius="md" bg="app.surface" p={4}>
                <Field.Root required maxW="320px">
                    <Field.Label>Token de verificación</Field.Label>
                    <Input
                        value={inputToken}
                        onValueChange={(event) => setInputToken(event.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="Ingrese el token"
                        inputMode="numeric"
                        maxLength={4}
                        disabled={submitting}
                    />
                    <Text mt={2} fontSize="sm" color="app.textMuted">
                        Token generado: <strong>{token}</strong>
                    </Text>
                </Field.Root>
            </Box>

            {error ? (
                <Alert.Root status="error" borderRadius="md" alignItems="flex-start">
                    <Alert.Indicator />
                    <Box>
                        <Text fontWeight="semibold">No se pudo registrar la dispensación</Text>
                        <Text fontSize="sm">{error}</Text>
                    </Box>
                </Alert.Root>
            ) : null}

            <Flex justify="flex-end" gap={3}>
                <Button variant="outline" onClick={onBack} disabled={submitting}>
                    Atrás
                </Button>
                <Button
                    colorPalette="teal"
                    onClick={handleConfirm}
                    disabled={!canConfirm}
                    loading={submitting}
                >
                    Registrar dispensación
                </Button>
            </Flex>
        </VStack>
    );
}
