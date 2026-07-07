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
import DispensacionV2Step3Materiales from "./DispensacionV2Step3Materiales";
import DispensacionV2Step4Resumen from "./DispensacionV2Step4Resumen";
import DispensacionV2Step5Confirmacion from "./DispensacionV2Step5Confirmacion";
import type {
    DispensacionV2OrdenSeleccionada,
    DispensacionV2PreparacionResponseDTO,
} from "./DispensacionV2Types";

const steps = [
    { title: "Área", description: "Área operativa" },
    { title: "MPS", description: "Semana" },
    { title: "Materiales", description: "Cantidades" },
    { title: "Resumen", description: "Lotes" },
    { title: "Confirmar", description: "Token" },
];

export default function DispensacionV2Tab() {
    const [activeStep, setActiveStep] = useState(0);
    const [selectedArea, setSelectedArea] = useState<AreaOperativaDispensacionV2 | null>(null);
    const [selectedOrdenes, setSelectedOrdenes] = useState<DispensacionV2OrdenSeleccionada[]>([]);
    const [preparacion, setPreparacion] = useState<DispensacionV2PreparacionResponseDTO | null>(null);
    const [asignacion, setAsignacion] = useState<DispensacionV2PreparacionResponseDTO | null>(null);

    const goToStep0 = useCallback(() => setActiveStep(0), []);
    const goToStep1 = useCallback(() => {
        if (selectedArea) {
            setActiveStep(1);
        }
    }, [selectedArea]);
    const goToStep2 = useCallback(() => {
        if (selectedArea && selectedOrdenes.length > 0) {
            setActiveStep(2);
        }
    }, [selectedArea, selectedOrdenes.length]);
    const goToStep3 = useCallback(() => {
        if (asignacion) {
            setActiveStep(3);
        }
    }, [asignacion]);
    const goToStep4 = useCallback(() => {
        if (asignacion) {
            setActiveStep(4);
        }
    }, [asignacion]);

    const handleSelectArea = useCallback((area: AreaOperativaDispensacionV2 | null) => {
        setSelectedArea(area);
        setSelectedOrdenes([]);
        setPreparacion(null);
        setAsignacion(null);
    }, []);

    const handleSelectedOrdenesChange = useCallback((ordenes: DispensacionV2OrdenSeleccionada[]) => {
        setSelectedOrdenes(ordenes);
        setPreparacion(null);
        setAsignacion(null);
    }, []);

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
                        selectedOrdenes={selectedOrdenes}
                        onSelectedOrdenesChange={handleSelectedOrdenesChange}
                        onBack={goToStep0}
                        onNext={goToStep2}
                    />
                )}

                {activeStep === 2 && selectedArea && (
                    <DispensacionV2Step3Materiales
                        selectedArea={selectedArea}
                        selectedOrdenes={selectedOrdenes}
                        preparacion={preparacion}
                        onPreparacionChange={setPreparacion}
                        onAsignacionReady={(nextAsignacion) => {
                            setAsignacion(nextAsignacion);
                            setActiveStep(3);
                        }}
                        onBack={goToStep1}
                    />
                )}

                {activeStep === 3 && asignacion && (
                    <DispensacionV2Step4Resumen
                        asignacion={asignacion}
                        onAsignacionChange={setAsignacion}
                        onBack={() => setActiveStep(2)}
                        onNext={goToStep4}
                    />
                )}

                {activeStep === 4 && asignacion && (
                    <DispensacionV2Step5Confirmacion
                        asignacion={asignacion}
                        onBack={goToStep3}
                    />
                )}
            </Flex>
        </Container>
    );
}
