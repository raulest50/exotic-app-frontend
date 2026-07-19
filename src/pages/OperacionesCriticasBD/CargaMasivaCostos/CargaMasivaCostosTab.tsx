import {
    Box,
    Button,
    Container,
    Step,
    StepDescription,
    StepIcon,
    StepIndicator,
    StepNumber,
    StepSeparator,
    StepStatus,
    StepTitle,
    Stepper,
    VStack,
    useBreakpointValue,
} from "@chakra-ui/react";
import { FaArrowLeft } from "react-icons/fa";
import CargaCostosStep1Archivo from "./steps/CargaCostosStep1Archivo";
import CargaCostosStep2Preview from "./steps/CargaCostosStep2Preview";
import CargaCostosStep3Confirmacion from "./steps/CargaCostosStep3Confirmacion";
import { useCargaMasivaCostos } from "./useCargaMasivaCostos";

const STEPS = [
    { title: "Cargar y validar", description: "Informe Excel" },
    { title: "Previsualizar", description: "Revisar costos" },
    { title: "Confirmar", description: "Token y ejecucion" },
];

interface CargaMasivaCostosTabProps {
    onBackToSelector: () => void;
}

export default function CargaMasivaCostosTab({ onBackToSelector }: CargaMasivaCostosTabProps) {
    const flow = useCargaMasivaCostos(onBackToSelector);
    const orientation = useBreakpointValue<"horizontal" | "vertical">({
        base: "vertical",
        md: "horizontal",
    }) ?? "horizontal";

    return (
        <Container maxW="container.xl" py={4} px={{ base: 0, md: 4 }}>
            <VStack align="stretch" spacing={6}>
                <Button
                    leftIcon={<FaArrowLeft />}
                    w="fit-content"
                    variant="outline"
                    onClick={flow.volverAlSelector}
                    isDisabled={flow.busy}
                >
                    Volver
                </Button>

                <Stepper
                    index={flow.activeStep}
                    orientation={orientation}
                    p={4}
                    borderWidth="1px"
                    borderRadius="md"
                    gap={{ base: 2, md: 0 }}
                >
                    {STEPS.map((step) => (
                        <Step key={step.title}>
                            <StepIndicator>
                                <StepStatus
                                    complete={<StepIcon />}
                                    incomplete={<StepNumber />}
                                    active={<StepNumber />}
                                />
                            </StepIndicator>
                            <Box flexShrink={0}>
                                <StepTitle>{step.title}</StepTitle>
                                <StepDescription>{step.description}</StepDescription>
                            </Box>
                            <StepSeparator />
                        </Step>
                    ))}
                </Stepper>

                {flow.activeStep === 0 && (
                    <CargaCostosStep1Archivo
                        file={flow.file}
                        fileInputKey={flow.fileInputKey}
                        motivo={flow.motivo}
                        validationErrors={flow.validationErrors}
                        busy={flow.busy}
                        onFileChange={flow.seleccionarArchivo}
                        onMotivoChange={flow.setMotivo}
                        onPrepare={flow.preparar}
                    />
                )}

                {flow.activeStep === 1 && flow.preparacion && (
                    <CargaCostosStep2Preview
                        preparacion={flow.preparacion}
                        itemsPage={flow.itemsPage}
                        loadingItems={flow.loadingItems}
                        busy={flow.busy}
                        onPageChange={flow.cambiarPagina}
                        onCancel={flow.cancelarYNuevaCarga}
                        onContinue={flow.irAConfirmacion}
                    />
                )}

                {flow.activeStep === 2 && flow.preparacion && (
                    <CargaCostosStep3Confirmacion
                        preparacion={flow.preparacion}
                        tokenData={flow.tokenData}
                        typedToken={flow.typedToken}
                        intentosRestantes={flow.intentosRestantes}
                        tokenSecondsRemaining={flow.tokenSecondsRemaining}
                        blocked={flow.blocked}
                        result={flow.result}
                        busy={flow.busy}
                        onTokenChange={flow.setTypedToken}
                        onBack={flow.volverAPrevisualizacion}
                        onGenerateToken={flow.generarToken}
                        onConfirm={flow.confirmar}
                        onCancel={flow.cancelarYNuevaCarga}
                        onNewLoad={flow.nuevaCarga}
                    />
                )}
            </VStack>
        </Container>
    );
}
