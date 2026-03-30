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
import { IngresoTerminadoValidado } from "./types.ts";
import IngresoTerminadosStep0_DescargarPlantilla from "./IngresoTerminadosStep0_DescargarPlantilla.tsx";
import IngresoTerminadosStep1_SubirValidar from "./IngresoTerminadosStep1_SubirValidar.tsx";
import IngresoTerminadosStep2_RevisionConfirmacion from "./IngresoTerminadosStep2_RevisionConfirmacion.tsx";

const steps = [
    { title: "Paso 1", description: "Descargar Plantilla" },
    { title: "Paso 2", description: "Subir y Validar" },
    { title: "Paso 3", description: "Confirmacion" },
];

export function AsistenteIngresoTerminados() {
    const { activeStep, setActiveStep } = useSteps({
        index: 0,
        count: steps.length,
    });

    const [ingresosValidados, setIngresosValidados] = useState<IngresoTerminadoValidado[]>([]);

    const { user } = useAuth();

    const handleSuccess = () => {
        // Reiniciar todo el wizard al paso 0
        setIngresosValidados([]);
        setActiveStep(0);
    };

    function ConditionalRenderStep() {
        if (activeStep === 0) {
            return (
                <IngresoTerminadosStep0_DescargarPlantilla
                    setActiveStep={setActiveStep}
                />
            );
        }
        if (activeStep === 1) {
            return (
                <IngresoTerminadosStep1_SubirValidar
                    setActiveStep={setActiveStep}
                    setIngresosValidados={setIngresosValidados}
                />
            );
        }
        if (activeStep === 2 && ingresosValidados.length > 0) {
            return (
                <IngresoTerminadosStep2_RevisionConfirmacion
                    ingresosValidados={ingresosValidados}
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
