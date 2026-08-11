import { Steps, Box, Container, Flex, useSteps } from "@chakra-ui/react";
import { LuCheck } from 'react-icons/lu';
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
    const stepsApi = useSteps({
        defaultStep: 1,
        count: steps.length
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
                <Steps.RootProvider p={'1em'} backgroundColor={"app.stepperTeal"} w={'full'} value={stepsApi}>
                    {steps.map((step, index) => (
                        <Steps.Item key={index}>
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
                </Steps.RootProvider>
                <ConditionalRenderStep />
            </Flex>

        </Container>
    );
}
