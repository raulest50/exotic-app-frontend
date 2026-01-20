import { useState } from "react";
import {
    Button,
    Flex,
    Box,
    Heading,
    useToast,
    Text,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    VStack,
    OrderedList,
    ListItem,
} from "@chakra-ui/react";
import axios from "axios";
import EndPointsURL from "../../../../../api/EndPointsURL.tsx";
import { ProductoSemiter, TIPOS_PRODUCTOS, ProcesoProduccionNode } from "../../../types.tsx";

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
            // Agregar este console.log para imprimir el payload completo
            console.log('Payload enviado al backend para producto terminado/semiterminado:', JSON.stringify(semioter3, null, 2));
            await axios.post(endPoints.save_producto, semioter3);
            toast({
                title: "Producto guardado",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
            onReset();
        } catch (e) {
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

    const handleAtras = () => {
        setActiveStep(2);
    };

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
                        <Text><b>Inventariable:</b> {semioter3.inventareable ? "Sí" : "No"}</Text>
                        {semioter3.observaciones && (
                            <Text><b>Observaciones:</b> {semioter3.observaciones}</Text>
                        )}
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
                            <Heading size="sm" mb={2}>Procesos de producción</Heading>
                            <OrderedList>
                                {(semioter3.procesoProduccionCompleto.procesosProduccion
                                    .filter(p => p.type === "procesoNode") as ProcesoProduccionNode[])
                                    .map(p => {
                                        const data = p.data as { nombreProceso?: string; label?: string };
                                        return <ListItem key={p.id}>{data.nombreProceso ?? data.label}</ListItem>;
                                    })}
                            </OrderedList>
                            <Text mt={2}><b>Rendimiento teórico:</b> {semioter3.procesoProduccionCompleto.rendimientoTeorico}</Text>
                        </Box>
                    )}
                </VStack>
            </Box>
            <Flex gap={10}>
                <Button variant="solid" colorScheme="yellow" onClick={handleAtras} isDisabled={loading}>
                    Atras
                </Button>
                <Button variant="solid" colorScheme="teal" onClick={handleGuardar} isLoading={loading}>
                    Guardar
                </Button>
            </Flex>
        </Flex>
    );
}
