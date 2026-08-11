import React from "react";
import { Card, HStack, IconButton, Text, Button, VStack } from "@chakra-ui/react";
import { FaSearch } from "react-icons/fa";
import { Proveedor } from "../types";

interface ProveedorFilterOCMProps {
    selectedProveedor: Proveedor | null;
    onOpenPicker: () => void;
    onClearFilter: () => void;
}

const ProveedorFilterOCM: React.FC<ProveedorFilterOCMProps> = ({
                                                                  selectedProveedor,
                                                                  onOpenPicker,
                                                                  onClearFilter,
                                                              }) => {
    return (
        <Card.Root variant="outline" borderColor="blue.200" minW="280px">
            <Card.Body>
                <HStack justifyContent="space-between" alignItems="flex-start">
                    <HStack alignItems="flex-start" gap={3}>
                        <IconButton
                            aria-label="Buscar proveedor"
                            onClick={onOpenPicker}
                            size="sm"
                            variant="outline"><FaSearch /></IconButton>
                        <VStack gap={0} alignItems="flex-start">
                            <Text fontWeight="semibold">
                                {selectedProveedor ? selectedProveedor.nombre : "Sin Filtro por proveedor"}
                            </Text>
                            {selectedProveedor && (
                                <Text fontSize="sm" color="app.textMuted">
                                    NIT: {selectedProveedor.id}
                                </Text>
                            )}
                        </VStack>
                    </HStack>
                    {selectedProveedor && (
                        <Button
                            size="sm"
                            variant="ghost"
                            colorPalette="red"
                            onClick={onClearFilter}
                        >
                            Quitar Filtro proveedor
                        </Button>
                    )}
                </HStack>
            </Card.Body>
        </Card.Root>
    );
};

export default ProveedorFilterOCM;
