import {
    Badge,
    Box,
    Button,
    Card,
    CardBody,
    Flex,
    FormControl,
    FormLabel,
    HStack,
    Input,
    Select,
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
import MaterialSelectorModal from "./MaterialSelectorModal.tsx";
import LeadTimesView from "./LeadTimesView.tsx";
import ReorderPointView from "./ReorderPointView.tsx";
import type { AprovisionamientoSubView } from "./types.ts";
import { formatNumber, formatTipoMaterial, getTodayIsoDate } from "./utils.ts";

const endPoints = new EndPointsURL();

export default function AprovisionamientoTab() {
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const { nivel: biAccessLevel } = useModuleAccessLevel(Modulo.BINTELLIGENCE);
    const [subView, setSubView] = useState<AprovisionamientoSubView>("lead-times");
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
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
            onClose();
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
                                    Analice lead times historicos y establezca puntos de reorden basados en datos BI.
                                </Text>
                            </Box>
                            <HStack align="center" spacing={2}>
                                <Badge colorScheme="blue">BI nivel {biAccessLevel}</Badge>
                                <Button onClick={onOpen} colorScheme="blue" isLoading={materialLoading}>
                                    {selectedMaterial ? "Cambiar material" : "Seleccionar material"}
                                </Button>
                            </HStack>
                        </Flex>

                        <Flex gap={4} direction={{ base: "column", lg: "row" }}>
                            <FormControl>
                                <FormLabel>Material seleccionado</FormLabel>
                                <Box borderWidth="1px" borderRadius="md" px={3} py={2} minH="42px">
                                    {selectedMaterial ? (
                                        <Stack spacing={1}>
                                            <Text fontWeight="medium">
                                                {selectedMaterial.nombre} ({selectedMaterial.productoId})
                                            </Text>
                                            <Text fontSize="sm" color="app.textMuted">
                                                {formatTipoMaterial(selectedMaterial.tipoMaterial)} | UOM: {selectedMaterial.tipoUnidades} | Punto reorden actual: {formatNumber(selectedMaterial.puntoReorden, 2)}
                                            </Text>
                                        </Stack>
                                    ) : (
                                        <Text color="app.textSubtle">Aun no ha seleccionado un material.</Text>
                                    )}
                                </Box>
                            </FormControl>

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

                            <FormControl maxW={{ base: "full", lg: "260px" }}>
                                <FormLabel>Vista</FormLabel>
                                <Select
                                    value={subView}
                                    onChange={(e) => setSubView(e.target.value as AprovisionamientoSubView)}
                                >
                                    <option value="lead-times">Lead Times</option>
                                    <option value="puntos-reorden">Puntos de Reorden</option>
                                </Select>
                            </FormControl>
                        </Flex>
                    </Stack>
                </CardBody>
            </Card>

            {subView === "lead-times" ? (
                <LeadTimesView
                    selectedMaterial={selectedMaterial}
                    fechaCorte={fechaCorte}
                    ventanaDias={ventanaDias}
                />
            ) : (
                <ReorderPointView
                    selectedMaterial={selectedMaterial}
                    fechaCorte={fechaCorte}
                    ventanaDias={ventanaDias}
                    canSave={biAccessLevel >= 3}
                    onMaterialUpdated={setSelectedMaterial}
                />
            )}

            <MaterialSelectorModal
                isOpen={isOpen}
                onClose={onClose}
                onSelectMaterial={hydrateMaterial}
            />
        </Stack>
    );
}
