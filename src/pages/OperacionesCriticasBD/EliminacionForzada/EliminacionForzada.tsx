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
import EliminacionStep0SelectEntityType from "./EliminacionStep0SelectEntityType.tsx";
import EliminacionOCMStep1SelectAndStudy from "./OrdenCompra/EliminacionOCMStep1SelectAndStudy";
import EliminacionOCMStep2StudyResult from "./OrdenCompra/EliminacionOCMStep2StudyResult";
import EliminacionOPStep1SelectAndStudy from "./OrdenProduccion/EliminacionOPStep1SelectAndStudy";
import EliminacionOPStep2StudyResult from "./OrdenProduccion/EliminacionOPStep2StudyResult";
import type { OrdenProduccionPickItem } from "./OrdenProduccion/OrdenProduccionPicker";
import type { OrdenCompraMateriales } from "../../Compras/types";
import type {
    EstudiarEliminacionOCMResponseDTO,
    EstudiarEliminacionOPResponseDTO,
} from "./types";

const steps = [
    { title: "Tipo de entidad", description: "Seleccionar tipo de entidad a eliminar" },
    { title: "Seleccionar y estudiar", description: "Elegir registro y estudiar dependencias" },
    { title: "Resultado del estudio", description: "Ver dependencias que bloquean la eliminación" },
];

export type TipoEntidadEliminacion = "ORDEN_COMPRA" | "ORDEN_PRODUCCION";

export default function EliminacionForzada() {
    const { activeStep, setActiveStep } = useSteps({
        index: 0,
        count: steps.length,
    });

    const [tipoEntidad, setTipoEntidad] = useState<TipoEntidadEliminacion | null>(null);
    const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrdenCompraMateriales | null>(null);
    const [studyResult, setStudyResult] = useState<EstudiarEliminacionOCMResponseDTO | null>(null);
    const [ordenProduccionSeleccionada, setOrdenProduccionSeleccionada] =
        useState<OrdenProduccionPickItem | null>(null);
    const [studyResultOP, setStudyResultOP] =
        useState<EstudiarEliminacionOPResponseDTO | null>(null);

    const handleReset = () => {
        setTipoEntidad(null);
        setOrdenSeleccionada(null);
        setStudyResult(null);
        setOrdenProduccionSeleccionada(null);
        setStudyResultOP(null);
        setActiveStep(0);
    };

    function ConditionalRenderStep() {
        if (activeStep === 0) {
            return (
                <EliminacionStep0SelectEntityType
                    setActiveStep={setActiveStep}
                    setTipoEntidad={setTipoEntidad}
                />
            );
        }
        if (activeStep === 1) {
            if (tipoEntidad === "ORDEN_PRODUCCION") {
                return (
                    <EliminacionOPStep1SelectAndStudy
                        setActiveStep={setActiveStep}
                        ordenProduccionSeleccionada={ordenProduccionSeleccionada}
                        setOrdenProduccionSeleccionada={setOrdenProduccionSeleccionada}
                        setStudyResultOP={setStudyResultOP}
                    />
                );
            }
            return (
                <EliminacionOCMStep1SelectAndStudy
                    setActiveStep={setActiveStep}
                    ordenSeleccionada={ordenSeleccionada}
                    setOrdenSeleccionada={setOrdenSeleccionada}
                    setStudyResult={setStudyResult}
                />
            );
        }
        if (activeStep === 2) {
            if (tipoEntidad === "ORDEN_PRODUCCION") {
                return (
                    <EliminacionOPStep2StudyResult
                        setActiveStep={setActiveStep}
                        studyResultOP={studyResultOP}
                        onReset={handleReset}
                    />
                );
            }
            return (
                <EliminacionOCMStep2StudyResult
                    setActiveStep={setActiveStep}
                    studyResult={studyResult}
                    onReset={handleReset}
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
