
import {
    Box,
    Container,
    Flex,
    Step,
    StepDescription,
    StepIcon,
    StepIndicator,
    StepNumber,
    StepSeparator,
    StepStatus,
    Stepper,
    StepTitle,
    useSteps,
} from "@chakra-ui/react";
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

    const { activeStep, setActiveStep } = useSteps({
        index: 0,
        count: steps.length,
    });

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

    return(
        <Container minW={['auto', 'container.lg', 'container.xl']} w={'full'} h={'full'}>
            <Flex direction={"column"} gap={4}>
                <Stepper index={activeStep} p={'1em'} backgroundColor={"teal.50"} w={'full'} >
                    {steps.map((step, index) => (
                        <Step key={index}>
                            <StepIndicator>
                                <StepStatus
                                    complete={<StepIcon />}
                                    incomplete={<StepNumber />}
                                    active={<StepNumber />}
                                />
                            </StepIndicator>

                            <Box flexShrink='0'>
                                <StepTitle>{step.title}</StepTitle>
                                <StepDescription>{step.description}</StepDescription>
                            </Box>

                            <StepSeparator />
                        </Step>
                    ))}
                </Stepper>
                {renderActiveStep()}
            </Flex>

        </Container>
    )
}
