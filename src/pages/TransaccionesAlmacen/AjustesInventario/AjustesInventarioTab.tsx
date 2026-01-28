import {
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
import { useMemo, useState } from "react";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import { Producto } from "../../Productos/types.tsx";
import AjustesInventarioStep0SelectProducts from "./Step1_SelProd_AdjInv.tsx";
import AjustesInventarioStep1SpecifyQuantities from "./Step2_FillData.tsx";
import AjustesInventarioStep2ReviewSubmit from "./Step3_SendAjuste.tsx";
import { useAuth } from "../../../context/AuthContext.tsx";

const steps = [
    {title: "AjusteInvStep_Zero", label: "Seleccionar", description: "Selección de productos"},
    {title: "AjusteInvStep_One", label: "Cantidades", description: "Especificar cantidades"},
    {title: "AjusteInvStep_Two", label: "Revisar", description: "Revisar y enviar"},
    {title: "AjusteInvStep_Confirmation", label: "Confirmar", description: "Confirmación"}
];

export default function AjustesInventarioTab(){
    const [chkbox, setChkbox] = useState<string[]>(["material empaque"]);
    const [searchText, setSearchText] = useState("");
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedProducts, setSelectedProducts] = useState<Producto[]>([]);
    const [quantities, setQuantities] = useState<Record<string, number | "">>({});
    const [lotIds, setLotIds] = useState<Record<string, number | "">>({});
    const [activeStep, setActiveStep] = useState(0);
    const [observaciones, setObservaciones] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [submissionSuccess, setSubmissionSuccess] = useState(false);
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

    const handleSearch = () => {
        fetchProductos(0);
    };

    const handlePageChange = (newPage: number) => {
        fetchProductos(newPage);
    };

    const handleAddProduct = (producto: Producto) => {
        setSelectedProducts((prevSelected) => {
            if (prevSelected.some((item) => item.productoId === producto.productoId)) {
                return prevSelected;
            }

            return [...prevSelected, producto];
        });
    };

    const handleRemoveProduct = (productoId: string) => {
        setSelectedProducts((prevSelected) =>
            prevSelected.filter((item) => item.productoId !== productoId)
        );
        setQuantities((prev) => {
            const {[productoId]: _, ...rest} = prev;
            return rest;
        });
        setLotIds((prev) => {
            const {[productoId]: _, ...rest} = prev;
            return rest;
        });
    };

    const handleChangeQuantity = (productoId: string, value: string) => {
        const parsedValue = value === "" ? "" : Number(value);
        setQuantities((prev) => ({
            ...prev,
            [productoId]: parsedValue,
        }));
    };

    const handleChangeLotId = (productoId: string, value: string) => {
        const parsedValue = value === "" ? "" : Number(value);

        setLotIds((prev) => ({
            ...prev,
            [productoId]: Number.isNaN(parsedValue) ? "" : parsedValue,
        }));
    };

    const handleSendAdjustment = async () => {
        setSubmissionError(null);
        setIsSubmitting(true);

        try {
            const items = selectedProducts.map((producto) => {
                const cantidad = quantities[producto.productoId];
                const loteId = lotIds[producto.productoId];

                const item: {
                    productoId: number;
                    cantidad: number | "";
                    almacen: string;
                    loteId?: number;
                } = {
                    productoId: producto.productoId,
                    cantidad: cantidad,
                    almacen: "GENERAL",
                };

                if (typeof loteId === "number" && !Number.isNaN(loteId)) {
                    item.loteId = loteId;
                }

                return item;
            });

            const payload = {
                items,
                username: user ?? "", // Usando username en lugar de usuarioId para reflejar que se envía el nombre de usuario, no un ID
                ...(observaciones.trim() ? {observaciones: observaciones.trim()} : {}),
                urlDocSoporte: undefined,
            };

            await axios.post(endpoints.save_ajuste_inventario, payload);
            setSubmissionSuccess(true);
            setActiveStep(steps.length - 1);
        } catch (error) {
            console.error("Error enviando el ajuste de inventario:", error);
            setSubmissionError("No se pudo enviar el ajuste. Intenta nuevamente.");
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
        setLotIds({});
        setObservaciones("");
        setSubmissionError(null);
        setSubmissionSuccess(false);
        setActiveStep(0);
    };

    const areQuantitiesValid =
        selectedProducts.length > 0 &&
        selectedProducts.every(({productoId}) => {
            const quantity = quantities[productoId];
            // Ya no verificamos lotId
            const isValidQuantity =
                quantity !== "" && typeof quantity === "number" && !Number.isNaN(quantity);

            return isValidQuantity;
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
                    onChangeQuantity={handleChangeQuantity}
                    lotIds={lotIds}
                    onChangeLotId={handleChangeLotId}
                    observaciones={observaciones}
                    onChangeObservaciones={setObservaciones}
                />
            );
        }

        return (
            <AjustesInventarioStep2ReviewSubmit
                selectedProducts={selectedProducts}
                quantities={quantities}
                lotIds={lotIds}
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

    return (
        <Container minW={['auto', 'container.lg', 'container.xl']} w={'full'} h={'full'}>
            <Flex direction={'column'} gap={4}>
                <Stepper index={activeStep} p={'1em'} backgroundColor={'teal.50'} w={'full'}>
                    {steps.map((step, index) => (
                        <Step key={step.title}>
                            <StepIndicator>
                                <StepStatus complete={<StepIcon />} incomplete={<StepNumber />} active={<StepNumber />}/>
                            </StepIndicator>
                            <Box flexShrink={'0'}>
                                <StepTitle>{step.label}</StepTitle>
                                <StepDescription>{step.description}</StepDescription>
                            </Box>
                            {index < steps.length - 1 && <StepSeparator />}
                        </Step>
                    ))}
                </Stepper>

                <Box backgroundColor={'white'} p={4} borderRadius={'md'} boxShadow={'sm'}>
                    <Box mb={4}>
                        <Text>{steps[activeStep]?.description}</Text>
                    </Box>

                    {renderStepContent()}
                </Box>

                <Flex alignItems={'center'} justifyContent={'space-between'} gap={2}>
                    <Button onClick={goToStart} isDisabled={activeStep === 0} variant={'ghost'}>
                        Volver al paso inicial
                    </Button>

                    <Flex gap={2} justifyContent={'flex-end'}>
                        <Button onClick={goToPrevious} isDisabled={isPreviousDisabled} variant={'outline'}>
                            Anterior
                        </Button>
                        <Button onClick={goToNext} isDisabled={isNextDisabled} colorScheme={'teal'}>
                            Siguiente
                        </Button>
                    </Flex>
                </Flex>
            </Flex>
        </Container>
    );
}
