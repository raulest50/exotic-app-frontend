import { useState } from "react";
import {
    Box,
    Button,
    Flex,
    Heading,
    Table,
    Text,
    VStack,
    List,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from "axios";
import EndPointsURL from "../../../../../api/EndPointsURL.tsx";
import { ProductoSemiter, TIPOS_PRODUCTOS } from "../../../types.tsx";
import { getProcessNodeSummaries, toProductoManufacturingPayload } from "../../../manufacturingMapper.ts";

interface Props {
    setActiveStep: (step: number) => void;
    semioter3: ProductoSemiter;
    onReset: () => void;
}

function getAxiosErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.error
            ?? error.response?.data?.message
            ?? error.response?.data?.mensaje
            ?? error.message
            ?? fallback;
    }
    return error instanceof Error ? error.message : fallback;
}

export default function SemiterminadosStep3Confirmation({ setActiveStep, semioter3, onReset }: Props) {
    const toast = useAppToast();
    const [loading, setLoading] = useState(false);
    const endPoints = new EndPointsURL();

    const handleGuardar = async () => {
        try {
            setLoading(true);
            const payload = toProductoManufacturingPayload(semioter3);
            await axios.post(endPoints.create_producto_manufacturing, payload);
            toast({
                title: "Producto guardado",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
            onReset();
        } catch (error) {
            console.error("Error guardando producto con manufacturing:", error);
            toast({
                title: "Error",
                description: getAxiosErrorMessage(error, "No se pudo guardar el producto"),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const procesos = getProcessNodeSummaries(semioter3.procesoProduccionCompleto);

    return (
        <Flex direction="column" align="center" gap={4} w="full">
            <Heading size="md">Resumen del Producto</Heading>
            <Box w="full" bg="app.surfaceSubtle" p={4} borderRadius="md" maxH="300px" overflowY="auto">
                <VStack align="start" gap={4} w="full">
                    <VStack align="start" w="full" gap={1}>
                        <Text><b>Codigo:</b> {semioter3.productoId}</Text>
                        <Text><b>Nombre:</b> {semioter3.nombre}</Text>
                        <Text><b>Tipo de producto:</b> {semioter3.tipo_producto === TIPOS_PRODUCTOS.terminado ? "Terminado" : "Semiterminado"}</Text>
                        <Text><b>Unidades:</b> {semioter3.tipoUnidades}</Text>
                        <Text><b>Cantidad por unidad:</b> {semioter3.cantidadUnidad}</Text>
                        <Text><b>Costo:</b> {semioter3.costo}</Text>
                        <Text><b>Inventariable:</b> {semioter3.inventareable ? "Si" : "No"}</Text>
                        {semioter3.observaciones && <Text><b>Observaciones:</b> {semioter3.observaciones}</Text>}
                    </VStack>

                    {semioter3.insumos && semioter3.insumos.length > 0 && (
                        <Box w="full">
                            <Heading size="sm" mb={2}>Insumos</Heading>
                            <Table.Root size="sm" variant="line">
                                <Table.Header>
                                    <Table.Row>
                                        <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign='end'>Cantidad</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign='end'>Subtotal</Table.ColumnHeader>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {semioter3.insumos.map((insumo, idx) => (
                                        <Table.Row key={idx}>
                                            <Table.Cell>{insumo.producto.nombre}</Table.Cell>
                                            <Table.Cell textAlign='end'>{insumo.cantidadRequerida}</Table.Cell>
                                            <Table.Cell textAlign='end'>{insumo.subtotal}</Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table.Root>
                        </Box>
                    )}

                    {semioter3.procesoProduccionCompleto && (
                        <Box w="full">
                            <Heading size="sm" mb={2}>Procesos de produccion</Heading>
                            <List.Root as='ol'>
                                {procesos.map((nombreProceso, index) => (
                                    <List.Item key={`${nombreProceso}-${index}`}>{nombreProceso}</List.Item>
                                ))}
                            </List.Root>
                            <Text mt={2}><b>Rendimiento teorico:</b> {semioter3.procesoProduccionCompleto.rendimientoTeorico}</Text>
                        </Box>
                    )}
                </VStack>
            </Box>
            <Flex gap={10}>
                <Button variant="solid" colorPalette="yellow" onClick={() => setActiveStep(2)} disabled={loading}>
                    Atras
                </Button>
                <Button variant="solid" colorPalette="teal" onClick={handleGuardar} loading={loading}>
                    Guardar
                </Button>
            </Flex>
        </Flex>
    );
}
