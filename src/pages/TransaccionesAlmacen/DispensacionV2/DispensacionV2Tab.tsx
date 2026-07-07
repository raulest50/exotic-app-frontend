import {
    Box,
    Container,
    Flex,
    Step,
    StepDescription,
    StepIcon,
    StepIndicator,
    StepNumber,
    StepSeparator,
    StepStatus,
    Stepper,
    StepTitle,
} from "@chakra-ui/react";
import { useCallback, useState } from "react";
import DispensacionV2Step1SelectArea, { type AreaOperativaDispensacionV2 } from "./DispensacionV2Step1SelectArea";
import DispensacionV2Step2MpsSemana from "./DispensacionV2Step2MpsSemana";
import DispensacionV2Step3SeleccionOrdenes from "./DispensacionV2Step3SeleccionOrdenes";
import DispensacionV2Step3Materiales from "./DispensacionV2Step3Materiales";
import DispensacionV2Step4Resumen from "./DispensacionV2Step4Resumen";
import DispensacionV2Step5Confirmacion from "./DispensacionV2Step5Confirmacion";
import type {
    DispensacionV2MaterialesRecetaResponseDTO,
    DispensacionV2MpsItemSeleccionado,
    DispensacionV2OrdenSeleccionada,
    DispensacionV2PreparacionResponseDTO,
} from "./DispensacionV2Types";

const steps = [
    { title: "Área", description: "Área operativa" },
    { title: "MPS", description: "Semana" },
    { title: "OPs", description: "Selección" },
    { title: "Materiales", description: "Cantidades" },
    { title: "Resumen", description: "Lotes" },
    { title: "Confirmar", description: "Token" },
];

export default function DispensacionV2Tab() {
    const [activeStep, setActiveStep] = useState(0);
    const [selectedArea, setSelectedArea] = useState<AreaOperativaDispensacionV2 | null>(null);
    const [selectedMpsItem, setSelectedMpsItem] = useState<DispensacionV2MpsItemSeleccionado | null>(null);
    const [selectedOrdenes, setSelectedOrdenes] = useState<DispensacionV2OrdenSeleccionada[]>([]);
    const [materialesReceta, setMaterialesReceta] = useState<DispensacionV2MaterialesRecetaResponseDTO | null>(null);
    const [asignacion, setAsignacion] = useState<DispensacionV2PreparacionResponseDTO | null>(null);

    const goToStep0 = useCallback(() => setActiveStep(0), []);
    const goToStep1 = useCallback(() => {
        if (selectedArea) {
            setActiveStep(1);
        }
    }, [selectedArea]);
    const goToStep2 = useCallback(() => {
        if (selectedArea && selectedMpsItem) {
            setActiveStep(2);
        }
    }, [selectedArea, selectedMpsItem]);
    const goToStep3 = useCallback(() => {
        if (selectedArea && selectedMpsItem && selectedOrdenes.length > 0) {
            setActiveStep(3);
        }
    }, [selectedArea, selectedMpsItem, selectedOrdenes.length]);
    const goToStep4 = useCallback(() => {
        if (asignacion) {
            setActiveStep(4);
        }
    }, [asignacion]);
    const goToStep5 = useCallback(() => {
        if (asignacion) {
            setActiveStep(5);
        }
    }, [asignacion]);

    const handleSelectArea = useCallback((area: AreaOperativaDispensacionV2 | null) => {
        setSelectedArea(area);
        setSelectedMpsItem(null);
        setSelectedOrdenes([]);
        setMaterialesReceta(null);
        setAsignacion(null);
    }, []);

    const handleSelectMpsItem = useCallback((mpsItem: DispensacionV2MpsItemSeleccionado) => {
        setSelectedMpsItem(mpsItem);
        setSelectedOrdenes([]);
        setMaterialesReceta(null);
        setAsignacion(null);
        setActiveStep(2);
    }, []);

    const handleSelectedOrdenesChange = useCallback((ordenes: DispensacionV2OrdenSeleccionada[]) => {
        setSelectedOrdenes(ordenes);
        setMaterialesReceta(null);
        setAsignacion(null);
    }, []);

    const handleToggleOrden = useCallback((orden: DispensacionV2OrdenSeleccionada) => {
        const exists = selectedOrdenes.some((selected) => selected.ordenProduccionId === orden.ordenProduccionId);
        handleSelectedOrdenesChange(
            exists
                ? selectedOrdenes.filter((selected) => selected.ordenProduccionId !== orden.ordenProduccionId)
                : [...selectedOrdenes, orden],
        );
    }, [handleSelectedOrdenesChange, selectedOrdenes]);

    const handleToggleOrdenes = useCallback((ordenes: DispensacionV2OrdenSeleccionada[], shouldSelect: boolean) => {
        const ordenIds = new Set(ordenes.map((orden) => orden.ordenProduccionId));
        if (!shouldSelect) {
            handleSelectedOrdenesChange(selectedOrdenes.filter((selected) => !ordenIds.has(selected.ordenProduccionId)));
            return;
        }

        const selectedIds = new Set(selectedOrdenes.map((orden) => orden.ordenProduccionId));
        const nextOrdenes = ordenes.filter((orden) => !selectedIds.has(orden.ordenProduccionId));
        handleSelectedOrdenesChange([...selectedOrdenes, ...nextOrdenes]);
    }, [handleSelectedOrdenesChange, selectedOrdenes]);

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
            <Flex direction="column" gap={4}>
                <Stepper index={activeStep} p="1em" backgroundColor="app.stepperTeal" w="full">
                    {steps.map((step, index) => (
                        <Step key={step.title}>
                            <StepIndicator>
                                <StepStatus complete={<StepIcon />} incomplete={<StepNumber />} active={<StepNumber />} />
                            </StepIndicator>
                            <Box flexShrink="0">
                                <StepTitle>{step.title}</StepTitle>
                                <StepDescription>{step.description}</StepDescription>
                            </Box>
                            {index < steps.length - 1 && <StepSeparator />}
                        </Step>
                    ))}
                </Stepper>

                {activeStep === 0 && (
                    <DispensacionV2Step1SelectArea
                        selectedArea={selectedArea}
                        onSelectArea={handleSelectArea}
                        onNext={goToStep1}
                    />
                )}

                {activeStep === 1 && selectedArea && (
                    <DispensacionV2Step2MpsSemana
                        selectedArea={selectedArea}
                        onSelectMpsItem={handleSelectMpsItem}
                        onBack={goToStep0}
                    />
                )}

                {activeStep === 2 && selectedArea && selectedMpsItem && (
                    <DispensacionV2Step3SeleccionOrdenes
                        selectedItem={selectedMpsItem}
                        selectedArea={selectedArea}
                        selectedOrdenes={selectedOrdenes}
                        onToggleOrden={handleToggleOrden}
                        onToggleOrdenes={handleToggleOrdenes}
                        onBack={goToStep1}
                        onNext={goToStep3}
                    />
                )}

                {activeStep === 3 && selectedArea && selectedMpsItem && (
                    <DispensacionV2Step3Materiales
                        selectedArea={selectedArea}
                        selectedMpsItem={selectedMpsItem}
                        selectedOrdenes={selectedOrdenes}
                        materialesReceta={materialesReceta}
                        onMaterialesRecetaChange={setMaterialesReceta}
                        onAsignacionReady={(nextAsignacion) => {
                            setAsignacion(nextAsignacion);
                            setActiveStep(4);
                        }}
                        onBack={goToStep2}
                    />
                )}

                {activeStep === 4 && asignacion && (
                    <DispensacionV2Step4Resumen
                        asignacion={asignacion}
                        onAsignacionChange={setAsignacion}
                        onBack={goToStep3}
                        onNext={goToStep5}
                    />
                )}

                {activeStep === 5 && asignacion && (
                    <DispensacionV2Step5Confirmacion
                        asignacion={asignacion}
                        onBack={goToStep4}
                    />
                )}
            </Flex>
        </Container>
    );
}
