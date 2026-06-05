// ProveedorCard.tsx

import React from "react";
import {
    Card,
    CardHeader,
    HStack,
    IconButton,
    Heading,
    Divider,
    CardBody,
    VStack,
    Text,
} from "@chakra-ui/react";
import { FaSearch } from "react-icons/fa";
import {getRegimenTributario, getCondicionPagoText, Proveedor} from "../types.tsx"; // Adjust path if needed

interface ProveedorCardProps {
    selectedProveedor: Proveedor | null;
    onSearchClick: () => void;
}

const ProveedorCard: React.FC<ProveedorCardProps> = ({
                                                         selectedProveedor,
                                                         onSearchClick,
                                                     }) => {
    return (
        <Card variant="outline" borderColor="blue.200" w={"full"}>
            <CardHeader bg="app.stepperBlue">
                <HStack>
                    <IconButton
                        aria-label="Buscar Proveedor"
                        icon={<FaSearch />}
                        onClick={onSearchClick}
                    />
                    <Heading size="sm">
                        {selectedProveedor
                            ? selectedProveedor.nombre
                            : "Click para seleccionar un proveedor"}
                    </Heading>
                </HStack>
            </CardHeader>
            <Divider />
            <CardBody>
                <HStack alignItems="flex-start" justifyContent="space-between">
                    <VStack alignItems="start" spacing={1}>
                        <Text pt="2" fontSize="sm">
                            Nit: {selectedProveedor ? selectedProveedor.id : ""}
                        </Text>
                        <Text pt="2" fontSize="sm">
                            Tel: {selectedProveedor ? (selectedProveedor as any).telefono ?? "" : ""}
                        </Text>
                        <Text pt="2" fontSize="sm">
                            Ciudad: {selectedProveedor ? selectedProveedor.ciudad : ""}
                        </Text>
                        <Text pt="2" fontSize="sm">
                            Dirección: {selectedProveedor ? selectedProveedor.direccion : ""}
                        </Text>
                        <Text pt="2" fontSize="sm">
                            Departamento: {selectedProveedor ? selectedProveedor.departamento : ""}
                        </Text>
                    </VStack>

                    <VStack alignItems="start" spacing={1}>
                        <Text pt="2" fontSize="sm">
                            Régimen Tributario: {selectedProveedor ? getRegimenTributario(selectedProveedor.regimenTributario) : ""}
                        </Text>
                        <Text pt="2" fontSize="sm">
                            Condición de Pago: {selectedProveedor ? getCondicionPagoText(selectedProveedor.condicionPago) : ""}
                        </Text>
                        <Text pt="2" fontSize="sm">
                            Contacto: {selectedProveedor?.contactos?.[0]?.fullName ?? ""}
                        </Text>
                    </VStack>

                </HStack>
            </CardBody>
        </Card>
    );
};

export default ProveedorCard;
