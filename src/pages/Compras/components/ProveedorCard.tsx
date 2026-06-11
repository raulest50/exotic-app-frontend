// ProveedorCard.tsx

import React from "react";
import {
    Badge,
    Card,
    CardHeader,
    HStack,
    IconButton,
    Heading,
    Divider,
    CardBody,
    Spinner,
    Tooltip,
    useDisclosure,
    VStack,
    Text,
} from "@chakra-ui/react";
import { QuestionIcon } from "@chakra-ui/icons";
import { FaSearch } from "react-icons/fa";
import {
    getRegimenTributario,
    getCondicionPagoText,
    LeadTimeProveedorKpiDTO,
    Proveedor,
} from "../types.tsx"; // Adjust path if needed
import ProveedorLeadTimeKpiHelpModal from "./ProveedorLeadTimeKpiHelpModal.tsx";

interface ProveedorCardProps {
    selectedProveedor: Proveedor | null;
    onSearchClick: () => void;
    leadTimeKpi?: LeadTimeProveedorKpiDTO | null;
    isLeadTimeKpiLoading?: boolean;
    leadTimeKpiError?: boolean;
}

const ProveedorCard: React.FC<ProveedorCardProps> = ({
                                                         selectedProveedor,
                                                         onSearchClick,
                                                         leadTimeKpi,
                                                         isLeadTimeKpiLoading = false,
                                                         leadTimeKpiError = false,
                                                     }) => {
    const { isOpen, onOpen, onClose } = useDisclosure();

    const formatLeadTimeDays = (value: number) => {
        const rounded = Math.round(value * 10) / 10;
        return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    };

    const renderLeadTimeKpi = () => {
        if (!selectedProveedor) {
            return null;
        }

        if (isLeadTimeKpiLoading) {
            return (
                <HStack spacing={2} px={2} py={1} bg="whiteAlpha.800" borderRadius="md">
                    <Spinner size="xs" />
                    <Text fontSize="xs" noOfLines={1}>
                        Cargando KPI
                    </Text>
                </HStack>
            );
        }

        if (leadTimeKpiError) {
            return (
                <Badge colorScheme="red" variant="subtle" px={2} py={1} borderRadius="md">
                    KPI no disponible
                </Badge>
            );
        }

        const estado = leadTimeKpi?.estado ?? "SIN_INFORMACION";
        const hasLeadTime = leadTimeKpi?.leadTimeMedianoDias != null;
        const leadTimeLabel = hasLeadTime
            ? `${formatLeadTimeDays(leadTimeKpi.leadTimeMedianoDias as number)} dias`
            : "sin informacion";

        const label = estado === "DESACTUALIZADO"
            ? `Ultimo lead time: ${leadTimeLabel}`
            : estado === "VIGENTE"
                ? `Lead time proveedor: ${leadTimeLabel}`
                : "Lead time proveedor: sin informacion";
        const badgeLabel = estado === "DESACTUALIZADO"
            ? "Desactualizado"
            : estado === "VIGENTE"
                ? "Vigente"
                : "Sin informacion";
        const badgeColor = estado === "DESACTUALIZADO"
            ? "yellow"
            : estado === "VIGENTE"
                ? "green"
                : "gray";

        return (
            <HStack spacing={2} px={2} py={1} bg="whiteAlpha.800" borderRadius="md" maxW="360px">
                <Text fontSize="xs" fontWeight="semibold" noOfLines={1}>
                    {label}
                </Text>
                <Badge colorScheme={badgeColor} variant="subtle" flexShrink={0}>
                    {badgeLabel}
                </Badge>
            </HStack>
        );
    };

    return (
        <>
            <Card variant="outline" borderColor="blue.200" w={"full"}>
                <CardHeader bg="app.stepperBlue">
                    <HStack w="full" justifyContent="space-between" alignItems="center" spacing={3}>
                        <HStack minW={0} flex="1">
                            <IconButton
                                aria-label="Buscar Proveedor"
                                icon={<FaSearch />}
                                onClick={onSearchClick}
                            />
                            <Heading size="sm" noOfLines={1}>
                                {selectedProveedor
                                    ? selectedProveedor.nombre
                                    : "Click para seleccionar un proveedor"}
                            </Heading>
                        </HStack>

                        <HStack spacing={2} flexShrink={0}>
                            {renderLeadTimeKpi()}
                            <Tooltip label="Informacion del KPI de lead time proveedor">
                                <IconButton
                                    aria-label="Información del KPI de lead time proveedor"
                                    icon={<QuestionIcon />}
                                    onClick={onOpen}
                                    size="sm"
                                    variant="ghost"
                                />
                            </Tooltip>
                        </HStack>
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
            <ProveedorLeadTimeKpiHelpModal isOpen={isOpen} onClose={onClose} />
        </>
    );
};

export default ProveedorCard;
