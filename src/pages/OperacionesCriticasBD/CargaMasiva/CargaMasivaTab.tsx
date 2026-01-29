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
import CargaMasivaStep0Informacion from "./steps/CargaMasivaStep0Informacion";
import CargaMasivaStep1SubirValidar from "./steps/CargaMasivaStep1SubirValidar";
import CargaMasivaStep2Ejecutar from "./steps/CargaMasivaStep2Ejecutar";

const steps = [
    { title: "Información y plantilla", description: "Descargar plantilla Excel" },
    { title: "Subir y validar Excel", description: "Subir archivo y validar" },
    { title: "Realizar carga masiva", description: "Ejecutar actualización" },
];

export default function CargaMasivaTab() {
    const { activeStep, setActiveStep } = useSteps({
        index: 0,
        count: steps.length,
    });

    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [excelData, setExcelData] = useState<any[] | null>(null);

    const handleReset = () => {
        setExcelFile(null);
        setExcelData(null);
        setActiveStep(0);
    };

    function ConditionalRenderStep() {
        if (activeStep === 0) {
            return <CargaMasivaStep0Informacion setActiveStep={setActiveStep} />;
        }
        if (activeStep === 1) {
            return (
                <CargaMasivaStep1SubirValidar
                    setActiveStep={setActiveStep}
                    setExcelFile={setExcelFile}
                    setExcelData={setExcelData}
                />
            );
        }
        if (activeStep === 2) {
            return (
                <CargaMasivaStep2Ejecutar
                    setActiveStep={setActiveStep}
                    excelFile={excelFile}
                    onSuccess={handleReset}
                />
            );
        }
        return null;
    }

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
            <Flex direction="column" gap={4}>
                <Stepper index={activeStep} p="1em" backgroundColor="teal.50" w="full">
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
                <ConditionalRenderStep />
            </Flex>
        </Container>
    );
}
