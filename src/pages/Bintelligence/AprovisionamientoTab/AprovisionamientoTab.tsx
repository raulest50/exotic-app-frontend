import {
    Badge,
    Box,
    Button,
    Card,
    CardBody,
    Flex,
    FormControl,
    FormLabel,
    Input,
    Stack,
    Text,
    useDisclosure,
    useToast,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import { Modulo } from "../../Usuarios/GestionUsuarios/types.tsx";
import { useModuleAccessLevel } from "../../../auth/usePermissions.ts";
import type { Material } from "../../Productos/types.tsx";
import type { Proveedor } from "../../Compras/types.tsx";
import ProveedorPicker from "../../../components/Pickers/ProveedorPicker/ProveedorPicker.tsx";
import MaterialSelectorModal from "./MaterialSelectorModal.tsx";
import LeadTimesView from "./LeadTimesView.tsx";
import { formatTipoMaterial, getTodayIsoDate } from "./utils.ts";

const endPoints = new EndPointsURL();

export default function AprovisionamientoTab() {
    const toast = useToast();
    const materialPicker = useDisclosure();
    const proveedorPicker = useDisclosure();
    const { nivel: biAccessLevel } = useModuleAccessLevel(Modulo.BINTELLIGENCE);
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null);
    const [fechaCorte, setFechaCorte] = useState(getTodayIsoDate());
    const [ventanaDiasInput, setVentanaDiasInput] = useState("365");
    const [materialLoading, setMaterialLoading] = useState(false);

    const ventanaDias = useMemo(() => {
        const parsed = Number(ventanaDiasInput.trim());
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 365;
    }, [ventanaDiasInput]);

    const hydrateMaterial = async (material: Material) => {
        setMaterialLoading(true);
        try {
            const response = await axios.get<Material>(endPoints.getProductoById(material.productoId));
            setSelectedMaterial(response.data);
            materialPicker.onClose();
        } catch (error) {
            console.error("Error loading material detail:", error);
            toast({
                title: "Error",
                description: "No se pudo cargar el detalle completo del material seleccionado.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setMaterialLoading(false);
        }
    };

    return (
        <Stack spacing={4}>
            <Card variant="outline">
                <CardBody>
                    <Stack spacing={4}>
                        <Flex justify="space-between" align={{ base: "stretch", md: "center" }} direction={{ base: "column", md: "row" }} gap={4}>
                            <Box>
                                <Text fontSize="lg" fontWeight="semibold">Aprovisionamiento</Text>
                                <Text color="app.textMuted" fontSize="sm">
                                    Consulte el lead time informativo para un par material-proveedor.
                                </Text>
                            </Box>
                            <Badge colorScheme="blue" alignSelf={{ base: "flex-start", md: "center" }}>
                                BI nivel {biAccessLevel}
                            </Badge>
                        </Flex>

                        <Flex gap={4} direction={{ base: "column", xl: "row" }}>
                            <FormControl>
                                <FormLabel>Material seleccionado</FormLabel>
                                <Box borderWidth="1px" borderRadius="md" px={3} py={2} minH="70px">
                                    {selectedMaterial ? (
                                        <Stack spacing={1}>
                                            <Text fontWeight="medium">
                                                {selectedMaterial.nombre} ({selectedMaterial.productoId})
                                            </Text>
                                            <Text fontSize="sm" color="app.textMuted">
                                                {formatTipoMaterial(selectedMaterial.tipoMaterial)} | UOM: {selectedMaterial.tipoUnidades}
                                            </Text>
                                        </Stack>
                                    ) : (
                                        <Text color="app.textSubtle">Aun no ha seleccionado un material.</Text>
                                    )}
                                </Box>
                            </FormControl>

                            <FormControl>
                                <FormLabel>Proveedor seleccionado</FormLabel>
                                <Box borderWidth="1px" borderRadius="md" px={3} py={2} minH="70px">
                                    {selectedProveedor ? (
                                        <Stack spacing={1}>
                                            <Text fontWeight="medium">{selectedProveedor.nombre}</Text>
                                            <Text fontSize="sm" color="app.textMuted">ID: {selectedProveedor.id}</Text>
                                        </Stack>
                                    ) : (
                                        <Text color="app.textSubtle">Aun no ha seleccionado un proveedor.</Text>
                                    )}
                                </Box>
                            </FormControl>
                        </Flex>

                        <Flex gap={4} direction={{ base: "column", lg: "row" }} align={{ base: "stretch", lg: "flex-end" }}>
                            <Stack direction={{ base: "column", sm: "row" }} spacing={2} align="stretch">
                                <Button
                                    onClick={materialPicker.onOpen}
                                    colorScheme="blue"
                                    isLoading={materialLoading}
                                    w={{ base: "full", sm: "auto" }}
                                >
                                    {selectedMaterial ? "Cambiar material" : "Seleccionar material"}
                                </Button>
                                <Button
                                    onClick={proveedorPicker.onOpen}
                                    colorScheme="blue"
                                    variant="outline"
                                    w={{ base: "full", sm: "auto" }}
                                >
                                    {selectedProveedor ? "Cambiar proveedor" : "Seleccionar proveedor"}
                                </Button>
                            </Stack>

                            <FormControl maxW={{ base: "full", lg: "220px" }}>
                                <FormLabel>Fecha corte</FormLabel>
                                <Input
                                    type="date"
                                    value={fechaCorte}
                                    onChange={(e) => setFechaCorte(e.target.value)}
                                />
                            </FormControl>

                            <FormControl maxW={{ base: "full", lg: "220px" }}>
                                <FormLabel>Ventana dias</FormLabel>
                                <Input
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={ventanaDiasInput}
                                    onChange={(e) => setVentanaDiasInput(e.target.value)}
                                />
                            </FormControl>
                        </Flex>
                    </Stack>
                </CardBody>
            </Card>

            <LeadTimesView
                selectedMaterial={selectedMaterial}
                selectedProveedor={selectedProveedor}
                fechaCorte={fechaCorte}
                ventanaDias={ventanaDias}
            />

            <MaterialSelectorModal
                isOpen={materialPicker.isOpen}
                onClose={materialPicker.onClose}
                onSelectMaterial={hydrateMaterial}
            />

            <ProveedorPicker
                isOpen={proveedorPicker.isOpen}
                onClose={proveedorPicker.onClose}
                onSelectProveedor={setSelectedProveedor}
            />
        </Stack>
    );
}
