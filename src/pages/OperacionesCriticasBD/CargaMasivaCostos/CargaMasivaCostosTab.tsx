import { Steps, Box, Button, Container, VStack, useBreakpointValue } from "@chakra-ui/react";
import { LuCheck } from 'react-icons/lu';
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
            <VStack align="stretch" gap={6}>
                <Button
                    w="fit-content"
                    variant="outline"
                    onClick={flow.volverAlSelector}
                    disabled={flow.busy}><FaArrowLeft />Volver
                                    </Button>

                <Steps.Root
                    step={flow.activeStep}
                    count={STEPS.length}
                    orientation={orientation}
                    p={4}
                    borderWidth="1px"
                    borderRadius="md"
                    gap={{ base: 2, md: 0 }}
                >
                      <Steps.List>
                        {STEPS.map((step, index) => (
                            <Steps.Item key={step.title} index={index}>
                                <Steps.Indicator>
                                    <Steps.Status
                                        complete={<LuCheck />}
                                        incomplete={<Steps.Number />}
                                        current={<Steps.Number />}
                                    />
                                </Steps.Indicator>
                                <Box flexShrink={0}>
                                    <Steps.Title>{step.title}</Steps.Title>
                                    <Steps.Description>{step.description}</Steps.Description>
                                </Box>
                                <Steps.Separator />
                            </Steps.Item>
                        ))}
                    </Steps.List>
                    </Steps.Root>

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
                        dependenciasPage={flow.dependenciasPage}
                        loadingItems={flow.loadingItems}
                        loadingDependencias={flow.loadingDependencias}
                        busy={flow.busy}
                        onPageChange={flow.cambiarPagina}
                        onDependenciasPageChange={flow.cambiarPaginaDependencias}
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
                        invalidated={flow.invalidated}
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
