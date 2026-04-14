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
    Text,
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

const formatDateTimeValue = (value: string | null | undefined): string => {
    if (value === null || value === undefined) {
        return "-";
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
        return "-";
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
        return "-";
    }

    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = parsed.getFullYear();
    const minutes = String(parsed.getMinutes()).padStart(2, "0");
    const hours24 = parsed.getHours();
    const period = hours24 >= 12 ? "PM" : "AM";
    const hours12 = String(hours24 % 12 || 12).padStart(2, "0");

    return `${day}/${month}/${year}, ${hours12}:${minutes} ${period}`;
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
                description: "El token ingresado no coincide con el token de confirmaci\u00F3n",
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
                description: "La orden de producci\u00F3n ha sido cancelada correctamente",
                status: "success",
                duration: 5000,
                isClosable: true,
            });

            onCanceled?.();
            handleClose();
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo cancelar la orden de producci\u00F3n",
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
                                ID: {formatValue(orden.productoId)}
                                {" \u2022 "}
                                Tipo: {formatValue(orden.productoTipo)}
                                {" \u2022 "}
                                Unidad: {formatValue(orden.productoUnidad)}
                            </Text>
                            <Text color="gray.600" fontSize="sm">
                                {"Categor\u00EDa: "}
                                {formatValue(orden.productoCategoriaNombre ?? orden.productoCategoriaId)}
                            </Text>
                        </Box>

                        <Box>
                            <Text fontWeight="bold">Fechas</Text>
                            <Text fontSize="sm">{"Fecha de creaci\u00F3n: "}{formatDateTimeValue(orden.fechaCreacion)}</Text>
                            <Text fontSize="sm">Inicio: {formatValue(orden.fechaInicio)}</Text>
                            <Text fontSize="sm">Lanzamiento: {formatValue(orden.fechaLanzamiento)}</Text>
                            <Text fontSize="sm">Fin planificada: {formatValue(orden.fechaFinalPlanificada)}</Text>
                        </Box>

                        <Box>
                            <Text fontWeight="bold">{"Informaci\u00F3n de Producci\u00F3n"}</Text>
                            <Text fontSize="sm">Cantidad a producir: {formatValue(orden.cantidadProducir)}</Text>
                            <Text fontSize="sm">Estado: {formatValue(orden.estadoOrden)}</Text>
                            <Text fontSize="sm">Pedido comercial: {formatValue(orden.numeroPedidoComercial)}</Text>
                            <Text fontSize="sm">{"\u00C1rea operativa: "}{formatValue(orden.areaOperativa)}</Text>
                            <Text fontSize="sm">Departamento operativo: {formatValue(orden.departamentoOperativo)}</Text>
                        </Box>

                        <Box>
                            <Text fontWeight="bold">Observaciones</Text>
                            <Text whiteSpace="pre-wrap">{formatValue(orden.observaciones)}</Text>
                        </Box>

                        {isDeletable && (
                            <Box>
                                <Text fontWeight="bold" mb={3} color="red.500">
                                    {"Cancelar orden de producci\u00F3n"}
                                </Text>
                                <Divider mb={4} />
                                <Stack spacing={4}>
                                    <Alert status="warning">
                                        <AlertIcon />
                                        {"Esta acci\u00F3n no se puede deshacer. La orden ser\u00E1 cancelada definitivamente."}
                                    </Alert>

                                    <Text fontWeight="bold">{"Token de confirmaci\u00F3n: "}{randomToken}</Text>

                                    <FormControl>
                                        <FormLabel>{"Ingrese el token de confirmaci\u00F3n:"}</FormLabel>
                                        <Input
                                            value={inputToken}
                                            onChange={(e) => setInputToken(e.target.value)}
                                            placeholder="Ingrese el token de 4 d\u00EDgitos"
                                        />
                                    </FormControl>

                                    <Button
                                        colorScheme="red"
                                        onClick={handleCancel}
                                        isLoading={cancelLoading}
                                        loadingText="Cancelando..."
                                        isDisabled={inputToken !== randomToken}
                                    >
                                        {"Cancelar orden de producci\u00F3n"}
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
