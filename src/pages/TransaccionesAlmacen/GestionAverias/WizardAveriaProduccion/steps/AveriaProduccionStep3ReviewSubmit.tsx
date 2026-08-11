import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Flex, Heading, Input, Table, Text, Textarea, VStack, Field } from '@chakra-ui/react';
import axios from 'axios';
import EndPointsURL from '../../../../../api/EndPointsURL';
import { useAuth } from '../../../../../context/AuthContext';
import {
    AreaProduccion,
    AveriaItemSeleccionado,
    OrdenProduccionDTO,
} from '../WizardAveriaProduccion';

interface AveriaProduccionStep3ReviewSubmitProps {
    setActiveStep: (step: number) => void;
    onReset: () => void;
    selectedArea: AreaProduccion | null;
    selectedOrden: OrdenProduccionDTO | null;
    averiaItems: AveriaItemSeleccionado[];
}

export default function AveriaProduccionStep3ReviewSubmit({
    setActiveStep,
    onReset,
    selectedArea,
    selectedOrden,
    averiaItems,
}: AveriaProduccionStep3ReviewSubmitProps) {
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
        if (!selectedArea || !selectedOrden || averiaItems.length === 0) return;

        setSubmissionError(null);
        setIsSubmitting(true);

        try {
            const payload = {
                ordenProduccionId: selectedOrden.ordenId,
                areaProduccionId: selectedArea.areaId,
                observaciones: observaciones.trim() || null,
                username: user ?? '',
                items: averiaItems.map(item => ({
                    productoId: item.productoId,
                    loteId: item.loteId,
                    cantidadAveria: item.cantidadAveria,
                })),
            };

            await axios.post(endPoints.averias_registrar, payload);
            setSubmissionSuccess(true);
        } catch (error) {
            console.error('Error registrando reporte de avería:', error);
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
                        El reporte de avería se registró exitosamente.
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
                {/* Area info */}
                <Box bg="app.surfaceSubtle" p={4} borderRadius="md">
                    <Text fontWeight="bold" mb={1}>Área Operativa</Text>
                    <Text>{selectedArea?.nombre ?? '—'}</Text>
                </Box>

                {/* Orden info */}
                <Box bg="app.surfaceSubtle" p={4} borderRadius="md">
                    <Text fontWeight="bold" mb={1}>Orden de Producción</Text>
                    <Flex gap={8} wrap="wrap">
                        <Box>
                            <Text fontSize="sm" color="app.textSubtle">Lote</Text>
                            <Text>{selectedOrden?.loteAsignado ?? '—'}</Text>
                        </Box>
                        <Box>
                            <Text fontSize="sm" color="app.textSubtle">Producto</Text>
                            <Text>{selectedOrden?.productoNombre ?? '—'}</Text>
                        </Box>
                        <Box>
                            <Text fontSize="sm" color="app.textSubtle">Cantidad a Producir</Text>
                            <Text>{selectedOrden?.cantidadProducir ?? '—'}</Text>
                        </Box>
                    </Flex>
                </Box>

                {/* Items table */}
                <Box>
                    <Text fontWeight="bold" mb={2}>Materiales a Reportar como Avería</Text>
                    <Box overflowX="auto">
                        <Table.Root size="sm" variant="line">
                            <Table.Header>
                                <Table.Row>
                                    <Table.ColumnHeader>Producto ID</Table.ColumnHeader>
                                    <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                    <Table.ColumnHeader>Lote</Table.ColumnHeader>
                                    <Table.ColumnHeader>Unidades</Table.ColumnHeader>
                                    <Table.ColumnHeader textAlign='end'>Cantidad Avería</Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {averiaItems.map(item => (
                                    <Table.Row key={`${item.productoId}|${item.loteId}`}>
                                        <Table.Cell>{item.productoId}</Table.Cell>
                                        <Table.Cell>{item.productoNombre}</Table.Cell>
                                        <Table.Cell>{item.batchNumber}</Table.Cell>
                                        <Table.Cell>{item.tipoUnidades}</Table.Cell>
                                        <Table.Cell textAlign='end'>{item.cantidadAveria}</Table.Cell>
                                    </Table.Row>
                                ))}
                            </Table.Body>
                        </Table.Root>
                    </Box>
                </Box>

                {/* Observaciones */}
                <Box>
                    <Text fontWeight="bold" mb={2}>Observaciones (opcional)</Text>
                    <Textarea
                        value={observaciones}
                        onChange={e => setObservaciones(e.target.value)}
                        placeholder="Escriba observaciones adicionales sobre este reporte de avería..."
                        size="sm"
                        resize="vertical"
                    />
                </Box>

                {/* Token de verificación */}
                <Box bg="app.surface" p={4} borderRadius="md" borderWidth="1px">
                    <Field.Root required>
                        <Field.Label>Token de Verificación</Field.Label>
                        <Input
                            value={inputToken}
                            onChange={e => setInputToken(e.target.value)}
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
                    onClick={() => setActiveStep(2)}
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
