import { Card, HStack, IconButton, Text, Button, VStack } from "@chakra-ui/react";
import { FaSearch } from "react-icons/fa";
import { ProductoWithInsumos } from "../types.tsx";

interface ProductoFilterCardProps {
    selectedProducto: ProductoWithInsumos | null;
    onOpenPicker: () => void;
    onClearFilter: () => void;
}

export default function ProductoFilterCard({
    selectedProducto,
    onOpenPicker,
    onClearFilter,
}: ProductoFilterCardProps) {
    const producto = selectedProducto?.producto;

    return (
        <Card.Root variant="outline" borderColor="blue.200" minW="280px">
            <Card.Body>
                <HStack justifyContent="space-between" alignItems="flex-start">
                    <HStack alignItems="flex-start" gap={3}>
                        <IconButton
                            aria-label="Buscar producto"
                            onClick={onOpenPicker}
                            size="sm"
                            variant="outline"><FaSearch /></IconButton>
                        <VStack gap={0} alignItems="flex-start">
                            <Text fontWeight="semibold">
                                {producto ? producto.nombre : "Sin filtro por producto"}
                            </Text>
                            {producto && (
                                <Text fontSize="sm" color="gray.600">
                                    ID: {producto.productoId}
                                </Text>
                            )}
                        </VStack>
                    </HStack>
                    {producto && (
                        <Button size="sm" variant="ghost" colorPalette="red" onClick={onClearFilter}>
                            Quitar filtro
                        </Button>
                    )}
                </HStack>
            </Card.Body>
        </Card.Root>
    );
}
