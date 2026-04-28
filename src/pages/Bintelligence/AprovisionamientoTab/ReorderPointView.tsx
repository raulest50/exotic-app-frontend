import {
    Box,
    Button,
    Card,
    CardBody,
    Flex,
    FormControl,
    FormHelperText,
    FormLabel,
    Input,
    SimpleGrid,
    Spinner,
    Stack,
    Stat,
    StatLabel,
    StatNumber,
    Text,
    useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import type { Material, ProductoBasicUpdatePayload } from "../../Productos/types.tsx";
import type { PuntoReordenEstimadoDTO } from "./types.ts";
import { formatNumber, formatTipoMaterial, isValidPuntoReorden } from "./utils.ts";

type Props = {
    selectedMaterial: Material | null;
    fechaCorte: string;
    ventanaDias: number;
    canSave: boolean;
    onMaterialUpdated: (material: Material) => void;
};

const endPoints = new EndPointsURL();

export default function ReorderPointView({
    selectedMaterial,
    fechaCorte,
    ventanaDias,
    canSave,
    onMaterialUpdated,
}: Props) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [estimate, setEstimate] = useState<PuntoReordenEstimadoDTO | null>(null);
    const [inputValue, setInputValue] = useState("");

    useEffect(() => {
        if (!selectedMaterial) {
            setEstimate(null);
            setInputValue("");
            return;
        }
        setInputValue(String(selectedMaterial.puntoReorden ?? 0));
    }, [selectedMaterial?.productoId, selectedMaterial?.puntoReorden]);

    const fetchEstimate = async () => {
        if (!selectedMaterial) {
            setEstimate(null);
            return;
        }

        setLoading(true);
        try {
            const url = endPoints.biMaterialReorderPointEstimate(
                selectedMaterial.productoId,
                fechaCorte,
                ventanaDias
            );
            const response = await axios.get<PuntoReordenEstimadoDTO>(url);
            setEstimate(response.data);
        } catch (error) {
            console.error("Error loading reorder point estimate:", error);
            setEstimate(null);
            toast({
                title: "Error",
                description: "No se pudo estimar el punto de reorden para el material seleccionado.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!selectedMaterial) return;
        fetchEstimate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMaterial?.productoId, fechaCorte, ventanaDias]);

    const parsedInput = useMemo(() => {
        const trimmed = inputValue.trim();
        if (!trimmed) return undefined;
        return Number(trimmed);
    }, [inputValue]);

    const inputIsValid = isValidPuntoReorden(parsedInput);
    const currentValue = selectedMaterial?.puntoReorden ?? 0;
    const hasChanges = selectedMaterial ? parsedInput !== currentValue : false;

    const handleSave = async () => {
        if (!selectedMaterial) return;
        if (!inputIsValid || parsedInput === undefined) {
            toast({
                title: "Validacion fallida",
                description: "Punto de reorden: -1, 0 o un numero mayor o igual a 0.",
                status: "warning",
                duration: 4000,
                isClosable: true,
            });
            return;
        }

        const payload: ProductoBasicUpdatePayload = {
            productoId: selectedMaterial.productoId,
            nombre: selectedMaterial.nombre,
            cantidadUnidad: Number(selectedMaterial.cantidadUnidad),
            observaciones: selectedMaterial.observaciones || "",
            ivaPercentual: Number(selectedMaterial.ivaPercentual ?? 0),
            tipoMaterial: selectedMaterial.tipoMaterial,
            puntoReorden: parsedInput,
        };

        setSaving(true);
        try {
            const url = endPoints.update_producto_basic.replace("{productoId}", selectedMaterial.productoId);
            const response = await axios.put<Material>(url, payload);
            onMaterialUpdated(response.data);
            setInputValue(String(response.data.puntoReorden ?? parsedInput));
            toast({
                title: "Punto de reorden actualizado",
                description: "El material fue actualizado exitosamente desde BI.",
                status: "success",
                duration: 5000,
                isClosable: true,
            });
        } catch (error) {
            console.error("Error saving reorder point:", error);
            toast({
                title: "Error",
                description: "No se pudo guardar el nuevo punto de reorden.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSaving(false);
        }
    };

    if (!selectedMaterial) {
        return (
            <Card variant="outline">
                <CardBody>
                    <Text color="gray.600">Seleccione un material para estimar y actualizar su punto de reorden.</Text>
                </CardBody>
            </Card>
        );
    }

    return (
        <Stack spacing={4}>
            <SimpleGrid columns={{ base: 1, xl: 3 }} spacing={4}>
                <Card variant="outline">
                    <CardBody>
                        <Text fontWeight="semibold" mb={3}>Valor actual</Text>
                        <SimpleGrid columns={1} spacing={3}>
                            <Stat>
                                <StatLabel>Punto de reorden persistido</StatLabel>
                                <StatNumber>{formatNumber(selectedMaterial.puntoReorden, 2)}</StatNumber>
                            </Stat>
                            <Stat>
                                <StatLabel>Tipo de material</StatLabel>
                                <StatNumber fontSize="md">{formatTipoMaterial(selectedMaterial.tipoMaterial)}</StatNumber>
                            </Stat>
                            <Stat>
                                <StatLabel>Inventareable</StatLabel>
                                <StatNumber fontSize="md">{selectedMaterial.inventareable === false ? "No" : "Si"}</StatNumber>
                            </Stat>
                        </SimpleGrid>
                    </CardBody>
                </Card>

                <Card variant="outline">
                    <CardBody>
                        <Flex justify="space-between" align={{ base: "stretch", md: "center" }} mb={3} direction={{ base: "column", md: "row" }} gap={3}>
                            <Text fontWeight="semibold">Estimacion BI</Text>
                            <Button variant="outline" colorScheme="blue" onClick={fetchEstimate} isLoading={loading}>
                                Recalcular
                            </Button>
                        </Flex>

                        {loading ? (
                            <Stack align="center" py={8}>
                                <Spinner />
                                <Text color="gray.600">Calculando punto de reorden...</Text>
                            </Stack>
                        ) : !estimate ? (
                            <Text color="gray.600">No hay estimacion disponible.</Text>
                        ) : (
                            <SimpleGrid columns={1} spacing={3}>
                                <Stat>
                                    <StatLabel>Metodo usado</StatLabel>
                                    <StatNumber fontSize="md">{estimate.metodoUsado}</StatNumber>
                                </Stat>
                                <Stat>
                                    <StatLabel>Punto de reorden estimado</StatLabel>
                                    <StatNumber>{formatNumber(estimate.puntoReordenEstimado, 2)}</StatNumber>
                                </Stat>
                                <Stat>
                                    <StatLabel>Confianza global</StatLabel>
                                    <StatNumber>{formatNumber(estimate.confianzaGlobal, 0)} / 100</StatNumber>
                                </Stat>
                                <Stat>
                                    <StatLabel>Demanda diaria promedio</StatLabel>
                                    <StatNumber>{formatNumber(estimate.demandaDiariaPromedio, 4)}</StatNumber>
                                </Stat>
                                <Stat>
                                    <StatLabel>Desviacion estandar demanda</StatLabel>
                                    <StatNumber>{formatNumber(estimate.desviacionEstandarDemandaDiaria, 4)}</StatNumber>
                                </Stat>
                                <Stat>
                                    <StatLabel>Lead time representativo</StatLabel>
                                    <StatNumber>{formatNumber(estimate.leadTimeRepresentativoDias, 4)} dias</StatNumber>
                                </Stat>
                                <Stat>
                                    <StatLabel>Lead time promedio</StatLabel>
                                    <StatNumber>{formatNumber(estimate.leadTimePromedioDias, 4)} dias</StatNumber>
                                </Stat>
                                <Stat>
                                    <StatLabel>Desviacion estandar lead time</StatLabel>
                                    <StatNumber>{formatNumber(estimate.desviacionEstandarLeadTimeDias, 4)} dias</StatNumber>
                                </Stat>
                                <Stat>
                                    <StatLabel>Observaciones lead time</StatLabel>
                                    <StatNumber>{formatNumber(estimate.observacionesLeadTime, 0)}</StatNumber>
                                </Stat>
                                <Stat>
                                    <StatLabel>Proveedores observados</StatLabel>
                                    <StatNumber>{formatNumber(estimate.proveedoresObservados, 0)}</StatNumber>
                                </Stat>
                                {estimate.reason ? (
                                    <Box>
                                        <Text fontWeight="medium">Motivo</Text>
                                        <Text color="gray.600">{estimate.reason}</Text>
                                    </Box>
                                ) : null}
                            </SimpleGrid>
                        )}
                    </CardBody>
                </Card>

                <Card variant="outline">
                    <CardBody>
                        <Text fontWeight="semibold" mb={3}>Nuevo valor a guardar</Text>
                        <Stack spacing={4}>
                            <FormControl isInvalid={Boolean(inputValue.trim()) && !inputIsValid}>
                                <FormLabel>Punto de reorden</FormLabel>
                                <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                />
                                <FormHelperText>
                                    -1 sin alertas; 0 sin umbral definido; mayor o igual a 0 es valido.
                                </FormHelperText>
                            </FormControl>

                            <Flex direction="column" gap={2}>
                                <Button
                                    colorScheme="blue"
                                    variant="outline"
                                    onClick={() => {
                                        if (estimate?.metodoUsado !== "NO_DATA" && estimate?.puntoReordenEstimado != null) {
                                            setInputValue(String(estimate.puntoReordenEstimado));
                                        }
                                    }}
                                    isDisabled={estimate?.metodoUsado === "NO_DATA" || estimate?.puntoReordenEstimado == null}
                                >
                                    Usar estimacion BI
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => setInputValue(String(currentValue))}
                                >
                                    Restablecer valor actual
                                </Button>
                                <Button
                                    colorScheme="green"
                                    onClick={handleSave}
                                    isLoading={saving}
                                    isDisabled={!canSave || !inputIsValid || parsedInput === undefined || !hasChanges}
                                >
                                    Guardar nuevo punto de reorden
                                </Button>
                                {!canSave ? (
                                    <Text fontSize="sm" color="gray.600">
                                        Se requiere BI nivel 3 para guardar cambios desde esta interfaz.
                                    </Text>
                                ) : null}
                            </Flex>
                        </Stack>
                    </CardBody>
                </Card>
            </SimpleGrid>
        </Stack>
    );
}
