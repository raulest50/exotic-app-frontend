import React from "react";
import { Card, CardBody, HStack, IconButton, Text, Button, VStack } from "@chakra-ui/react";
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
        <Card variant="outline" borderColor="blue.200" minW="280px">
            <CardBody>
                <HStack justifyContent="space-between" alignItems="flex-start">
                    <HStack alignItems="flex-start" spacing={3}>
                        <IconButton
                            aria-label="Buscar proveedor"
                            icon={<FaSearch />}
                            onClick={onOpenPicker}
                            size="sm"
                            variant="outline"
                        />
                        <VStack spacing={0} alignItems="flex-start">
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
                            colorScheme="red"
                            onClick={onClearFilter}
                        >
                            Quitar Filtro proveedor
                        </Button>
                    )}
                </HStack>
            </CardBody>
        </Card>
    );
};

export default ProveedorFilterOCM;
