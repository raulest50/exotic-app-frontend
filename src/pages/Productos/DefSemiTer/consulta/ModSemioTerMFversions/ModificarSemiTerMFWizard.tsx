import { Box, Container, Flex, StepDescription, StepNumber, StepSeparator, StepStatus, useSteps } from "@chakra-ui/react";
import { Step, StepIcon, StepIndicator, Stepper, StepTitle } from "@chakra-ui/icons";
import { useEffect, useState } from "react";
import StepTwo_ModProdMF from "./StepTwo/StepTwo_ModProdMF.tsx";
import StepThree_ModProdMF from "./StepThree/StepThree_ModProdMF.tsx";
import StepFour_ModProdMF from "./StepFour/StepFour_ModProdMF.tsx";
import { ProductoSemiter } from "../../types.tsx";

interface ModificarSemiTerMFWizardProps {
    producto: ProductoSemiter;
    onClose?: () => void;
    refreshSearch?: () => void;
}

const steps = [
    { title: 'Primero', description: 'Revisar producto original' },
    { title: 'Segundo', description: 'Modificar insumos' },
    { title: 'Tercero', description: 'Ajustar proceso y packaging' },
    { title: 'Cuarto', description: 'Confirmar modificación' },
];

export default function ModificarSemiTerMFWizard({ producto, onClose, refreshSearch }: ModificarSemiTerMFWizardProps) {
    const { activeStep, setActiveStep } = useSteps({
        index: 1,
        count: steps.length,
    });

    const [semioter, setSemioter] = useState<ProductoSemiter>();
    const [semioter2, setSemioter2] = useState<ProductoSemiter>();
    const [semioter3, setSemioter3] = useState<ProductoSemiter>();

    useEffect(() => {
        setSemioter(producto);
        setSemioter2(producto);
        setSemioter3(producto);
    }, [producto]);

    const handleReset = () => {
        setSemioter(producto);
        setSemioter2(producto);
        setSemioter3(producto);
        setActiveStep(1);
    };

    function ConditionalRenderStep() {
        if (activeStep === 0 || activeStep === 1) {
            return <StepTwo_ModProdMF setActiveStep={setActiveStep} semioter={semioter2 ?? semioter!} setSemioter2={setSemioter2} />;
        }
        if (activeStep === 2) {
            return <StepThree_ModProdMF setActiveStep={setActiveStep} semioter2={semioter2!} setSemioter3={setSemioter3} />;
        }
        if (activeStep === 3) {
            return <StepFour_ModProdMF setActiveStep={setActiveStep} semioter3={semioter3!} onReset={handleReset} onClose={onClose} refreshSearch={refreshSearch} />;
        }
    }

    if (!semioter) return null;

    return (
        <Container minW={['auto', 'container.lg', 'container.xl']} w={'full'} h={'full'}>
            <Flex direction={"column"} gap={4}>
                <Stepper index={activeStep} p={'1em'} backgroundColor={"teal.50"} w={'full'}>
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
                <ConditionalRenderStep />
            </Flex>

        </Container>
    );
}
