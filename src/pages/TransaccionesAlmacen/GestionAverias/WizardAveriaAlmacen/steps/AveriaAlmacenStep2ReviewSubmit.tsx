import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    AlertDescription,
    AlertIcon,
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
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
                <Alert status="success" borderRadius="md" mb={6}>
                    <AlertIcon />
                    <AlertDescription>
                        El reporte de avería de almacén se registró exitosamente.
                    </AlertDescription>
                </Alert>
                <Button colorScheme="blue" onClick={onReset}>
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

            <VStack align="stretch" spacing={5} mb={6}>
                <Box>
                    <Text fontWeight="bold" mb={2}>Materiales a Reportar como Avería</Text>
                    <Box overflowX="auto">
                        <Table size="sm" variant="simple">
                            <Thead>
                                <Tr>
                                    <Th>Código</Th>
                                    <Th>Nombre</Th>
                                    <Th>Lote</Th>
                                    <Th>Unidades</Th>
                                    <Th isNumeric>Cantidad Avería</Th>
                                    <Th isNumeric>Saldo en General</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {selectedItems.map(item => (
                                    <Tr key={`${item.productoId}|${item.loteId}`}>
                                        <Td>{item.productoId}</Td>
                                        <Td>{item.productoNombre}</Td>
                                        <Td>{item.batchNumber}</Td>
                                        <Td>{item.tipoUnidades}</Td>
                                        <Td isNumeric fontWeight="semibold" color="red.600">
                                            {item.cantidadAveria.toFixed(2)}
                                        </Td>
                                        <Td isNumeric>
                                            {(item.cantidadDisponible - item.cantidadAveria).toFixed(2)}
                                        </Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    </Box>
                </Box>

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

                <Box bg="white" p={4} borderRadius="md" borderWidth="1px">
                    <FormControl isRequired>
                        <FormLabel>Token de Verificación</FormLabel>
                        <Input
                            value={inputToken}
                            onChange={e => setInputToken(e.target.value)}
                            placeholder="Ingrese el token de 4 dígitos"
                            maxLength={4}
                            type="text"
                        />
                        <Text mt={2} fontSize="sm" color="gray.600">
                            Token generado: <strong>{token}</strong>
                        </Text>
                    </FormControl>
                </Box>
            </VStack>

            {submissionError && (
                <Alert status="error" borderRadius="md" mb={4}>
                    <AlertIcon />
                    <AlertDescription>{submissionError}</AlertDescription>
                </Alert>
            )}

            <Flex gap={4}>
                <Button
                    variant="outline"
                    onClick={() => setActiveStep(1)}
                    isDisabled={isSubmitting}
                >
                    Anterior
                </Button>
                <Button
                    colorScheme="green"
                    onClick={handleSubmit}
                    isDisabled={inputToken !== token}
                    isLoading={isSubmitting}
                    loadingText="Registrando..."
                >
                    Ejecutar Transacción
                </Button>
            </Flex>
        </Box>
    );
}
