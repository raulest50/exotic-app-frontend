import {
    Box,
    Button,
    Flex,
    Heading,
    Text,
    useDisclosure,
    useToast,
    VStack,
} from "@chakra-ui/react";
import axios from "axios";
import { useMemo, useState } from "react";
import OrdenProduccionPicker, {
    type OrdenProduccionPickItem,
} from "./OrdenProduccionPicker";
import EndPointsURL from "../../../../api/EndPointsURL";
import type { EstudiarEliminacionOPResponseDTO } from "../types";

interface EliminacionOPStep1SelectAndStudyProps {
    setActiveStep: (step: number) => void;
    ordenProduccionSeleccionada: OrdenProduccionPickItem | null;
    setOrdenProduccionSeleccionada: (
        orden: OrdenProduccionPickItem | null
    ) => void;
    setStudyResultOP: (result: EstudiarEliminacionOPResponseDTO | null) => void;
}

export default function EliminacionOPStep1SelectAndStudy({
    setActiveStep,
    ordenProduccionSeleccionada,
    setOrdenProduccionSeleccionada,
    setStudyResultOP,
}: EliminacionOPStep1SelectAndStudyProps) {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [isStudying, setIsStudying] = useState(false);
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const toast = useToast();

    const handleEstudiarEliminacion = async () => {
        const ordenId = ordenProduccionSeleccionada?.ordenId;
        if (ordenId == null) return;
        setIsStudying(true);
        try {
            const url = `${endpoints.estudiar_eliminacion_orden_produccion}/${ordenId}`;
            const response = await axios.get<EstudiarEliminacionOPResponseDTO>(
                url,
                { withCredentials: true }
            );
            setStudyResultOP(response.data);
            setActiveStep(2);
        } catch (error: unknown) {
            console.error("Error al estudiar eliminación OP", error);
            const message =
                axios.isAxiosError(error) && error.response?.data?.message
                    ? String(error.response.data.message)
                    : "No se pudo obtener el estudio de eliminación.";
            toast({
                title: "Error",
                description: message,
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsStudying(false);
        }
    };

    return (
        <Box>
            <VStack align="stretch" spacing={4}>
                <Heading size="md">Orden de producción a eliminar</Heading>
                <Text color="gray.600">
                    Seleccione la orden de producción sobre la cual desea estudiar
                    la eliminación forzada. Solo se puede eliminar si no tiene
                    transacciones de almacén asociadas (dispensaciones, etc.).
                </Text>
                <Button
                    w="full"
                    justifyContent="flex-start"
                    colorScheme="teal"
                    onClick={onOpen}
                    variant="outline"
                >
                    {ordenProduccionSeleccionada
                        ? `Orden #${ordenProduccionSeleccionada.ordenId} - ${ordenProduccionSeleccionada.productoNombre}`
                        : "Seleccionar orden de producción"}
                </Button>
                <Flex gap={3} w="full" justify="space-between">
                    <Button variant="outline" onClick={() => setActiveStep(0)}>
                        Atrás
                    </Button>
                    <Button
                        colorScheme="teal"
                        onClick={handleEstudiarEliminacion}
                        isDisabled={ordenProduccionSeleccionada == null}
                        isLoading={isStudying}
                        loadingText="Estudiando..."
                    >
                        Estudiar eliminación y continuar
                    </Button>
                </Flex>
            </VStack>

            <OrdenProduccionPicker
                isOpen={isOpen}
                onClose={onClose}
                onSelectOrden={(orden) => {
                    setOrdenProduccionSeleccionada(orden);
                    onClose();
                }}
            />
        </Box>
    );
}
