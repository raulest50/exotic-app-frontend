import { useEffect, useMemo, useState } from 'react';
import {
    Steps,
    Alert,
    Box,
    Button,
    Flex,
    Heading,
    Input,
    Table,
    Tbody,
    Td,
    Text,
    Textarea,
    Th,
    Thead,
    Tr,
    VStack,
    Field,
} from '@chakra-ui/react';
import axios from 'axios';
import EndPointsURL from '../../../../../api/EndPointsURL';
import { useAuth } from '../../../../../context/AuthContext';
import { AveriaAlmacenItem } from '../WizardAveriaAlmacen';

interface AveriaAlmacenStep2ReviewSubmitProps {
    setActiveStep: (step: number) => void;
    onReset: () => void;
    selectedItems: AveriaAlmacenItem[];
}

export default function AveriaAlmacenStep2ReviewSubmit({
    setActiveStep,
    onReset,
    selectedItems,
}: AveriaAlmacenStep2ReviewSubmitProps) {
    const endPoints = useMemo(() => new EndPointsURL(), []);
    const { user } = useAuth();

    const [observaciones, setObservaciones] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [submissionSuccess, setSubmissionSuccess] = useState(false);
    const [token, setToken] = useState('');
    const [inputToken, setInputToken] = useState('');

    useEffect(() => {
        const t = Math.floor(1000 + Math.random() * 9000).toString();
        setToken(t);
        setInputToken('');
    }, []);

    const handleSubmit = async () => {
        if (selectedItems.length === 0) return;

        setSubmissionError(null);
        setIsSubmitting(true);

        try {
            const payload = {
                observaciones: observaciones.trim() || null,
                username: user ?? '',
                items: selectedItems.map(item => ({
                    productoId: item.productoId,
                    loteId: item.loteId,
                    cantidadAveria: item.cantidadAveria,
                })),
            };

            await axios.post(endPoints.averias_almacen_registrar, payload);
            setSubmissionSuccess(true);
        } catch (error) {
            console.error('Error registrando reporte de avería de almacén:', error);
            setSubmissionError('No se pudo registrar el reporte de avería. Intenta nuevamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submissionSuccess) {
        return (
            <Box p={4}>
                <Alert.Root status="success" borderRadius="md" mb={6}>
                    <Alert.Indicator />
                    <Alert.Description>
                        El reporte de avería de almacén se registró exitosamente.
                    </Alert.Description>
                </Alert.Root>
                <Button colorPalette="blue" onClick={onReset}>
                    Nuevo Reporte
                </Button>
            </Box>
        );
    }

    return (
        <Box p={4}>
            <Heading size="md" mb={6}>
                Paso 3: Validar y Realizar Transacción de Almacén
            </Heading>

            <VStack align="stretch" gap={5} mb={6}>
                <Box>
                    <Text fontWeight="bold" mb={2}>Materiales a Reportar como Avería</Text>
                    <Box overflowX="auto">
                        <Table.Root size="sm" variant="simple">
                            <Table.Header>
                                <Table.Row>
                                    <Table.ColumnHeader>Código</Table.ColumnHeader>
                                    <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                    <Table.ColumnHeader>Lote</Table.ColumnHeader>
                                    <Table.ColumnHeader>Unidades</Table.ColumnHeader>
                                    <Table.ColumnHeader textAlign='end'>Cantidad Avería</Table.ColumnHeader>
                                    <Table.ColumnHeader textAlign='end'>Saldo en General</Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {selectedItems.map(item => (
                                    <Table.Row key={`${item.productoId}|${item.loteId}`}>
                                        <Table.Cell>{item.productoId}</Table.Cell>
                                        <Table.Cell>{item.productoNombre}</Table.Cell>
                                        <Table.Cell>{item.batchNumber}</Table.Cell>
                                        <Table.Cell>{item.tipoUnidades}</Table.Cell>
                                        <Table.Cell fontWeight="semibold" color="red.600" textAlign='end'>
                                            {item.cantidadAveria.toFixed(2)}
                                        </Table.Cell>
                                        <Table.Cell textAlign='end'>
                                            {(item.cantidadDisponible - item.cantidadAveria).toFixed(2)}
                                        </Table.Cell>
                                    </Table.Row>
                                ))}
                            </Table.Body>
                        </Table.Root>
                    </Box>
                </Box>

                <Box>
                    <Text fontWeight="bold" mb={2}>Observaciones (opcional)</Text>
                    <Textarea
                        value={observaciones}
                        onValueChange={e => setObservaciones(e.target.value)}
                        placeholder="Escriba observaciones adicionales sobre este reporte de avería..."
                        size="sm"
                        resize="vertical"
                    />
                </Box>

                <Box bg="app.surface" p={4} borderRadius="md" borderWidth="1px">
                    <Field.Root required>
                        <Field.Label>Token de Verificación</Field.Label>
                        <Input
                            value={inputToken}
                            onValueChange={e => setInputToken(e.target.value)}
                            placeholder="Ingrese el token de 4 dígitos"
                            maxLength={4}
                            type="text"
                        />
                        <Text mt={2} fontSize="sm" color="app.textMuted">
                            Token generado: <strong>{token}</strong>
                        </Text>
                    </Field.Root>
                </Box>
            </VStack>

            {submissionError && (
                <Alert.Root status="error" borderRadius="md" mb={4}>
                    <Alert.Indicator />
                    <Alert.Description>{submissionError}</Alert.Description>
                </Alert.Root>
            )}

            <Flex gap={4}>
                <Button
                    variant="outline"
                    onClick={() => setActiveStep(1)}
                    disabled={isSubmitting}
                >
                    Anterior
                </Button>
                <Button
                    colorPalette="green"
                    onClick={handleSubmit}
                    disabled={inputToken !== token}
                    loading={isSubmitting}
                    loadingText="Registrando..."
                >
                    Ejecutar Transacción
                </Button>
            </Flex>
        </Box>
    );
}
