
import { Steps, Box, Container, Flex, useSteps } from "@chakra-ui/react";
import { LuCheck } from 'react-icons/lu';
import SemiterminadosStep0DefineProduct from "./StepOne/SemiterminadosStep0DefineProduct.tsx";
import {useState, useEffect} from "react";
import {ProductoSemiter} from "../../types.tsx";
import SemiterminadosStep1DefineInputs from "./StepTwo/SemiterminadosStep1DefineInputs.tsx";
import SemiterminadosStep2DefineProcess from "./StepThree/SemiterminadosStep2DefineProcess.tsx";
import SemiterminadosStep3Confirmation from "./StepFour/SemiterminadosStep3Confirmation.tsx";

interface CodificarSemioTermiTabProps {
    isActive?: boolean;
}



const steps = [
    { title: 'Primero', description: 'Definir Producto' },
    { title: 'Segundo', description: 'Definir Insumos' },
    { title: 'Tercero', description: 'Definir Proceso de Produccion' },
    { title: 'Cuarto', description: 'Confirmación' },
]


export default function CodificarSemioTermiTab({ isActive = false }: CodificarSemioTermiTabProps) {

    const stepsApi = useSteps({
        defaultStep: 0,
        count: steps.length
    });
    const { value: activeStep, setStep: setActiveStep } = stepsApi;


    const [semioter, setSemioter] = useState<ProductoSemiter>();
    const [semioter2, setSemioter2] = useState<ProductoSemiter>();
    const [semioter3, setSemioter3] = useState<ProductoSemiter>();

    // Estado para controlar la actualización de categorías
    const [refreshCategorias, setRefreshCategorias] = useState(0);

    // Efecto para actualizar categorías cuando la pestaña se activa
    useEffect(() => {
        if (isActive) {
            setRefreshCategorias(prev => prev + 1);
        }
    }, [isActive]);


    function ConditionalRenderStep() {
        if (activeStep === 0) { // identificar la orden de compra
            return(
                <SemiterminadosStep0DefineProduct
                    setActiveStep={setActiveStep} 
                    setSemioter={setSemioter} 
                    refreshCategorias={refreshCategorias}
                />
            );
        }
        if (activeStep === 1) { // verificar cantidades en el pedido
            return(
                <SemiterminadosStep1DefineInputs setActiveStep={setActiveStep} semioter={semioter!} setSemioter2={setSemioter2}/>
            );
        }
        if (activeStep === 2) { // definir proceso de produccion
            return(
                <SemiterminadosStep2DefineProcess setActiveStep={setActiveStep} semioter2={semioter2!} setSemioter3={setSemioter3}/>
            );
        }
        if (activeStep === 3) { // confirmar y guardar
            return(
                <SemiterminadosStep3Confirmation setActiveStep={setActiveStep} semioter3={semioter3!} onReset={handleReset} />
            );
        }
    }

    const handleReset = () => {
        setSemioter(undefined);
        setSemioter2(undefined);
        setSemioter3(undefined);
        setActiveStep(0);
    };

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
                <ConditionalRenderStep/>
            </Flex>

        </Container>
    );
}
