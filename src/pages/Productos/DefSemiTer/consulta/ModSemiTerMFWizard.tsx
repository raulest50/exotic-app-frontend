import { ArrowBackIcon } from "@chakra-ui/icons";
import { Box, Button, Flex, Heading } from "@chakra-ui/react";
import { useMemo } from "react";
import ModificarSemiTerMFWizard from "./ModSemioTerMFversions/ModificarSemiTerMFWizard.tsx";
import { Producto, ProductoSemiter } from "../../types.tsx";

type Props = {
    producto: Producto;
    onClose: () => void;
    refreshSearch?: () => void;
};

export default function ModSemiTerMFWizard({ producto, onClose, refreshSearch }: Props) {
    const productoSemiter = useMemo<ProductoSemiter>(() => ({
        ...producto,
        costo: producto.costo?.toString(),
        insumos: (producto as ProductoSemiter).insumos,
    }), [producto]);

    const handleBack = () => {
        onClose();
        if (typeof refreshSearch === "function") {
            refreshSearch();
        }
    };

    return (
        <Box p={5} bg="white" borderRadius="md" boxShadow="base">
            <Flex justifyContent="space-between" alignItems="center" mb={5}>
                <Button leftIcon={<ArrowBackIcon />} colorScheme="blue" variant="outline" onClick={handleBack}>
                    Regresar al listado
                </Button>
                <Heading size="lg">Modificar Semi/Terminado</Heading>
                <Box />
            </Flex>
            <ModificarSemiTerMFWizard producto={productoSemiter} onClose={onClose} refreshSearch={refreshSearch} />
        </Box>
    );
}
