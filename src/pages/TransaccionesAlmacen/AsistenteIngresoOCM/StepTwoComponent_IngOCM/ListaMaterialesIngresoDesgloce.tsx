import { useEffect, useState } from 'react';
import { Box, Flex, Table, Text, Heading, Spinner, Badge } from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";

import { ConsolidadoOCMResponse } from '../../types';
import { ListaConsolidadoDataProps } from '../ingresoOcmTypes';
import { fetchConsolidadoOcm } from '../ocmIngresoApi';

interface ListaMaterialesIngresoDesgloceProps extends ListaConsolidadoDataProps {
    ordenCompraId: number | undefined;
}

export function ListaMaterialesIngresoDesgloce({
    ordenCompraId,
    consolidado: consolidadoProp,
    loading: loadingProp,
    error: errorProp,
}: ListaMaterialesIngresoDesgloceProps) {
    const [localConsolidado, setLocalConsolidado] = useState<ConsolidadoOCMResponse | null>(null);
    const [localLoading, setLocalLoading] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const toast = useAppToast();
    const usingExternalData = consolidadoProp !== undefined;
    const consolidado = usingExternalData ? consolidadoProp : localConsolidado;
    const loading = usingExternalData ? Boolean(loadingProp) : localLoading;
    const error = usingExternalData ? errorProp ?? null : localError;

    useEffect(() => {
        if (usingExternalData) {
            return;
        }

        if (!ordenCompraId) {
            setLocalConsolidado(null);
            return;
        }

        const fetchConsolidado = async () => {
            setLocalLoading(true);
            setLocalError(null);
            try {
                setLocalConsolidado(await fetchConsolidadoOcm(ordenCompraId));
            } catch (error: any) {
                console.error('Error fetching consolidado:', error);
                const errorMessage = error.response?.data?.message ||
                    error.message ||
                    'No se pudo cargar el consolidado de materiales';
                setLocalError(errorMessage);
                toast({
                    title: 'Error al cargar consolidado',
                    description: errorMessage,
                    status: 'error',
                    duration: 4000,
                    isClosable: true
                });
            } finally {
                setLocalLoading(false);
            }
        };

        fetchConsolidado();
    }, [ordenCompraId, toast, usingExternalData]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('es-CO');
        } catch {
            return dateString;
        }
    };

    if (!ordenCompraId) {
        return null;
    }

    if (loading) {
        return (
            <Flex direction="column" gap={4} mt={6} w="full">
                <Heading size="md" fontFamily="Comfortaa Variable">
                    Consolidado de Materiales Recibidos
                </Heading>
                <Flex justify="center" align="center" p={8}>
                    <Spinner size="xl" color="teal.500" />
                </Flex>
            </Flex>
        );
    }

    if (error) {
        return (
            <Flex direction="column" gap={4} mt={6} w="full">
                <Heading size="md" fontFamily="Comfortaa Variable">
                    Consolidado de Materiales Recibidos
                </Heading>
                <Box p={4} bg="red.50" borderRadius="md">
                    <Text color="red.600">{error}</Text>
                </Box>
            </Flex>
        );
    }

    if (!consolidado || !consolidado.materiales || consolidado.materiales.length === 0) {
        return (
            <Flex direction="column" gap={4} mt={6} w="full">
                <Heading size="md" fontFamily="Comfortaa Variable">
                    Consolidado de Materiales Recibidos
                </Heading>
                <Box p={4} bg="app.surfaceSubtle" borderRadius="md">
                    <Text color="app.textMuted" textAlign="center">
                        No hay materiales recibidos para esta orden de compra.
                    </Text>
                </Box>
            </Flex>
        );
    }

    return (
        <Flex direction="column" gap={4} mt={6} w="full">
            <Heading size="md" fontFamily="Comfortaa Variable">
                Consolidado de Materiales Recibidos
            </Heading>
            <Text fontSize="sm" color="app.textMuted">
                Total de transacciones: <strong>{consolidado.totalTransacciones}</strong>
            </Text>

            <Box w="full" bg="app.surface" borderRadius="md" boxShadow="sm" overflowX="auto">
                <Table.Root size="sm" variant="line">
                    <Table.Header bg="app.tableHeader">
                        <Table.Row>
                            <Table.ColumnHeader>Material</Table.ColumnHeader>
                            <Table.ColumnHeader>ID Producto</Table.ColumnHeader>
                            <Table.ColumnHeader>Cantidad Total</Table.ColumnHeader>
                            <Table.ColumnHeader>Unidad</Table.ColumnHeader>
                            <Table.ColumnHeader># Lotes</Table.ColumnHeader>
                            <Table.ColumnHeader>Detalle Lotes</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {consolidado.materiales.map((material) => (
                            <Table.Row key={material.productoId}>
                                <Table.Cell fontWeight="semibold">{material.productoNombre}</Table.Cell>
                                <Table.Cell>{material.productoId}</Table.Cell>
                                <Table.Cell>
                                    <Badge colorPalette="green" fontSize="md">
                                        {material.cantidadTotal.toFixed(2)}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell>{material.tipoUnidades}</Table.Cell>
                                <Table.Cell textAlign="center">
                                    <Badge colorPalette="blue">
                                        {material.lotes.length}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell>
                                    <Box>
                                        {material.lotes.map((lote, idx) => (
                                            <Flex key={idx} gap={2} mb={1} fontSize="xs" alignItems="center">
                                                {lote.batchNumber ? (
                                                    <Badge colorPalette="teal" fontSize="xs">
                                                        {lote.batchNumber}
                                                    </Badge>
                                                ) : (
                                                    <Badge colorPalette="gray" fontSize="xs">
                                                        Sin lote
                                                    </Badge>
                                                )}
                                                <Text>
                                                    {lote.cantidad.toFixed(2)} {material.tipoUnidades}
                                                </Text>
                                                {lote.expirationDate && (
                                                    <Text color="app.textMuted">
                                                        (Vence: {formatDate(lote.expirationDate)})
                                                    </Text>
                                                )}
                                            </Flex>
                                        ))}
                                    </Box>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </Box>
        </Flex>
    );
}
