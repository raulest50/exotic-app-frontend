import { Steps, Box, Button, Container, Flex } from "@chakra-ui/react";
import { LuCheck } from 'react-icons/lu';
import { useColorModeValue } from "../../../components/ui/color-mode";
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
    const [activeStep, setActiveStep] = useState(0);
    const stepperBg = useColorModeValue("orange.50", "orange.900");

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
                    w="fit-content"
                    variant="outline"
                    onClick={onBackToSelector}
                    disabled={navigationLocked}><FaArrowLeft />Volver
                                    </Button>
                <Steps.Root step={activeStep} count={steps.length} p="1em" backgroundColor={stepperBg} w="full">
                    <Steps.List>
                        {steps.map((step, index) => (
                            <Steps.Item key={step.title} index={index}>
                                <Steps.Indicator>
                                    <Steps.Status
                                        complete={<LuCheck />}
                                        incomplete={<Steps.Number />}
                                        current={<Steps.Number />}
                                    />
                                </Steps.Indicator>
                                <Box flexShrink="0">
                                    <Steps.Title>{step.title}</Steps.Title>
                                    <Steps.Description>{step.description}</Steps.Description>
                                </Box>
                                <Steps.Separator />
                            </Steps.Item>
                        ))}
                    </Steps.List>
                </Steps.Root>
                {ConditionalRenderStep()}
            </Flex>
        </Container>
    );
}
