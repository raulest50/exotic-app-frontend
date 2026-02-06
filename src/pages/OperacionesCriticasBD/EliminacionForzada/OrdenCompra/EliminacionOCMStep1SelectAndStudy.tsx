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
import OrdenCompraPicker from "../../../Compras/components/OrdenCompraPicker";
import EndPointsURL from "../../../../api/EndPointsURL";
import type { OrdenCompraMateriales } from "../../../Compras/types";
import type { EstudiarEliminacionOCMResponseDTO } from "../types";

interface EliminacionOCMStep1SelectAndStudyProps {
    setActiveStep: (step: number) => void;
    ordenSeleccionada: OrdenCompraMateriales | null;
    setOrdenSeleccionada: (orden: OrdenCompraMateriales | null) => void;
    setStudyResult: (result: EstudiarEliminacionOCMResponseDTO | null) => void;
}

export default function EliminacionOCMStep1SelectAndStudy({
    setActiveStep,
    ordenSeleccionada,
    setOrdenSeleccionada,
    setStudyResult,
}: EliminacionOCMStep1SelectAndStudyProps) {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [isStudying, setIsStudying] = useState(false);
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const toast = useToast();

    const handleEstudiarEliminacion = async () => {
        const ordenCompraId = ordenSeleccionada?.ordenCompraId;
        if (ordenCompraId == null) return;
        setIsStudying(true);
        try {
            const url = `${endpoints.estudiar_eliminacion_orden_compra}/${ordenCompraId}`;
            const response = await axios.get<EstudiarEliminacionOCMResponseDTO>(url, {
                withCredentials: true,
            });
            setStudyResult(response.data);
            setActiveStep(2);
        } catch (error: unknown) {
            console.error("Error al estudiar eliminación", error);
            const message = axios.isAxiosError(error) && error.response?.data?.message
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
                <Heading size="md">Orden de compra a eliminar</Heading>
                <Text color="gray.600">
                    Seleccione la orden de compra sobre la cual desea estudiar la eliminación forzada.
                    El estudio mostrará todos los registros que referencian esta orden (ítems, lotes,
                    transacciones de almacén, asientos contables) y que habría que eliminar o ajustar.
                </Text>
                <Button
                    w="full"
                    justifyContent="flex-start"
                    colorScheme="teal"
                    onClick={onOpen}
                    variant="outline"
                >
                    {ordenSeleccionada
                        ? `Orden #${ordenSeleccionada.ordenCompraId} - ${ordenSeleccionada.proveedor?.nombre ?? "Sin proveedor"}`
                        : "Seleccionar orden de compra"}
                </Button>
                <Flex gap={3} w="full" justify="space-between">
                    <Button variant="outline" onClick={() => setActiveStep(0)}>
                        Atrás
                    </Button>
                    <Button
                        colorScheme="teal"
                        onClick={handleEstudiarEliminacion}
                        isDisabled={ordenSeleccionada == null}
                        isLoading={isStudying}
                        loadingText="Estudiando..."
                    >
                        Estudiar eliminación y continuar
                    </Button>
                </Flex>
            </VStack>

            <OrdenCompraPicker
                isOpen={isOpen}
                onClose={onClose}
                onSelectOrden={(orden) => {
                    setOrdenSeleccionada(orden);
                    onClose();
                }}
            />
        </Box>
    );
}
