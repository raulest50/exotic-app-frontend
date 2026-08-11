import { Box, Button, Flex, Heading, Spinner, Text } from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import { useEffect, useState } from "react";
import axios from "axios";
import ModificarSemiTerMFWizard from "./ModSemioTerMFversions/ModificarSemiTerMFWizard.tsx";
import { Producto, ProductoSemiter, ProductoManufacturingDTO } from "../../types.tsx";
import EndPointsURL from "../../../../api/EndPointsURL.tsx";
import { fromProductoManufacturingResponse } from "../../manufacturingMapper.ts";
import { LuArrowLeft } from 'react-icons/lu';

type Props = {
    producto: Producto;
    onClose: () => void;
    refreshSearch?: () => void;
};

export default function ModSemiTerMFWizard({ producto, onClose, refreshSearch }: Props) {
    const endPoints = new EndPointsURL();
    const toast = useAppToast();
    const [productoSemiter, setProductoSemiter] = useState<ProductoSemiter | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProductoManufacturing = async () => {
            try {
                setLoading(true);
                const url = endPoints.get_producto_manufacturing.replace("{productoId}", encodeURIComponent(producto.productoId));
                const response = await axios.get<ProductoManufacturingDTO>(url);
                setProductoSemiter(fromProductoManufacturingResponse(response.data));
            } catch (error) {
                console.error("Error cargando manufacturing del producto:", error);
                toast({
                    title: "Error",
                    description: "No se pudo cargar el metodo de fabricacion del producto.",
                    status: "error",
                    duration: 4000,
                    isClosable: true,
                });
                setProductoSemiter({
                    ...producto,
                    costo: String(producto.costo ?? 0),
                    cantidadUnidad: producto.cantidadUnidad,
                    tipo_producto: producto.tipo_producto,
                });
            } finally {
                setLoading(false);
            }
        };

        fetchProductoManufacturing();
    }, [endPoints.get_producto_manufacturing, producto, toast]);

    const handleBack = () => {
        onClose();
        refreshSearch?.();
    };

    return (
        <Box p={5} bg="app.surface" borderRadius="md" boxShadow="base">
            <Flex justifyContent="space-between" alignItems="center" mb={5}>
                <Button colorPalette="blue" variant="outline" onClick={handleBack}><LuArrowLeft />Regresar al listado
                                    </Button>
                <Heading size="lg">Modificar Semi/Terminado</Heading>
                <Box />
            </Flex>

            {loading && (
                <Flex direction="column" align="center" gap={3} py={10}>
                    <Spinner size="lg" color="teal.500" />
                    <Text>Cargando metodo de fabricacion...</Text>
                </Flex>
            )}

            {!loading && productoSemiter && (
                <ModificarSemiTerMFWizard producto={productoSemiter} onClose={onClose} refreshSearch={refreshSearch} />
            )}
        </Box>
    );
}
