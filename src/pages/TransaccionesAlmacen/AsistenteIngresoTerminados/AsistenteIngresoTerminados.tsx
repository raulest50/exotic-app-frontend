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
import { useAuth } from "../../../context/AuthContext.tsx";
import { IngresoTerminadoConsultaResponse, IngresoTerminadoDatos } from "./types.ts";
import IngresoTerminadosStep0_BuscarLote from "./IngresoTerminadosStep0_BuscarLote.tsx";
import IngresoTerminadosStep1_Digitacion from "./IngresoTerminadosStep1_Digitacion.tsx";
import IngresoTerminadosStep2_Confirmacion from "./IngresoTerminadosStep2_Confirmacion.tsx";

const steps = [
    { title: "Paso 1", description: "Identificar Lote" },
    { title: "Paso 2", description: "Digitación Ingreso" },
    { title: "Paso 3", description: "Confirmación" },
];

export function AsistenteIngresoTerminados() {
    const { activeStep, setActiveStep } = useSteps({
        index: 0,
        count: steps.length,
    });

    const [consultaResult, setConsultaResult] = useState<IngresoTerminadoConsultaResponse | null>(null);
    const [ingresoDatos, setIngresoDatos] = useState<IngresoTerminadoDatos | null>(null);

    const { user } = useAuth();

    const handleSuccess = () => {
        // Reiniciar todo el wizard al paso 0
        setConsultaResult(null);
        setIngresoDatos(null);
        setActiveStep(0);
    };

    function ConditionalRenderStep() {
        if (activeStep === 0) {
            return (
                <IngresoTerminadosStep0_BuscarLote
                    setActiveStep={setActiveStep}
                    setConsultaResult={(result) => setConsultaResult(result)}
                />
            );
        }
        if (activeStep === 1 && consultaResult) {
            return (
                <IngresoTerminadosStep1_Digitacion
                    consultaResult={consultaResult}
                    setActiveStep={setActiveStep}
                    setIngresoDatos={setIngresoDatos}
                    setConsultaResult={() => setConsultaResult(null)}
                />
            );
        }
        if (activeStep === 2 && consultaResult && ingresoDatos) {
            return (
                <IngresoTerminadosStep2_Confirmacion
                    consultaResult={consultaResult}
                    ingresoDatos={ingresoDatos}
                    username={user ?? undefined}
                    setActiveStep={setActiveStep}
                    onSuccess={handleSuccess}
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
