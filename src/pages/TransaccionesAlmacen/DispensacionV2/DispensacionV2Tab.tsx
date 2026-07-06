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
import { useState } from "react";
import DispensacionV2Step1SelectArea, { type AreaOperativaDispensacionV2 } from "./DispensacionV2Step1SelectArea";
import DispensacionV2Step2MpsSemana from "./DispensacionV2Step2MpsSemana";

const steps = [
    { title: "Área", description: "Área operativa" },
    { title: "MPS", description: "Semana" },
];

export default function DispensacionV2Tab() {
    const [activeStep, setActiveStep] = useState(0);
    const [selectedArea, setSelectedArea] = useState<AreaOperativaDispensacionV2 | null>(null);

    const goToStep0 = () => setActiveStep(0);
    const goToStep1 = () => {
        if (selectedArea) {
            setActiveStep(1);
        }
    };

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
                        onSelectArea={setSelectedArea}
                        onNext={goToStep1}
                    />
                )}

                {activeStep === 1 && selectedArea && (
                    <DispensacionV2Step2MpsSemana
                        selectedArea={selectedArea}
                        onBack={goToStep0}
                    />
                )}
            </Flex>
        </Container>
    );
}
