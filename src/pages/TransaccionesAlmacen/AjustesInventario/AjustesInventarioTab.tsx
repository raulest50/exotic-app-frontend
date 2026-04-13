import {
    Alert,
    AlertDescription,
    AlertIcon,
    Box,
    Button,
    Container,
    Flex,
    Step,
    StepDescription,
    StepIcon,
    StepIndicator,
    StepNumber,
    StepSeparator,
    StepStatus,
    StepTitle,
    Stepper,
    Text,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import type { Producto } from "../../Productos/types.tsx";
import AjustesInventarioStep0SelectProducts from "./Step1_SelProd_AdjInv.tsx";
import AjustesInventarioStep1SpecifyQuantities from "./Step2_FillData.tsx";
import AjustesInventarioStep2ReviewSubmit from "./Step3_SendAjuste.tsx";
import { useAuth } from "../../../context/AuthContext.tsx";
import AjusteSalidaLotePicker from "./AjusteSalidaLotePicker.tsx";
import AjusteEntradaLotePicker from "./AjusteEntradaLotePicker.tsx";
import type {
    AjusteInventarioItemNormalizado,
    AjusteLoteAsignado,
    AjusteLoteOption,
    AjusteLotePageResponse,
} from "./types";

const steps = [
    { title: "AjusteInvStep_Zero", label: "Seleccionar", description: "Selección de productos" },
    { title: "AjusteInvStep_One", label: "Cantidades", description: "Especificar cantidades y lotes" },
    { title: "AjusteInvStep_Two", label: "Revisar", description: "Revisar y enviar" },
    { title: "AjusteInvStep_Confirmation", label: "Confirmar", description: "Confirmación" },
];

const DECIMAL_TOLERANCE = 0.0001;

export default function AjustesInventarioTab() {
    const [chkbox, setChkbox] = useState<string[]>(["material empaque"]);
    const [searchText, setSearchText] = useState("");
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedProducts, setSelectedProducts] = useState<Producto[]>([]);
    const [quantities, setQuantities] = useState<Record<string, number | "">>({});
    const [stockByProduct, setStockByProduct] = useState<Record<string, number | null>>({});
    const [lotAssignments, setLotAssignments] = useState<Record<string, AjusteLoteAsignado[]>>({});
    const [activeStep, setActiveStep] = useState(0);
    const [observaciones, setObservaciones] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [submissionSuccess, setSubmissionSuccess] = useState(false);
    const [positivePickerProduct, setPositivePickerProduct] = useState<Producto | null>(null);
    const [negativePickerProduct, setNegativePickerProduct] = useState<Producto | null>(null);
    const pageSize = 10;

    const endpoints = useMemo(() => new EndPointsURL(), []);
    const { user } = useAuth();

    const fetchProductos = async (pageNumber: number) => {
        setLoading(true);
        try {
            const response = await axios.post(endpoints.consulta_productos, {
                search: searchText,
                categories: chkbox,
                page: pageNumber,
                size: pageSize,
            });
            setProductos(response.data.content);
            setTotalPages(response.data.totalPages);
            setPage(response.data.number);
        } catch (error) {
            console.error("Error searching productos:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeStep !== 1 || selectedProducts.length === 0) {
            return;
        }

        let cancelled = false;

        const hydrateStocks = async () => {
            const updates = await Promise.all(
                selectedProducts.map(async (producto) => {
                    const stock = await fetchTotalStockForProduct(producto.productoId);
                    return [producto.productoId, stock] as const;
                })
            );

            if (!cancelled) {
                setStockByProduct((prev) => {
                    const next = { ...prev };
                    updates.forEach(([productoId, stock]) => {
                        next[productoId] = stock;
                    });
                    return next;
                });
            }
        };

        void hydrateStocks();

        return () => {
            cancelled = true;
        };
    }, [activeStep, selectedProducts, endpoints]);

    const fetchAllLotesExistentes = async (productoId: string): Promise<AjusteLoteOption[]> => {
        const collected: AjusteLoteOption[] = [];
        let currentPage = 0;
        let totalPagesResp = 1;

        while (currentPage < totalPagesResp) {
            const response = await axios.get<AjusteLotePageResponse>(endpoints.ajustes_lotes_existentes, {
                params: { productoId, page: currentPage, size: 100 },
            });
            collected.push(...response.data.lotesDisponibles);
            totalPagesResp = response.data.totalPages;
            currentPage += 1;
        }

        return collected;
    };

    const fetchTotalStockForProduct = async (productoId: string): Promise<number> => {
        try {
            const lotes = await fetchAllLotesExistentes(productoId);
            return lotes.reduce((acc, lote) => acc + lote.cantidadDisponible, 0);
        } catch (error) {
            console.error("Error fetching stock for product:", productoId, error);
            return 0;
        }
    };

    const handleSearch = () => {
        void fetchProductos(0);
    };

    const handlePageChange = (newPage: number) => {
        void fetchProductos(newPage);
    };

    const handleAddProduct = (producto: Producto) => {
        setSelectedProducts((prevSelected) => {
            if (prevSelected.some((item) => item.productoId === producto.productoId)) {
                return prevSelected;
            }

            return [...prevSelected, producto];
        });
        setStockByProduct((prev) => ({
            ...prev,
            [producto.productoId]: prev[producto.productoId] ?? null,
        }));
    };

    const handleRemoveProduct = (productoId: string) => {
        setSelectedProducts((prevSelected) => prevSelected.filter((item) => item.productoId !== productoId));
        setQuantities((prev) => {
            const { [productoId]: _removed, ...rest } = prev;
            return rest;
        });
        setLotAssignments((prev) => {
            const { [productoId]: _removed, ...rest } = prev;
            return rest;
        });
        setStockByProduct((prev) => {
            const { [productoId]: _removed, ...rest } = prev;
            return rest;
        });
    };

    const handleChangeQuantity = (productoId: string, value: number | "") => {
        const currentValue = quantities[productoId];
        const newValue = value === "" || Number.isNaN(value) ? "" : value;

        setQuantities((prev) => ({
            ...prev,
            [productoId]: newValue,
        }));

        setLotAssignments((prev) => {
            if (newValue === "" || newValue === 0) {
                const { [productoId]: _removed, ...rest } = prev;
                return rest;
            }

            const previousAssignments = prev[productoId] ?? [];
            const previousSign =
                typeof currentValue === "number" && currentValue !== 0 ? Math.sign(currentValue) : null;
            const nextSign = Math.sign(newValue);

            if (previousAssignments.length === 0) {
                return prev;
            }

            if (previousSign !== nextSign) {
                const { [productoId]: _removed, ...rest } = prev;
                return rest;
            }

            if (newValue > 0 && previousAssignments.length === 1) {
                return {
                    ...prev,
                    [productoId]: [{ ...previousAssignments[0], cantidadAsignada: newValue }],
                };
            }

            return prev;
        });
    };

    const getAssignmentsTotal = (productoId: string) =>
        (lotAssignments[productoId] ?? []).reduce((acc, lote) => acc + lote.cantidadAsignada, 0);

    const isAssignmentValid = (productoId: string) => {
        const quantity = quantities[productoId];
        if (quantity === "" || typeof quantity !== "number" || Number.isNaN(quantity) || quantity === 0) {
            return false;
        }

        const assignments = lotAssignments[productoId] ?? [];
        if (assignments.length === 0) {
            return false;
        }

        if (quantity > 0) {
            return (
                assignments.length === 1 &&
                Math.abs(assignments[0].cantidadAsignada - quantity) <= DECIMAL_TOLERANCE
            );
        }

        return Math.abs(getAssignmentsTotal(productoId) - Math.abs(quantity)) <= DECIMAL_TOLERANCE;
    };

    const normalizedItems: AjusteInventarioItemNormalizado[] = selectedProducts.flatMap((producto) => {
        const quantity = quantities[producto.productoId];
        if (quantity === "" || typeof quantity !== "number" || Number.isNaN(quantity) || quantity === 0) {
            return [];
        }

        const assignments = lotAssignments[producto.productoId] ?? [];
        return assignments.map((assignment) => ({
            productoId: producto.productoId,
            productoNombre: producto.nombre,
            tipoProducto: producto.tipo_producto,
            loteId: assignment.loteId,
            batchNumber: assignment.batchNumber,
            cantidad: quantity > 0 ? assignment.cantidadAsignada : -assignment.cantidadAsignada,
        }));
    });

    const parseApiError = (error: unknown, fallback: string) => {
        if (axios.isAxiosError(error)) {
            const apiError = error.response?.data as { error?: string } | undefined;
            if (apiError?.error) {
                return apiError.error;
            }
        }
        return fallback;
    };

    const handleSendAdjustment = async () => {
        setSubmissionError(null);
        setIsSubmitting(true);

        try {
            const payload = {
                items: normalizedItems.map((item) => ({
                    productoId: item.productoId,
                    cantidad: item.cantidad,
                    almacen: "GENERAL",
                    loteId: item.loteId,
                })),
                username: user ?? "",
                ...(observaciones.trim() ? { observaciones: observaciones.trim() } : {}),
            };

            await axios.post(endpoints.save_ajuste_inventario, payload);
            setSubmissionSuccess(true);
            setActiveStep(steps.length - 1);
        } catch (error) {
            console.error("Error enviando el ajuste de inventario:", error);
            setSubmissionError(parseApiError(error, "No se pudo enviar el ajuste. Intenta nuevamente."));
        } finally {
            setIsSubmitting(false);
        }
    };

    const goToNext = () => {
        setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
    };

    const goToStart = () => {
        if (submissionSuccess) {
            resetFlow();
        } else {
            setActiveStep(0);
            setSubmissionError(null);
        }
    };

    const goToPrevious = () => {
        if (submissionSuccess) {
            return;
        }

        setActiveStep((prev) => Math.max(prev - 1, 0));
        setSubmissionError(null);
    };

    const resetFlow = () => {
        setSelectedProducts([]);
        setQuantities({});
        setLotAssignments({});
        setStockByProduct({});
        setObservaciones("");
        setSubmissionError(null);
        setSubmissionSuccess(false);
        setPositivePickerProduct(null);
        setNegativePickerProduct(null);
        setActiveStep(0);
    };

    const areQuantitiesValid =
        selectedProducts.length > 0 &&
        selectedProducts.every(({ productoId }) => {
            const quantity = quantities[productoId];
            return (
                quantity !== "" &&
                typeof quantity === "number" &&
                !Number.isNaN(quantity) &&
                quantity !== 0 &&
                isAssignmentValid(productoId)
            );
        });

    const renderStepContent = () => {
        if (activeStep === 0) {
            return (
                <AjustesInventarioStep0SelectProducts
                    searchText={searchText}
                    setSearchText={setSearchText}
                    chkbox={chkbox}
                    setChkbox={setChkbox}
                    productos={productos}
                    loading={loading}
                    page={page}
                    totalPages={totalPages}
                    handleSearch={handleSearch}
                    handlePageChange={handlePageChange}
                    handleAddProduct={handleAddProduct}
                    handleRemoveProduct={handleRemoveProduct}
                    selectedProducts={selectedProducts}
                />
            );
        }

        if (activeStep === 1) {
            return (
                <AjustesInventarioStep1SpecifyQuantities
                    selectedProducts={selectedProducts}
                    quantities={quantities}
                    stockByProduct={stockByProduct}
                    lotAssignments={lotAssignments}
                    onChangeQuantity={handleChangeQuantity}
                    onOpenPositivePicker={setPositivePickerProduct}
                    onOpenNegativePicker={setNegativePickerProduct}
                    observaciones={observaciones}
                    onChangeObservaciones={setObservaciones}
                />
            );
        }

        return (
            <AjustesInventarioStep2ReviewSubmit
                normalizedItems={normalizedItems}
                observaciones={observaciones}
                currentUserName={user ?? ""}
                onBack={goToPrevious}
                onSend={handleSendAdjustment}
                isSending={isSubmitting}
                error={submissionError}
                isSuccess={submissionSuccess}
                onRestart={resetFlow}
            />
        );
    };

    const isNextDisabled =
        (activeStep === 0 && selectedProducts.length === 0) ||
        (activeStep === 1 && !areQuantitiesValid) ||
        activeStep >= steps.length - 2;

    const isPreviousDisabled = activeStep === 0 || submissionSuccess;

    const positivePickerQuantity =
        positivePickerProduct && typeof quantities[positivePickerProduct.productoId] === "number"
            ? (quantities[positivePickerProduct.productoId] as number)
            : 0;
    const negativePickerQuantity =
        negativePickerProduct && typeof quantities[negativePickerProduct.productoId] === "number"
            ? Math.abs(quantities[negativePickerProduct.productoId] as number)
            : 0;

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
            <Flex direction="column" gap={4}>
                <Stepper index={activeStep} p="1em" backgroundColor="teal.50" w="full">
                    {steps.map((step, index) => (
                        <Step key={step.title}>
                            <StepIndicator>
                                <StepStatus complete={<StepIcon />} incomplete={<StepNumber />} active={<StepNumber />} />
                            </StepIndicator>
                            <Box flexShrink="0">
                                <StepTitle>{step.label}</StepTitle>
                                <StepDescription>{step.description}</StepDescription>
                            </Box>
                            {index < steps.length - 1 && <StepSeparator />}
                        </Step>
                    ))}
                </Stepper>

                {activeStep === 1 && selectedProducts.some((producto) => {
                    const quantity = quantities[producto.productoId];
                    return quantity !== "" && typeof quantity === "number" && quantity < 0 && !isAssignmentValid(producto.productoId);
                }) && (
                    <Alert status="warning" borderRadius="md">
                        <AlertIcon />
                        <AlertDescription>
                            Cada ajuste negativo debe quedar asignado completamente a lotes con saldo disponible en GENERAL.
                        </AlertDescription>
                    </Alert>
                )}

                <Box backgroundColor="white" p={4} borderRadius="md" boxShadow="sm">
                    <Box mb={4}>
                        <Text>{steps[activeStep]?.description}</Text>
                    </Box>

                    {renderStepContent()}
                </Box>

                <Flex alignItems="center" justifyContent="space-between" gap={2}>
                    <Button onClick={goToStart} isDisabled={activeStep === 0} variant="ghost">
                        Volver al paso inicial
                    </Button>

                    <Flex gap={2} justifyContent="flex-end">
                        <Button onClick={goToPrevious} isDisabled={isPreviousDisabled} variant="outline">
                            Anterior
                        </Button>
                        <Button onClick={goToNext} isDisabled={isNextDisabled} colorScheme="teal">
                            Siguiente
                        </Button>
                    </Flex>
                </Flex>
            </Flex>

            {negativePickerProduct && (
                <AjusteSalidaLotePicker
                    isOpen
                    onClose={() => setNegativePickerProduct(null)}
                    onAccept={(assignments) => {
                        setLotAssignments((prev) => ({
                            ...prev,
                            [negativePickerProduct.productoId]: assignments,
                        }));
                    }}
                    productoId={negativePickerProduct.productoId}
                    productoNombre={negativePickerProduct.nombre}
                    cantidadRequerida={negativePickerQuantity}
                    initialSelection={lotAssignments[negativePickerProduct.productoId] ?? []}
                />
            )}

            {positivePickerProduct && (
                <AjusteEntradaLotePicker
                    isOpen
                    onClose={() => setPositivePickerProduct(null)}
                    onAccept={(lote) => {
                        setLotAssignments((prev) => ({
                            ...prev,
                            [positivePickerProduct.productoId]: [
                                {
                                    ...lote,
                                    cantidadAsignada: positivePickerQuantity,
                                },
                            ],
                        }));
                    }}
                    productoId={positivePickerProduct.productoId}
                    productoNombre={positivePickerProduct.nombre}
                    cantidadAjuste={positivePickerQuantity}
                    initialLoteId={lotAssignments[positivePickerProduct.productoId]?.[0]?.loteId ?? null}
                />
            )}
        </Container>
    );
}
