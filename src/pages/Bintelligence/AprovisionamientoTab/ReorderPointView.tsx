import {
    Steps,
    Box,
    Button,
    Card,
    Flex,
    Input,
    SimpleGrid,
    Spinner,
    Stack,
    Stat,
    Text,
    Field,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
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
    const toast = useAppToast();
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
            <Card.Root variant="outline">
                <Card.Body>
                    <Text color="app.textMuted">Seleccione un material para estimar y actualizar su punto de reorden.</Text>
                </Card.Body>
            </Card.Root>
        );
    }

    return (
        <Stack gap={4}>
            <SimpleGrid columns={{ base: 1, xl: 3 }} gap={4}>
                <Card.Root variant="outline">
                    <Card.Body>
                        <Text fontWeight="semibold" mb={3}>Valor actual</Text>
                        <SimpleGrid columns={1} gap={3}>
                            <Stat.Root>
                                <Stat.Label>Punto de reorden persistido</Stat.Label>
                                <Stat.ValueText>{formatNumber(selectedMaterial.puntoReorden, 2)}</Stat.ValueText>
                            </Stat.Root>
                            <Stat.Root>
                                <Stat.Label>Tipo de material</Stat.Label>
                                <Stat.ValueText fontSize="md">{formatTipoMaterial(selectedMaterial.tipoMaterial)}</Stat.ValueText>
                            </Stat.Root>
                            <Stat.Root>
                                <Stat.Label>Inventareable</Stat.Label>
                                <Stat.ValueText fontSize="md">{selectedMaterial.inventareable === false ? "No" : "Si"}</Stat.ValueText>
                            </Stat.Root>
                        </SimpleGrid>
                    </Card.Body>
                </Card.Root>

                <Card.Root variant="outline">
                    <Card.Body>
                        <Flex justify="space-between" align={{ base: "stretch", md: "center" }} mb={3} direction={{ base: "column", md: "row" }} gap={3}>
                            <Text fontWeight="semibold">Estimacion BI</Text>
                            <Button variant="outline" colorPalette="blue" onClick={fetchEstimate} loading={loading}>
                                Recalcular
                            </Button>
                        </Flex>

                        {loading ? (
                            <Stack align="center" py={8}>
                                <Spinner />
                                <Text color="app.textMuted">Calculando punto de reorden...</Text>
                            </Stack>
                        ) : !estimate ? (
                            <Text color="app.textMuted">No hay estimacion disponible.</Text>
                        ) : (
                            <SimpleGrid columns={1} gap={3}>
                                <Stat.Root>
                                    <Stat.Label>Metodo usado</Stat.Label>
                                    <Stat.ValueText fontSize="md">{estimate.metodoUsado}</Stat.ValueText>
                                </Stat.Root>
                                <Stat.Root>
                                    <Stat.Label>Punto de reorden estimado</Stat.Label>
                                    <Stat.ValueText>{formatNumber(estimate.puntoReordenEstimado, 2)}</Stat.ValueText>
                                </Stat.Root>
                                <Stat.Root>
                                    <Stat.Label>Confianza global</Stat.Label>
                                    <Stat.ValueText>{formatNumber(estimate.confianzaGlobal, 0)} / 100</Stat.ValueText>
                                </Stat.Root>
                                <Stat.Root>
                                    <Stat.Label>Demanda diaria promedio</Stat.Label>
                                    <Stat.ValueText>{formatNumber(estimate.demandaDiariaPromedio, 4)}</Stat.ValueText>
                                </Stat.Root>
                                <Stat.Root>
                                    <Stat.Label>Desviacion estandar demanda</Stat.Label>
                                    <Stat.ValueText>{formatNumber(estimate.desviacionEstandarDemandaDiaria, 4)}</Stat.ValueText>
                                </Stat.Root>
                                <Stat.Root>
                                    <Stat.Label>Lead time representativo</Stat.Label>
                                    <Stat.ValueText>{formatNumber(estimate.leadTimeRepresentativoDias, 4)} dias</Stat.ValueText>
                                </Stat.Root>
                                <Stat.Root>
                                    <Stat.Label>Lead time promedio</Stat.Label>
                                    <Stat.ValueText>{formatNumber(estimate.leadTimePromedioDias, 4)} dias</Stat.ValueText>
                                </Stat.Root>
                                <Stat.Root>
                                    <Stat.Label>Desviacion estandar lead time</Stat.Label>
                                    <Stat.ValueText>{formatNumber(estimate.desviacionEstandarLeadTimeDias, 4)} dias</Stat.ValueText>
                                </Stat.Root>
                                <Stat.Root>
                                    <Stat.Label>Observaciones lead time</Stat.Label>
                                    <Stat.ValueText>{formatNumber(estimate.observacionesLeadTime, 0)}</Stat.ValueText>
                                </Stat.Root>
                                <Stat.Root>
                                    <Stat.Label>Proveedores observados</Stat.Label>
                                    <Stat.ValueText>{formatNumber(estimate.proveedoresObservados, 0)}</Stat.ValueText>
                                </Stat.Root>
                                {estimate.reason ? (
                                    <Box>
                                        <Text fontWeight="medium">Motivo</Text>
                                        <Text color="app.textMuted">{estimate.reason}</Text>
                                    </Box>
                                ) : null}
                            </SimpleGrid>
                        )}
                    </Card.Body>
                </Card.Root>

                <Card.Root variant="outline">
                    <Card.Body>
                        <Text fontWeight="semibold" mb={3}>Nuevo valor a guardar</Text>
                        <Stack gap={4}>
                            <Field.Root invalid={Boolean(inputValue.trim()) && !inputIsValid}>
                                <Field.Label>Punto de reorden</Field.Label>
                                <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={inputValue}
                                    onValueChange={(e) => setInputValue(e.target.value)}
                                />
                                <Field.HelperText>
                                    -1 sin alertas; 0 sin umbral definido; mayor o igual a 0 es valido.
                                </Field.HelperText>
                            </Field.Root>

                            <Flex direction="column" gap={2}>
                                <Button
                                    colorPalette="blue"
                                    variant="outline"
                                    onClick={() => {
                                        if (estimate?.metodoUsado !== "NO_DATA" && estimate?.puntoReordenEstimado != null) {
                                            setInputValue(String(estimate.puntoReordenEstimado));
                                        }
                                    }}
                                    disabled={estimate?.metodoUsado === "NO_DATA" || estimate?.puntoReordenEstimado == null}
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
                                    colorPalette="green"
                                    onClick={handleSave}
                                    loading={saving}
                                    disabled={!canSave || !inputIsValid || parsedInput === undefined || !hasChanges}
                                >
                                    Guardar nuevo punto de reorden
                                </Button>
                                {!canSave ? (
                                    <Text fontSize="sm" color="app.textMuted">
                                        Se requiere BI nivel 3 para guardar cambios desde esta interfaz.
                                    </Text>
                                ) : null}
                            </Flex>
                        </Stack>
                    </Card.Body>
                </Card.Root>
            </SimpleGrid>
        </Stack>
    );
}
