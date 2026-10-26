import { useState } from "react";
import { Badge, Box, Button, HStack, Text, VStack } from "@chakra-ui/react";
import TerminadoPicker4MPS, { type TerminadoPickerResult } from "./TerminadoPicker4MPS.tsx";

export const Default = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedTerminados, setSelectedTerminados] = useState<TerminadoPickerResult[]>([]);

    const handleSelectTerminados = (terminados: TerminadoPickerResult[]): boolean => {
        setSelectedTerminados(previous => {
            const ids = new Set(previous.map(producto => producto.productoId));
            return [...previous, ...terminados.filter(producto => {
                if (ids.has(producto.productoId)) return false;
                ids.add(producto.productoId);
                return true;
            })];
        });
        return true;
    };

    return (
        <VStack gap={4} align="start" p={5}>
            <Button colorPalette="blue" onClick={() => setIsOpen(true)}>
                Agregar terminados al día
            </Button>

            <Text>{selectedTerminados.length} terminados agregados al día</Text>
            {selectedTerminados.map(selectedTerminado => (
                <Box key={selectedTerminado.productoId} p={4} borderWidth="1px" borderRadius="md" bg="bg.subtle" width="100%">
                    <Text>ID: {selectedTerminado.productoId}</Text>
                    <HStack wrap="wrap">
                        <Text>Nombre: {selectedTerminado.nombre}</Text>
                        {selectedTerminado.tipo_producto && (
                            <Badge colorPalette="purple">{selectedTerminado.tipo_producto}</Badge>
                        )}
                        <Badge colorPalette="blue">
                            {selectedTerminado.categoria?.categoriaNombre ?? "Sin categoria"}
                        </Badge>
                    </HStack>
                </Box>
            ))}
            {selectedTerminados.length > 0 && <Button variant="outline" onClick={() => setSelectedTerminados([])}>Limpiar día de ejemplo</Button>}

            <TerminadoPicker4MPS
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onSelectTerminados={handleSelectTerminados}
                alreadySelectedIds={selectedTerminados.map(producto => producto.productoId)}
                dayLabel="Lunes de ejemplo"
            />
        </VStack>
    );
};

export default {
    title: "Produccion/TerminadoPicker4MPS",
    component: TerminadoPicker4MPS,
};
