import { useState } from "react";
import { Badge, Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import TerminadoPicker4MPS, { type TerminadoPickerResult } from "./TerminadoPicker4MPS.tsx";

export const Default = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedTerminado, setSelectedTerminado] = useState<TerminadoPickerResult | null>(null);

    const handleSelectTerminado = (terminado: TerminadoPickerResult) => {
        setSelectedTerminado(terminado);
        console.log("Selected terminado MPS:", terminado);
    };

    return (
        <VStack spacing={4} align="start" p={5}>
            <Button colorScheme="blue" onClick={() => setIsOpen(true)}>
                Abrir Selector MPS de Producto Terminado
            </Button>

            {selectedTerminado && (
                <Box p={4} borderWidth="1px" borderRadius="md" bg="gray.50" width="100%">
                    <Text fontWeight="bold">Producto Seleccionado:</Text>
                    <Text>ID: {selectedTerminado.productoId}</Text>
                    <HStack wrap="wrap">
                        <Text>Nombre: {selectedTerminado.nombre}</Text>
                        {selectedTerminado.tipo_producto && (
                            <Badge colorScheme="purple">{selectedTerminado.tipo_producto}</Badge>
                        )}
                        <Badge colorScheme="blue">
                            {selectedTerminado.categoria?.categoriaNombre ?? "Sin categoria"}
                        </Badge>
                    </HStack>
                </Box>
            )}

            <TerminadoPicker4MPS
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onSelectTerminado={handleSelectTerminado}
            />
        </VStack>
    );
};

export default {
    title: "Produccion/TerminadoPicker4MPS",
    component: TerminadoPicker4MPS,
};
