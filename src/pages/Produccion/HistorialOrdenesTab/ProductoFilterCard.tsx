import { Card, CardBody, HStack, IconButton, Text, Button, VStack } from "@chakra-ui/react";
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
        <Card variant="outline" borderColor="blue.200" minW="280px">
            <CardBody>
                <HStack justifyContent="space-between" alignItems="flex-start">
                    <HStack alignItems="flex-start" spacing={3}>
                        <IconButton
                            aria-label="Buscar producto"
                            icon={<FaSearch />}
                            onClick={onOpenPicker}
                            size="sm"
                            variant="outline"
                        />
                        <VStack spacing={0} alignItems="flex-start">
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
                        <Button size="sm" variant="ghost" colorScheme="red" onClick={onClearFilter}>
                            Quitar filtro
                        </Button>
                    )}
                </HStack>
            </CardBody>
        </Card>
    );
}
