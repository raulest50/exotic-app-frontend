import { Steps, Box, Container, Flex } from "@chakra-ui/react";
import { LuCheck } from 'react-icons/lu';
import { useState } from "react";
import SinInsumosStep1Informacion from "./steps/SinInsumosStep1Informacion";
import SinInsumosStep2SubirValidar from "./steps/SinInsumosStep2SubirValidar";
import SinInsumosStep3Ejecutar from "./steps/SinInsumosStep3Ejecutar";

const steps = [
    { title: "Información y plantilla", description: "Descargar plantilla Excel" },
    { title: "Subir y validar Excel", description: "Subir archivo y validar" },
    { title: "Realizar carga masiva", description: "Ejecutar alta de terminados" },
];

export default function CargaMasivaTerminadosSinInsumosFlow() {
    const [activeStep, setActiveStep] = useState(0);

    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [, setExcelData] = useState<unknown[] | null>(null);

    const handleReset = () => {
        setExcelFile(null);
        setExcelData(null);
        setActiveStep(0);
    };

    function ConditionalRenderStep() {
        if (activeStep === 0) {
            return <SinInsumosStep1Informacion setActiveStep={setActiveStep} />;
        }
        if (activeStep === 1) {
            return (
                <SinInsumosStep2SubirValidar
                    setActiveStep={setActiveStep}
                    setExcelFile={setExcelFile}
                    setExcelData={setExcelData}
                />
            );
        }
        if (activeStep === 2) {
            return (
                <SinInsumosStep3Ejecutar
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
                <Steps.Root step={activeStep} count={steps.length} p="1em" backgroundColor="app.stepperTeal" w="full">
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
