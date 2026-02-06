import {
    Box,
    Alert,
    AlertIcon,
    Divider,
    FormControl,
    FormLabel,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Stack,
    Table,
    Tbody,
    Td,
    Text,
    Tr,
    Button,
    useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import { OrdenProduccionDTO } from "../types.tsx";

interface OrdenProduccionDialogDetallesProps {
    isOpen: boolean;
    onClose: () => void;
    orden: OrdenProduccionDTO | null;
    onCanceled?: () => void;
}

const formatValue = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) {
        return "-";
    }

    if (typeof value === "string" && value.trim().length === 0) {
        return "-";
    }

    return String(value);
};

export default function OrdenProduccionDialogDetalles({
    isOpen,
    onClose,
    orden,
    onCanceled,
}: OrdenProduccionDialogDetallesProps) {
    const [isDeletable, setIsDeletable] = useState(false);
    const [randomToken, setRandomToken] = useState("");
    const [inputToken, setInputToken] = useState("");
    const [cancelLoading, setCancelLoading] = useState(false);

    const toast = useToast();
    const endPoints = useMemo(() => new EndPointsURL(), []);

    useEffect(() => {
        if (isOpen && orden) {
            const token = Math.floor(1000 + Math.random() * 9000).toString();
            setRandomToken(token);
            setInputToken("");
            checkIfDeletable(orden.ordenId);
        }
    }, [isOpen, orden]);

    const resetState = () => {
        setIsDeletable(false);
        setRandomToken("");
        setInputToken("");
        setCancelLoading(false);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const checkIfDeletable = async (ordenId: number) => {
        try {
            const url = endPoints.is_deletable_orden_produccion.replace("{id}", ordenId.toString());
            const response = await axios.get(url);
            setIsDeletable(response.data.deletable === true);
        } catch (error) {
            setIsDeletable(false);
        }
    };

    const handleCancel = async () => {
        if (!orden) return;

        if (inputToken !== randomToken) {
            toast({
                title: "Token incorrecto",
                description: "El token ingresado no coincide con el token de confirmación",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setCancelLoading(true);
        try {
            const url = endPoints.cancel_orden_produccion.replace("{id}", orden.ordenId.toString());
            await axios.put(url);

            toast({
                title: "Orden cancelada",
                description: "La orden de producción ha sido cancelada correctamente",
                status: "success",
                duration: 5000,
                isClosable: true,
            });

            onCanceled?.();
            handleClose();
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo cancelar la orden de producción",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setCancelLoading(false);
        }
    };

    if (!orden) {
        return null;
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="4xl" isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Detalles de Orden #{orden.ordenId}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <Stack spacing={4} divider={<Divider />}>
                        <Box>
                            <Text fontWeight="bold">Producto</Text>
                            <Text>{orden.productoNombre}</Text>
                            <Text color="gray.600" fontSize="sm">
                                ID: {formatValue(orden.productoId)} • Tipo: {formatValue(orden.productoTipo)} • Unidad: {formatValue(orden.productoUnidad)}
                            </Text>
                            <Text color="gray.600" fontSize="sm">
                                Categoría: {formatValue(orden.productoCategoriaNombre ?? orden.productoCategoriaId)}
                            </Text>
                        </Box>

                        <Box>
                            <Text fontWeight="bold">Fechas</Text>
                            <Text fontSize="sm">Inicio: {formatValue(orden.fechaInicio)}</Text>
                            <Text fontSize="sm">Lanzamiento: {formatValue(orden.fechaLanzamiento)}</Text>
                            <Text fontSize="sm">Fin planificada: {formatValue(orden.fechaFinalPlanificada)}</Text>
                        </Box>

                        <Box>
                            <Text fontWeight="bold">Información de Producción</Text>
                            <Text fontSize="sm">Cantidad a producir: {formatValue(orden.cantidadProducir)}</Text>
                            <Text fontSize="sm">Estado: {formatValue(orden.estadoOrden)}</Text>
                            <Text fontSize="sm">Pedido comercial: {formatValue(orden.numeroPedidoComercial)}</Text>
                            <Text fontSize="sm">Área operativa: {formatValue(orden.areaOperativa)}</Text>
                            <Text fontSize="sm">Departamento operativo: {formatValue(orden.departamentoOperativo)}</Text>
                        </Box>

                        <Box>
                            <Text fontWeight="bold">Observaciones</Text>
                            <Text whiteSpace="pre-wrap">{formatValue(orden.observaciones)}</Text>
                        </Box>

                        <Box>
                            <Text fontWeight="bold" mb={2}>
                                Seguimiento de insumos
                            </Text>
                            {orden.ordenesSeguimiento.length === 0 ? (
                                <Text fontSize="sm" color="gray.600">
                                    No hay seguimiento registrado.
                                </Text>
                            ) : (
                                <Table size="sm" variant="simple">
                                    <Tbody>
                                        {orden.ordenesSeguimiento.map((seguimiento) => (
                                            <Tr key={seguimiento.seguimientoId}>
                                                <Td>{seguimiento.insumoNombre}</Td>
                                                <Td>Cant.: {seguimiento.cantidadRequerida}</Td>
                                                <Td>Estado: {seguimiento.estado}</Td>
                                            </Tr>
                                        ))}
                                    </Tbody>
                                </Table>
                            )}
                        </Box>

                        {isDeletable && (
                            <Box>
                                <Text fontWeight="bold" mb={3} color="red.500">
                                    Cancelar orden de producción
                                </Text>
                                <Divider mb={4} />
                                <Stack spacing={4}>
                                    <Alert status="warning">
                                        <AlertIcon />
                                        Esta acción no se puede deshacer. La orden será cancelada definitivamente.
                                    </Alert>

                                    <Text fontWeight="bold">Token de confirmación: {randomToken}</Text>

                                    <FormControl>
                                        <FormLabel>Ingrese el token de confirmación:</FormLabel>
                                        <Input
                                            value={inputToken}
                                            onChange={(e) => setInputToken(e.target.value)}
                                            placeholder="Ingrese el token de 4 dígitos"
                                        />
                                    </FormControl>

                                    <Button
                                        colorScheme="red"
                                        onClick={handleCancel}
                                        isLoading={cancelLoading}
                                        loadingText="Cancelando..."
                                        isDisabled={inputToken !== randomToken}
                                    >
                                        Cancelar orden de producción
                                    </Button>
                                </Stack>
                            </Box>
                        )}
                    </Stack>
                </ModalBody>
                <ModalFooter>
                    <Button colorScheme="blue" onClick={handleClose}>
                        Cerrar
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
