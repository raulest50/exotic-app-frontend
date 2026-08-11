// BandejaSeleccion.tsx
import React from "react";
import { Insumo } from "../../../types.tsx";
import { Steps, Box, Flex, Text } from "@chakra-ui/react";
import ItemBandejaSeleccion from "./ItemBandejaSeleccion.tsx";

interface BandejaSeleccionProps {
    selectedInsumos: Insumo[];
    onUpdateCantidad: (productoId: string, newCantidad: number) => void;
    onRemoveInsumo: (productoId: string) => void;
}

const BandejaSeleccion: React.FC<BandejaSeleccionProps> = ({
                                                               selectedInsumos,
                                                               onUpdateCantidad,
                                                               onRemoveInsumo,
                                                           }) => {
    return (
        <Box p={4} boxShadow={"md"} w="full">
            <Text fontSize="xl" mb={4}>
                Bandeja de Selección
            </Text>
            {selectedInsumos.length === 0 ? (
                <Text>No hay insumos seleccionados.</Text>
            ) : (
                <Flex direction="column" gap={4}>
                    {selectedInsumos.map((insumo) => (
                            <ItemBandejaSeleccion
                                key={insumo.producto.productoId}
                                insumo={insumo}
                                onUpdateCantidad={onUpdateCantidad}
                                onRemoveInsumo={onRemoveInsumo}
                            />
                    ))}
                </Flex>
            )}
        </Box>
    );
};

export default BandejaSeleccion;
