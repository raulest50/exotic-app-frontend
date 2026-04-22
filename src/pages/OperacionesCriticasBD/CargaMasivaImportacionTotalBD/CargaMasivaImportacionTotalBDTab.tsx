import {
    Box,
    Button,
    Container,
    Flex,
    StepDescription,
    StepNumber,
    StepSeparator,
    StepStatus,
    useSteps,
} from "@chakra-ui/react";
import { Step, StepIcon, StepIndicator, Stepper, StepTitle } from "@chakra-ui/icons";
import { useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import ImportacionTotalBDStep0Informacion from "./steps/ImportacionTotalBDStep0Informacion";
import ImportacionTotalBDStep1Preparar from "./steps/ImportacionTotalBDStep1Preparar";
import ImportacionTotalBDStep2Ejecutar from "./steps/ImportacionTotalBDStep2Ejecutar";

const steps = [
    { title: "Advertencias", description: "Entender el alcance destructivo" },
    { title: "Archivo y token", description: "Seleccionar .dump y confirmar" },
    { title: "Ejecutar importacion", description: "Lanzar el restore total" },
];

interface CargaMasivaImportacionTotalBDTabProps {
    onBackToSelector: () => void;
}

export default function CargaMasivaImportacionTotalBDTab({ onBackToSelector }: CargaMasivaImportacionTotalBDTabProps) {
    const { activeStep, setActiveStep } = useSteps({
        index: 0,
        count: steps.length,
    });

    const [dumpFile, setDumpFile] = useState<File | null>(null);
    const [navigationLocked, setNavigationLocked] = useState(false);

    const handleReset = () => {
        setDumpFile(null);
        setNavigationLocked(false);
        setActiveStep(0);
    };

    function ConditionalRenderStep() {
        if (activeStep === 0) {
            return <ImportacionTotalBDStep0Informacion setActiveStep={setActiveStep} />;
        }
        if (activeStep === 1) {
            return (
                <ImportacionTotalBDStep1Preparar
                    setActiveStep={setActiveStep}
                    dumpFile={dumpFile}
                    setDumpFile={setDumpFile}
                />
            );
        }
        if (activeStep === 2) {
            return (
                <ImportacionTotalBDStep2Ejecutar
                    setActiveStep={setActiveStep}
                    dumpFile={dumpFile}
                    onReset={handleReset}
                    setNavigationLocked={setNavigationLocked}
                />
            );
        }
        return null;
    }

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
            <Flex direction="column" gap={4}>
                <Button
                    leftIcon={<FaArrowLeft />}
                    w="fit-content"
                    variant="outline"
                    onClick={onBackToSelector}
                    isDisabled={navigationLocked}
                >
                    Volver
                </Button>
                <Stepper index={activeStep} p="1em" backgroundColor="orange.50" w="full">
                    {steps.map((step, index) => (
                        <Step key={index}>
                            <StepIndicator>
                                <StepStatus
                                    complete={<StepIcon />}
                                    incomplete={<StepNumber />}
                                    active={<StepNumber />}
                                />
                            </StepIndicator>
                            <Box flexShrink="0">
                                <StepTitle>{step.title}</StepTitle>
                                <StepDescription>{step.description}</StepDescription>
                            </Box>
                            <StepSeparator />
                        </Step>
                    ))}
                </Stepper>
                {ConditionalRenderStep()}
            </Flex>
        </Container>
    );
}
