import {
    Steps,
    Alert,
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
    VStack,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
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
    const toast = useAppToast();

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
                <Text color="app.textMuted">No hay resultado de estudio disponible.</Text>
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
        <VStack align="stretch" gap={6}>
            <Heading size="md">
                Resultado del estudio - Material {material.productoId}
            </Heading>

            <Alert.Root status="info">
                <Alert.Indicator />
                <Alert.Description>
                    La operación eliminará el material, removerá sus referencias hijas
                    en recetas y case packs, y preservará padres mixtos como OCM o
                    transacciones cuando todavía contengan otros productos.
                </Alert.Description>
            </Alert.Root>

            <Box>
                <Heading size="sm" mb={2}>
                    Material seleccionado
                </Heading>
                <Table.Root size="sm" variant="simple">
                    <Table.Body>
                        <Table.Row>
                            <Table.Cell>ID</Table.Cell>
                            <Table.Cell>{material.productoId}</Table.Cell>
                        </Table.Row>
                        <Table.Row>
                            <Table.Cell>Nombre</Table.Cell>
                            <Table.Cell>{material.nombre}</Table.Cell>
                        </Table.Row>
                        <Table.Row>
                            <Table.Cell>Tipo</Table.Cell>
                            <Table.Cell>{getTipoMaterialLabel(material.tipoMaterial)}</Table.Cell>
                        </Table.Row>
                        <Table.Row>
                            <Table.Cell>Unidad</Table.Cell>
                            <Table.Cell>{material.tipoUnidades ?? "-"}</Table.Cell>
                        </Table.Row>
                    </Table.Body>
                </Table.Root>
            </Box>

            <Box>
                <Heading size="sm" mb={2}>
                    Ítems de orden de compra impactados ({itemsOrdenCompra.length})
                </Heading>
                {itemsOrdenCompra.length > 0 ? (
                    <Table.Root size="sm" variant="simple">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>Item ID</Table.ColumnHeader>
                                <Table.ColumnHeader>OCM</Table.ColumnHeader>
                                <Table.ColumnHeader>Proveedor</Table.ColumnHeader>
                                <Table.ColumnHeader>Estado</Table.ColumnHeader>
                                <Table.ColumnHeader>Cantidad</Table.ColumnHeader>
                                <Table.ColumnHeader>Precio unit.</Table.ColumnHeader>
                                <Table.ColumnHeader>Subtotal</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {itemsOrdenCompra.map((item) => (
                                <Table.Row key={item.itemOrdenId}>
                                    <Table.Cell>{item.itemOrdenId}</Table.Cell>
                                    <Table.Cell>{item.ordenCompraId}</Table.Cell>
                                    <Table.Cell>{item.proveedorNombre ?? "-"}</Table.Cell>
                                    <Table.Cell>{item.estadoOrdenCompra ?? "-"}</Table.Cell>
                                    <Table.Cell>{item.cantidad}</Table.Cell>
                                    <Table.Cell>{item.precioUnitario.toLocaleString()}</Table.Cell>
                                    <Table.Cell>{item.subTotal.toLocaleString()}</Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                ) : (
                    <Text color="app.textSubtle">Ningún ítem de orden de compra.</Text>
                )}
            </Box>

            <Box>
                <Heading size="sm" mb={2}>
                    Recetas impactadas ({insumosReceta.length})
                </Heading>
                {insumosReceta.length > 0 ? (
                    <Table.Root size="sm" variant="simple">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>Insumo ID</Table.ColumnHeader>
                                <Table.ColumnHeader>Producto destino</Table.ColumnHeader>
                                <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                <Table.ColumnHeader>Tipo</Table.ColumnHeader>
                                <Table.ColumnHeader>Cantidad req.</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {insumosReceta.map((insumo) => (
                                <Table.Row key={`${insumo.productoDestinoId}-${insumo.insumoId}`}>
                                    <Table.Cell>{insumo.insumoId}</Table.Cell>
                                    <Table.Cell>{insumo.productoDestinoId}</Table.Cell>
                                    <Table.Cell>{insumo.productoDestinoNombre}</Table.Cell>
                                    <Table.Cell>{insumo.tipoProductoDestino}</Table.Cell>
                                    <Table.Cell>{insumo.cantidadRequerida}</Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                ) : (
                    <Text color="app.textSubtle">El material no aparece en recetas activas.</Text>
                )}
            </Box>

            <Box>
                <Heading size="sm" mb={2}>
                    Case packs impactados ({insumosEmpaque.length})
                </Heading>
                {insumosEmpaque.length > 0 ? (
                    <Table.Root size="sm" variant="simple">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>Insumo empaque ID</Table.ColumnHeader>
                                <Table.ColumnHeader>Terminado</Table.ColumnHeader>
                                <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                <Table.ColumnHeader>Units/case</Table.ColumnHeader>
                                <Table.ColumnHeader>Cantidad</Table.ColumnHeader>
                                <Table.ColumnHeader>UoM</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {insumosEmpaque.map((insumo) => (
                                <Table.Row key={`${insumo.terminadoId}-${insumo.insumoEmpaqueId}`}>
                                    <Table.Cell>{insumo.insumoEmpaqueId}</Table.Cell>
                                    <Table.Cell>{insumo.terminadoId}</Table.Cell>
                                    <Table.Cell>{insumo.terminadoNombre}</Table.Cell>
                                    <Table.Cell>{insumo.unitsPerCase ?? "-"}</Table.Cell>
                                    <Table.Cell>{insumo.cantidad}</Table.Cell>
                                    <Table.Cell>{insumo.uom ?? "-"}</Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                ) : (
                    <Text color="app.textSubtle">El material no aparece en case packs activos.</Text>
                )}
            </Box>

            <Box>
                <Heading size="sm" mb={2}>
                    Lotes potencialmente eliminados ({lotes.length})
                </Heading>
                {lotes.length > 0 ? (
                    <Table.Root size="sm" variant="simple">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>ID</Table.ColumnHeader>
                                <Table.ColumnHeader>Batch</Table.ColumnHeader>
                                <Table.ColumnHeader>Fecha prod.</Table.ColumnHeader>
                                <Table.ColumnHeader>Fecha venc.</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {lotes.map((lote) => (
                                <Table.Row key={lote.id}>
                                    <Table.Cell>{lote.id}</Table.Cell>
                                    <Table.Cell>{lote.batchNumber}</Table.Cell>
                                    <Table.Cell>{lote.productionDate ? formatDate(lote.productionDate) : "-"}</Table.Cell>
                                    <Table.Cell>{lote.expirationDate ? formatDate(lote.expirationDate) : "-"}</Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                ) : (
                    <Text color="app.textSubtle">Ningún lote candidato.</Text>
                )}
            </Box>

            <Box>
                <Heading size="sm" mb={2}>
                    Transacciones de almacén impactadas ({transaccionesAlmacen.length})
                </Heading>
                {transaccionesAlmacen.length > 0 ? (
                    <VStack align="stretch" gap={3}>
                        {transaccionesAlmacen.map((ta) => (
                            <Box key={ta.transaccionId} borderWidth="1px" borderRadius="md" p={3}>
                                <Text fontWeight="medium">
                                    Transacción #{ta.transaccionId} - {formatDate(ta.fechaTransaccion)} -{" "}
                                    {ta.estadoContable ?? "-"}
                                </Text>
                                {ta.observaciones && (
                                    <Text fontSize="sm" color="app.textMuted">{ta.observaciones}</Text>
                                )}
                                {ta.movimientos.length > 0 && (
                                    <Table.Root size="sm" mt={2} variant="simple">
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.ColumnHeader>Mov. ID</Table.ColumnHeader>
                                                <Table.ColumnHeader>Producto</Table.ColumnHeader>
                                                <Table.ColumnHeader>Cantidad</Table.ColumnHeader>
                                                <Table.ColumnHeader>Tipo</Table.ColumnHeader>
                                                <Table.ColumnHeader>Almacén</Table.ColumnHeader>
                                                <Table.ColumnHeader>Fecha</Table.ColumnHeader>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {ta.movimientos.map((movimiento) => (
                                                <Table.Row key={movimiento.movimientoId}>
                                                    <Table.Cell>{movimiento.movimientoId}</Table.Cell>
                                                    <Table.Cell>{movimiento.productId ?? "-"}</Table.Cell>
                                                    <Table.Cell>{movimiento.cantidad}</Table.Cell>
                                                    <Table.Cell>{movimiento.tipoMovimiento ?? "-"}</Table.Cell>
                                                    <Table.Cell>{movimiento.almacen ?? "-"}</Table.Cell>
                                                    <Table.Cell>{formatDate(movimiento.fechaMovimiento)}</Table.Cell>
                                                </Table.Row>
                                            ))}
                                        </Table.Body>
                                    </Table.Root>
                                )}
                            </Box>
                        ))}
                    </VStack>
                ) : (
                    <Text color="app.textSubtle">Ninguna transacción de almacén.</Text>
                )}
            </Box>

            <Box>
                <Heading size="sm" mb={2}>
                    Asientos contables relacionados ({asientosContables.length})
                </Heading>
                {asientosContables.length > 0 ? (
                    <Table.Root size="sm" variant="simple">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>ID</Table.ColumnHeader>
                                <Table.ColumnHeader>Fecha</Table.ColumnHeader>
                                <Table.ColumnHeader>Descripción</Table.ColumnHeader>
                                <Table.ColumnHeader>Módulo</Table.ColumnHeader>
                                <Table.ColumnHeader>Estado</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {asientosContables.map((asiento) => (
                                <Table.Row key={asiento.id}>
                                    <Table.Cell>{asiento.id}</Table.Cell>
                                    <Table.Cell>{formatDate(asiento.fecha)}</Table.Cell>
                                    <Table.Cell>{asiento.descripcion ?? "-"}</Table.Cell>
                                    <Table.Cell>{asiento.modulo ?? "-"}</Table.Cell>
                                    <Table.Cell>{asiento.estado ?? "-"}</Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                ) : (
                    <Text color="app.textSubtle">Ningún asiento contable.</Text>
                )}
            </Box>

            <Alert.Root status="warning">
                <Alert.Indicator />
                <Alert.Description>
                    Los padres mixtos se conservarán. Solo se eliminará por completo una OCM,
                    transacción o lote cuando quede vacío o huérfano después de quitar la parte
                    correspondiente a este material.
                </Alert.Description>
            </Alert.Root>

            <Flex gap={3} mt={4} w="full" justify="space-between">
                <Button variant="outline" onClick={() => setActiveStep(1)}>
                    Atrás
                </Button>
                {eliminable && (
                    <Button
                        colorPalette="teal"
                        onClick={handleEjecutarEliminacion}
                        loading={isExecuting}
                        loadingText="Ejecutando..."
                    >
                        Ejecutar eliminación
                    </Button>
                )}
            </Flex>
        </VStack>
    );
}
