import { Box, Button, Flex, Heading, Text, useDisclosure, VStack } from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from "axios";
import { useMemo, useState } from "react";
import EndPointsURL from "../../../../api/EndPointsURL";
import MateriaPrimaPicker from "../../../Compras/components/MateriaPrimaPicker";
import type { Material } from "../../../Compras/types";
import type { EstudiarEliminacionMaterialResponseDTO } from "../types";

interface EliminacionMaterialStep1SelectAndStudyProps {
    setActiveStep: (step: number) => void;
    materialSeleccionado: Material | null;
    setMaterialSeleccionado: (material: Material | null) => void;
    setStudyResultMaterial: (result: EstudiarEliminacionMaterialResponseDTO | null) => void;
}

export default function EliminacionMaterialStep1SelectAndStudy({
    setActiveStep,
    materialSeleccionado,
    setMaterialSeleccionado,
    setStudyResultMaterial,
}: EliminacionMaterialStep1SelectAndStudyProps) {
    const { open, onOpen, onClose } = useDisclosure();
    const [isStudying, setIsStudying] = useState(false);
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const toast = useAppToast();

    const handleEstudiarEliminacion = async () => {
        const productoId = materialSeleccionado?.productoId;
        if (!productoId) return;

        setIsStudying(true);
        try {
            const url = `${endpoints.estudiar_eliminacion_material}/${encodeURIComponent(productoId)}`;
            const response = await axios.get<EstudiarEliminacionMaterialResponseDTO>(url, {
                withCredentials: true,
            });
            setStudyResultMaterial(response.data);
            setActiveStep(2);
        } catch (error: unknown) {
            console.error("Error al estudiar eliminación de material", error);
            const message = axios.isAxiosError(error) && error.response?.data?.message
                ? String(error.response.data.message)
                : "No se pudo obtener el estudio de eliminación del material.";
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
            <VStack align="stretch" gap={4}>
                <Heading size="md">Material a eliminar</Heading>
                <Text color="app.textMuted">
                    Seleccione el material sobre el cual desea estudiar la eliminación forzada.
                    El estudio mostrará compras, transacciones, lotes, recetas y case packs
                    impactados antes de ejecutar la operación.
                </Text>
                <Button
                    w="full"
                    justifyContent="flex-start"
                    colorPalette="teal"
                    onClick={onOpen}
                    variant="outline"
                >
                    {materialSeleccionado
                        ? `${materialSeleccionado.productoId} - ${materialSeleccionado.nombre}`
                        : "Seleccionar material"}
                </Button>
                <Flex gap={3} w="full" justify="space-between">
                    <Button variant="outline" onClick={() => setActiveStep(0)}>
                        Atrás
                    </Button>
                    <Button
                        colorPalette="teal"
                        onClick={handleEstudiarEliminacion}
                        disabled={materialSeleccionado == null}
                        loading={isStudying}
                        loadingText="Estudiando..."
                    >
                        Estudiar eliminación y continuar
                    </Button>
                </Flex>
            </VStack>

            <MateriaPrimaPicker
                isOpen={isOpen}
                onClose={onClose}
                onSelectMateriaPrima={(material) => {
                    setMaterialSeleccionado(material);
                    onClose();
                }}
            />
        </Box>
    );
}
