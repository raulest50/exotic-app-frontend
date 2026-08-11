import {
    Steps,
    Badge,
    Box,
    Button,
    Card,
    Flex,
    Input,
    Stack,
    Text,
    useDisclosure,
    useToast,
    Field,
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
        <Stack gap={4}>
            <Card.Root variant="outline">
                <Card.Body>
                    <Stack gap={4}>
                        <Flex justify="space-between" align={{ base: "stretch", md: "center" }} direction={{ base: "column", md: "row" }} gap={4}>
                            <Box>
                                <Text fontSize="lg" fontWeight="semibold">Aprovisionamiento</Text>
                                <Text color="app.textMuted" fontSize="sm">
                                    Consulte el lead time informativo para un par material-proveedor.
                                </Text>
                            </Box>
                            <Badge colorPalette="blue" alignSelf={{ base: "flex-start", md: "center" }}>
                                BI nivel {biAccessLevel}
                            </Badge>
                        </Flex>

                        <Flex gap={4} direction={{ base: "column", xl: "row" }}>
                            <Field.Root>
                                <Field.Label>Material seleccionado</Field.Label>
                                <Box borderWidth="1px" borderRadius="md" px={3} py={2} minH="70px">
                                    {selectedMaterial ? (
                                        <Stack gap={1}>
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
                            </Field.Root>

                            <Field.Root>
                                <Field.Label>Proveedor seleccionado</Field.Label>
                                <Box borderWidth="1px" borderRadius="md" px={3} py={2} minH="70px">
                                    {selectedProveedor ? (
                                        <Stack gap={1}>
                                            <Text fontWeight="medium">{selectedProveedor.nombre}</Text>
                                            <Text fontSize="sm" color="app.textMuted">ID: {selectedProveedor.id}</Text>
                                        </Stack>
                                    ) : (
                                        <Text color="app.textSubtle">Aun no ha seleccionado un proveedor.</Text>
                                    )}
                                </Box>
                            </Field.Root>
                        </Flex>

                        <Flex gap={4} direction={{ base: "column", lg: "row" }} align={{ base: "stretch", lg: "flex-end" }}>
                            <Stack direction={{ base: "column", sm: "row" }} gap={2} align="stretch">
                                <Button
                                    onClick={materialPicker.onOpen}
                                    colorPalette="blue"
                                    loading={materialLoading}
                                    w={{ base: "full", sm: "auto" }}
                                >
                                    {selectedMaterial ? "Cambiar material" : "Seleccionar material"}
                                </Button>
                                <Button
                                    onClick={proveedorPicker.onOpen}
                                    colorPalette="blue"
                                    variant="outline"
                                    w={{ base: "full", sm: "auto" }}
                                >
                                    {selectedProveedor ? "Cambiar proveedor" : "Seleccionar proveedor"}
                                </Button>
                            </Stack>

                            <Field.Root maxW={{ base: "full", lg: "220px" }}>
                                <Field.Label>Fecha corte</Field.Label>
                                <Input
                                    type="date"
                                    value={fechaCorte}
                                    onValueChange={(e) => setFechaCorte(e.target.value)}
                                />
                            </Field.Root>

                            <Field.Root maxW={{ base: "full", lg: "220px" }}>
                                <Field.Label>Ventana dias</Field.Label>
                                <Input
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={ventanaDiasInput}
                                    onValueChange={(e) => setVentanaDiasInput(e.target.value)}
                                />
                            </Field.Root>
                        </Flex>
                    </Stack>
                </Card.Body>
            </Card.Root>

            <LeadTimesView
                selectedMaterial={selectedMaterial}
                selectedProveedor={selectedProveedor}
                fechaCorte={fechaCorte}
                ventanaDias={ventanaDias}
            />

            <MaterialSelectorModal
                isOpen={materialPicker.open}
                onClose={materialPicker.onClose}
                onSelectMaterial={hydrateMaterial}
            />

            <ProveedorPicker
                isOpen={proveedorPicker.open}
                onClose={proveedorPicker.onClose}
                onSelectProveedor={setSelectedProveedor}
            />
        </Stack>
    );
}
