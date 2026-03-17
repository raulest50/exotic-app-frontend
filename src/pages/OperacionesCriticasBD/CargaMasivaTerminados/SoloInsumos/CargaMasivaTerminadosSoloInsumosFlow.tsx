import {
    Box,
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
import SoloInsumosStep2SubirValidar from "./steps/SoloInsumosStep2SubirValidar";
import SoloInsumosStep3Ejecutar from "./steps/SoloInsumosStep3Ejecutar";

const steps = [
    { title: "Subir y validar JSON", description: "Validar estructura y negocio" },
    { title: "Realizar carga masiva", description: "Ejecutar alta de terminados" },
];

export default function CargaMasivaTerminadosSoloInsumosFlow() {
    const { activeStep, setActiveStep } = useSteps({
        index: 0,
        count: steps.length,
    });

    const [jsonFile, setJsonFile] = useState<File | null>(null);
    const handleReset = () => {
        setJsonFile(null);
        setActiveStep(0);
    };

    function ConditionalRenderStep() {
        if (activeStep === 0) {
            return <SoloInsumosStep2SubirValidar setActiveStep={setActiveStep} setJsonFile={setJsonFile} />;
        }
        if (activeStep === 1) {
            return (
                <SoloInsumosStep3Ejecutar
                    setActiveStep={setActiveStep}
                    jsonFile={jsonFile}
                    onSuccess={handleReset}
                />
            );
        }
        return null;
    }

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
            <Flex direction="column" gap={4}>
                <Stepper index={activeStep} p="1em" backgroundColor="blue.50" w="full">
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
