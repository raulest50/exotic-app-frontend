
import { Steps, Box, Container, Flex, useSteps } from "@chakra-ui/react";
import { LuCheck } from 'react-icons/lu';
import {useState} from "react";
import {IngresoOCM_DTA, OrdenCompra} from "../types";
import IngresoOCMStep1VerifyQuantities from "./IngresoOCMStep1VerifyQuantities.tsx";
import IngresoOCMStep0SelectPurchaseOrder from "./IngresoOCMStep0SelectPurchaseOrder.tsx";
import IngresoOCMStep2UploadDocument from "./StepTwoComponent_IngOCM/IngresoOCMStep2UploadDocument.tsx";
import IngresoOCMStep3ReviewSubmit from "./IngresoOCMStep3ReviewSubmit.tsx";
import IngresoOCMStep4Confirmation from "./IngresoOCMStep4Confirmation.tsx";



const steps = [
    { title: 'Primero', description: 'Identificar Orden Compra' },
    { title: 'Segundo', description: 'Verificar Cantidades' },
    { title: 'Tercero', description: 'Subir Soporte' },
    { title: 'Cuarto', description: 'Revisar y Enviar' },
    { title: 'Quinto', description: 'Finalizacion' },
]


export default function AsistenteIngresoMercancia() {

    const stepsApi = useSteps({
        defaultStep: 0,
        count: steps.length
    });
    const activeStep = stepsApi.value;
    const setActiveStep = stepsApi.setStep;

    const [selectedOrder, setSelectedOrder] = useState<OrdenCompra|null>(null);

    const [ingresoOCM_DTA, setIngresoOCM_DTA] = useState<IngresoOCM_DTA | null>(null);

    function renderActiveStep() {
        switch (activeStep) {
            case 0:
                return (
                    <IngresoOCMStep0SelectPurchaseOrder setActiveStep={setActiveStep} setSelectedOrder={setSelectedOrder} />
                );
            case 1:
                return (
                    <IngresoOCMStep1VerifyQuantities setActiveStep={setActiveStep} orden={selectedOrder} setIngresoOCM_DTA={setIngresoOCM_DTA} />
                );
            case 2:
                return (
                    <IngresoOCMStep2UploadDocument setActiveStep={setActiveStep} orden={selectedOrder} setIngresoOCM_DTA={setIngresoOCM_DTA}/>
                );
            case 3:
                return (
                    <IngresoOCMStep3ReviewSubmit setActiveStep={setActiveStep} docIngresoDTA={ingresoOCM_DTA} />
                );
            case 4:
                return (
                    <IngresoOCMStep4Confirmation setActiveStep={setActiveStep}/>
                );
            default:
                return null;
        }
    }

    return (
        <Container minW={['auto', 'container.lg', 'container.xl']} w={'full'} h={'full'}>
            <Flex direction={"column"} gap={4}>
                <Steps.RootProvider p={'1em'} backgroundColor={"app.stepperTeal"} w={'full'} value={stepsApi} >
                    <Steps.List>
                    {steps.map((step, index) => (
                        <Steps.Item key={index} index={index}>
                            <Steps.Indicator>
                                <Steps.Status
                                    complete={<LuCheck />}
                                    incomplete={<Steps.Number />}
                                    current={<Steps.Number />}
                                />
                            </Steps.Indicator>

                            <Box flexShrink='0'>
                                <Steps.Title>{step.title}</Steps.Title>
                                <Steps.Description>{step.description}</Steps.Description>
                            </Box>

                            <Steps.Separator />
                        </Steps.Item>
                    ))}
                    </Steps.List>
                </Steps.RootProvider>
                {renderActiveStep()}
            </Flex>

        </Container>
    );
}
