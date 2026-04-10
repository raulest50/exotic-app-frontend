import {
    Alert,
    AlertDescription,
    AlertIcon,
    Box,
    Button,
    Flex,
    Heading,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    useToast,
    VStack,
} from "@chakra-ui/react";
import axios from "axios";
import { useMemo, useState } from "react";
import EndPointsURL from "../../../../api/EndPointsURL";
import type { EstudiarEliminacionMaterialResponseDTO } from "../types";

interface EliminacionMaterialStep2StudyResultProps {
    setActiveStep: (step: number) => void;
    studyResultMaterial: EstudiarEliminacionMaterialResponseDTO | null;
    onReset: () => void;
}

function formatDate(value: string | null): string {
    if (!value) return "-";
    try {
        return new Date(value).toLocaleString();
    } catch {
        return value;
    }
}

function getTipoMaterialLabel(tipoMaterial: number | null): string {
    if (tipoMaterial === 1) return "Materia prima";
    if (tipoMaterial === 2) return "Material de empaque";
    return "-";
}

export default function EliminacionMaterialStep2StudyResult({
    setActiveStep,
    studyResultMaterial,
    onReset,
}: EliminacionMaterialStep2StudyResultProps) {
    const [isExecuting, setIsExecuting] = useState(false);
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const toast = useToast();

    const handleEjecutarEliminacion = async () => {
        const productoId = studyResultMaterial?.material?.productoId;
        if (!productoId || !studyResultMaterial?.eliminable) return;

        setIsExecuting(true);
        try {
            const url = `${endpoints.ejecutar_eliminacion_material}/${encodeURIComponent(productoId)}`;
            await axios.delete(url, { withCredentials: true });
            toast({
                title: "Eliminación ejecutada",
                description: "El material y sus dependencias hijas se han eliminado correctamente.",
                status: "success",
                duration: 5000,
                isClosable: true,
            });
            onReset();
        } catch (error: unknown) {
            console.error("Error al ejecutar eliminación de material", error);
            const message = axios.isAxiosError(error) && error.response?.data?.message
                ? String(error.response.data.message)
                : "No se pudo ejecutar la eliminación del material.";
            toast({
                title: "Error",
                description: message,
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsExecuting(false);
        }
    };

    if (!studyResultMaterial) {
        return (
            <Box>
                <Text color="gray.600">No hay resultado de estudio disponible.</Text>
                <Flex gap={3} mt={4}>
                    <Button variant="outline" onClick={() => setActiveStep(1)}>
                        Atrás
                    </Button>
                </Flex>
            </Box>
        );
    }

    const {
        material,
        itemsOrdenCompra,
        lotes,
        transaccionesAlmacen,
        asientosContables,
        insumosReceta,
        insumosEmpaque,
        eliminable,
    } = studyResultMaterial;

    return (
        <VStack align="stretch" spacing={6}>
            <Heading size="md">
                Resultado del estudio - Material {material.productoId}
            </Heading>

            <Alert status="info">
                <AlertIcon />
                <AlertDescription>
                    La operación eliminará el material, removerá sus referencias hijas
                    en recetas y case packs, y preservará padres mixtos como OCM o
                    transacciones cuando todavía contengan otros productos.
                </AlertDescription>
            </Alert>

            <Box>
                <Heading size="sm" mb={2}>
                    Material seleccionado
                </Heading>
                <Table size="sm" variant="simple">
                    <Tbody>
                        <Tr>
                            <Td>ID</Td>
                            <Td>{material.productoId}</Td>
                        </Tr>
                        <Tr>
                            <Td>Nombre</Td>
                            <Td>{material.nombre}</Td>
                        </Tr>
                        <Tr>
                            <Td>Tipo</Td>
                            <Td>{getTipoMaterialLabel(material.tipoMaterial)}</Td>
                        </Tr>
                        <Tr>
                            <Td>Unidad</Td>
                            <Td>{material.tipoUnidades ?? "-"}</Td>
                        </Tr>
                    </Tbody>
                </Table>
            </Box>

            <Box>
                <Heading size="sm" mb={2}>
                    Ítems de orden de compra impactados ({itemsOrdenCompra.length})
                </Heading>
                {itemsOrdenCompra.length > 0 ? (
                    <Table size="sm" variant="simple">
                        <Thead>
                            <Tr>
                                <Th>Item ID</Th>
                                <Th>OCM</Th>
                                <Th>Proveedor</Th>
                                <Th>Estado</Th>
                                <Th>Cantidad</Th>
                                <Th>Precio unit.</Th>
                                <Th>Subtotal</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {itemsOrdenCompra.map((item) => (
                                <Tr key={item.itemOrdenId}>
                                    <Td>{item.itemOrdenId}</Td>
                                    <Td>{item.ordenCompraId}</Td>
                                    <Td>{item.proveedorNombre ?? "-"}</Td>
                                    <Td>{item.estadoOrdenCompra ?? "-"}</Td>
                                    <Td>{item.cantidad}</Td>
                                    <Td>{item.precioUnitario.toLocaleString()}</Td>
                                    <Td>{item.subTotal.toLocaleString()}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                ) : (
                    <Text color="gray.500">Ningún ítem de orden de compra.</Text>
                )}
            </Box>

            <Box>
                <Heading size="sm" mb={2}>
                    Recetas impactadas ({insumosReceta.length})
                </Heading>
                {insumosReceta.length > 0 ? (
                    <Table size="sm" variant="simple">
                        <Thead>
                            <Tr>
                                <Th>Insumo ID</Th>
                                <Th>Producto destino</Th>
                                <Th>Nombre</Th>
                                <Th>Tipo</Th>
                                <Th>Cantidad req.</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {insumosReceta.map((insumo) => (
                                <Tr key={`${insumo.productoDestinoId}-${insumo.insumoId}`}>
                                    <Td>{insumo.insumoId}</Td>
                                    <Td>{insumo.productoDestinoId}</Td>
                                    <Td>{insumo.productoDestinoNombre}</Td>
                                    <Td>{insumo.tipoProductoDestino}</Td>
                                    <Td>{insumo.cantidadRequerida}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                ) : (
                    <Text color="gray.500">El material no aparece en recetas activas.</Text>
                )}
            </Box>

            <Box>
                <Heading size="sm" mb={2}>
                    Case packs impactados ({insumosEmpaque.length})
                </Heading>
                {insumosEmpaque.length > 0 ? (
                    <Table size="sm" variant="simple">
                        <Thead>
                            <Tr>
                                <Th>Insumo empaque ID</Th>
                                <Th>Terminado</Th>
                                <Th>Nombre</Th>
                                <Th>Units/case</Th>
                                <Th>Cantidad</Th>
                                <Th>UoM</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {insumosEmpaque.map((insumo) => (
                                <Tr key={`${insumo.terminadoId}-${insumo.insumoEmpaqueId}`}>
                                    <Td>{insumo.insumoEmpaqueId}</Td>
                                    <Td>{insumo.terminadoId}</Td>
                                    <Td>{insumo.terminadoNombre}</Td>
                                    <Td>{insumo.unitsPerCase ?? "-"}</Td>
                                    <Td>{insumo.cantidad}</Td>
                                    <Td>{insumo.uom ?? "-"}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                ) : (
                    <Text color="gray.500">El material no aparece en case packs activos.</Text>
                )}
            </Box>

            <Box>
                <Heading size="sm" mb={2}>
                    Lotes potencialmente eliminados ({lotes.length})
                </Heading>
                {lotes.length > 0 ? (
                    <Table size="sm" variant="simple">
                        <Thead>
                            <Tr>
                                <Th>ID</Th>
                                <Th>Batch</Th>
                                <Th>Fecha prod.</Th>
                                <Th>Fecha venc.</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {lotes.map((lote) => (
                                <Tr key={lote.id}>
                                    <Td>{lote.id}</Td>
                                    <Td>{lote.batchNumber}</Td>
                                    <Td>{lote.productionDate ? formatDate(lote.productionDate) : "-"}</Td>
                                    <Td>{lote.expirationDate ? formatDate(lote.expirationDate) : "-"}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                ) : (
                    <Text color="gray.500">Ningún lote candidato.</Text>
                )}
            </Box>

            <Box>
                <Heading size="sm" mb={2}>
                    Transacciones de almacén impactadas ({transaccionesAlmacen.length})
                </Heading>
                {transaccionesAlmacen.length > 0 ? (
                    <VStack align="stretch" spacing={3}>
                        {transaccionesAlmacen.map((ta) => (
                            <Box key={ta.transaccionId} borderWidth="1px" borderRadius="md" p={3}>
                                <Text fontWeight="medium">
                                    Transacción #{ta.transaccionId} - {formatDate(ta.fechaTransaccion)} -{" "}
                                    {ta.estadoContable ?? "-"}
                                </Text>
                                {ta.observaciones && (
                                    <Text fontSize="sm" color="gray.600">{ta.observaciones}</Text>
                                )}
                                {ta.movimientos.length > 0 && (
                                    <Table size="sm" mt={2} variant="simple">
                                        <Thead>
                                            <Tr>
                                                <Th>Mov. ID</Th>
                                                <Th>Producto</Th>
                                                <Th>Cantidad</Th>
                                                <Th>Tipo</Th>
                                                <Th>Almacén</Th>
                                                <Th>Fecha</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {ta.movimientos.map((movimiento) => (
                                                <Tr key={movimiento.movimientoId}>
                                                    <Td>{movimiento.movimientoId}</Td>
                                                    <Td>{movimiento.productId ?? "-"}</Td>
                                                    <Td>{movimiento.cantidad}</Td>
                                                    <Td>{movimiento.tipoMovimiento ?? "-"}</Td>
                                                    <Td>{movimiento.almacen ?? "-"}</Td>
                                                    <Td>{formatDate(movimiento.fechaMovimiento)}</Td>
                                                </Tr>
                                            ))}
                                        </Tbody>
                                    </Table>
                                )}
                            </Box>
                        ))}
                    </VStack>
                ) : (
                    <Text color="gray.500">Ninguna transacción de almacén.</Text>
                )}
            </Box>

            <Box>
                <Heading size="sm" mb={2}>
                    Asientos contables relacionados ({asientosContables.length})
                </Heading>
                {asientosContables.length > 0 ? (
                    <Table size="sm" variant="simple">
                        <Thead>
                            <Tr>
                                <Th>ID</Th>
                                <Th>Fecha</Th>
                                <Th>Descripción</Th>
                                <Th>Módulo</Th>
                                <Th>Estado</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {asientosContables.map((asiento) => (
                                <Tr key={asiento.id}>
                                    <Td>{asiento.id}</Td>
                                    <Td>{formatDate(asiento.fecha)}</Td>
                                    <Td>{asiento.descripcion ?? "-"}</Td>
                                    <Td>{asiento.modulo ?? "-"}</Td>
                                    <Td>{asiento.estado ?? "-"}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                ) : (
                    <Text color="gray.500">Ningún asiento contable.</Text>
                )}
            </Box>

            <Alert status="warning">
                <AlertIcon />
                <AlertDescription>
                    Los padres mixtos se conservarán. Solo se eliminará por completo una OCM,
                    transacción o lote cuando quede vacío o huérfano después de quitar la parte
                    correspondiente a este material.
                </AlertDescription>
            </Alert>

            <Flex gap={3} mt={4} w="full" justify="space-between">
                <Button variant="outline" onClick={() => setActiveStep(1)}>
                    Atrás
                </Button>
                {eliminable && (
                    <Button
                        colorScheme="teal"
                        onClick={handleEjecutarEliminacion}
                        isLoading={isExecuting}
                        loadingText="Ejecutando..."
                    >
                        Ejecutar eliminación
                    </Button>
                )}
            </Flex>
        </VStack>
    );
}
