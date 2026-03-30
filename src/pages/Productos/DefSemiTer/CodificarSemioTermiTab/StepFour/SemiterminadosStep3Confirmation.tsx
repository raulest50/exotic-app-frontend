import { useState } from "react";
import {
    Box,
    Button,
    Flex,
    Heading,
    ListItem,
    OrderedList,
    Table,
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
import EndPointsURL from "../../../../../api/EndPointsURL.tsx";
import { ProductoSemiter, TIPOS_PRODUCTOS } from "../../../types.tsx";
import { getProcessNodeSummaries, toProductoManufacturingPayload } from "../../../manufacturingMapper.ts";

interface Props {
    setActiveStep: (step: number) => void;
    semioter3: ProductoSemiter;
    onReset: () => void;
}

export default function SemiterminadosStep3Confirmation({ setActiveStep, semioter3, onReset }: Props) {
    const toast = useToast();
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
                description: "No se pudo guardar el producto",
                status: "error",
                duration: 3000,
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
            <Box w="full" bg="gray.50" p={4} borderRadius="md" maxH="300px" overflowY="auto">
                <VStack align="start" spacing={4} w="full">
                    <VStack align="start" w="full" spacing={1}>
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
                            <Table size="sm" variant="simple">
                                <Thead>
                                    <Tr>
                                        <Th>Nombre</Th>
                                        <Th isNumeric>Cantidad</Th>
                                        <Th isNumeric>Subtotal</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {semioter3.insumos.map((insumo, idx) => (
                                        <Tr key={idx}>
                                            <Td>{insumo.producto.nombre}</Td>
                                            <Td isNumeric>{insumo.cantidadRequerida}</Td>
                                            <Td isNumeric>{insumo.subtotal}</Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </Box>
                    )}

                    {semioter3.procesoProduccionCompleto && (
                        <Box w="full">
                            <Heading size="sm" mb={2}>Procesos de produccion</Heading>
                            <OrderedList>
                                {procesos.map((nombreProceso, index) => (
                                    <ListItem key={`${nombreProceso}-${index}`}>{nombreProceso}</ListItem>
                                ))}
                            </OrderedList>
                            <Text mt={2}><b>Rendimiento teorico:</b> {semioter3.procesoProduccionCompleto.rendimientoTeorico}</Text>
                        </Box>
                    )}
                </VStack>
            </Box>
            <Flex gap={10}>
                <Button variant="solid" colorScheme="yellow" onClick={() => setActiveStep(2)} isDisabled={loading}>
                    Atras
                </Button>
                <Button variant="solid" colorScheme="teal" onClick={handleGuardar} isLoading={loading}>
                    Guardar
                </Button>
            </Flex>
        </Flex>
    );
}
