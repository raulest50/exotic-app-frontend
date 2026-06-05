// StepZeroComponent.tsx
import { useState } from "react";
import {
    Button,
    Flex,
    FormControl,
    FormLabel,
    Heading,
    Input,
    Text,
    useToast,
} from "@chakra-ui/react";
import axios from "axios";
import { OrdenCompra } from "../types";
import EndPointsURL from "../../../api/EndPointsURL";

interface StepZeroComponentProps {
    setActiveStep: (step: number) => void;
    setSelectedOrder: (orden: OrdenCompra) => void;
}

export default function StepZeroComponent_v1({
                                              setActiveStep,
                                              setSelectedOrder,
                                          }: StepZeroComponentProps) {
    const toast = useToast();
    const [ordenCompraId, setOrdenCompraId] = useState("");

    const handleOnClickBuscarOrdenByFacturaId = async () => {
        // Validate input
        if (!ordenCompraId) {
            toast({
                title: "Error",
                description: "Ingrese un ID de Factura",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        try {
            // Build the endpoint URL using your domain logic
            const endpoint = `${EndPointsURL.getDomain()}/compras/orden_by_id?ordenCompraId=${ordenCompraId}`;
            const response = await axios.get<OrdenCompra>(endpoint, {
                withCredentials: true, // ensure cookies/credentials are sent
            });

            // Set the selected order and advance to the next step
            setSelectedOrder(response.data);
            setActiveStep(1);
        } catch (error: any) {
            console.error("Error fetching order:", error);
            toast({
                title: "Orden no encontrada",
                description:
                    "No se encontró una orden de compra para el ID de Factura proporcionado",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        }
    };

    return (
        <Flex
            p="1em"
            direction="column"
            backgroundColor="app.stepperBlue"
            gap={4}
            alignItems="center"
        >
            <Heading fontFamily="Comfortaa Variable">
                Identificar Orden de Compra
            </Heading>
            <Text fontFamily="Comfortaa Variable">
                Ingrese el id de la orden de compra para verificar si se puede iniciar proceso de ingreso a almacen.
            </Text>
            <Flex w="40%" direction="column" gap={4}>
                <FormControl isRequired>
                    <FormLabel>Id Orden de Compra</FormLabel>
                    <Input
                        value={ordenCompraId}
                        onChange={(e) => setOrdenCompraId(e.target.value)}
                    />
                </FormControl>
                <Button
                    variant="solid"
                    colorScheme="teal"
                    onClick={handleOnClickBuscarOrdenByFacturaId}
                >
                    Buscar
                </Button>
            </Flex>
        </Flex>
    );
}
