import { Steps, Box, Container, Flex, useSteps } from "@chakra-ui/react";
import { LuCheck } from 'react-icons/lu';
import { useState } from "react";
import CargaMasivaMaterialesStep0Informacion from "./steps/CargaMasivaMaterialesStep0Informacion";
import CargaMasivaMaterialesStep1SubirValidar from "./steps/CargaMasivaMaterialesStep1SubirValidar";
import CargaMasivaMaterialesStep2Ejecutar from "./steps/CargaMasivaMaterialesStep2Ejecutar";

const steps = [
    { title: "Información y plantilla", description: "Descargar plantilla Excel" },
    { title: "Subir y validar Excel", description: "Subir archivo y validar" },
    { title: "Realizar carga masiva", description: "Ejecutar alta de materiales" },
];

export default function CargaMasivaMaterialesTab() {
    const stepsApi = useSteps({
        defaultStep: 0,
        count: steps.length
    });

    const [excelFile, setExcelFile] = useState<File | null>(null);

    const handleReset = () => {
        setExcelFile(null);
        setActiveStep(0);
    };

    function ConditionalRenderStep() {
        if (activeStep === 0) {
            return <CargaMasivaMaterialesStep0Informacion setActiveStep={setActiveStep} />;
        }
        if (activeStep === 1) {
            return (
                <CargaMasivaMaterialesStep1SubirValidar
                    setActiveStep={setActiveStep}
                    setExcelFile={setExcelFile}
                />
            );
        }
        if (activeStep === 2) {
            return (
                <CargaMasivaMaterialesStep2Ejecutar
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
                <Steps.RootProvider p="1em" backgroundColor="app.stepperTeal" w="full" value={stepsApi}>
                    {steps.map((step, index) => (
                        <Steps.Item key={index}>
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
                </Steps.RootProvider>
                {ConditionalRenderStep()}
            </Flex>
        </Container>
    );
}
