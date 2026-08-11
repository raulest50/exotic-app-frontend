import { Steps, Box, Container, Flex } from "@chakra-ui/react";
import { LuCheck } from 'react-icons/lu';
import { useState } from "react";
import SoloInsumosStep2SubirValidar from "./steps/SoloInsumosStep2SubirValidar";
import SoloInsumosStep3Ejecutar from "./steps/SoloInsumosStep3Ejecutar";

const steps = [
    { title: "Subir y validar JSON", description: "Validar estructura y negocio" },
    { title: "Realizar carga masiva", description: "Ejecutar alta de terminados" },
];

export default function CargaMasivaTerminadosSoloInsumosFlow() {
    const [activeStep, setActiveStep] = useState(0);

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
                <Steps.Root step={activeStep} count={steps.length} p="1em" backgroundColor="app.stepperBlue" w="full">
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
