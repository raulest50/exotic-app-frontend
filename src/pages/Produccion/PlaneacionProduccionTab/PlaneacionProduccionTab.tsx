import {useState} from "react";
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
import {Step, StepIcon, StepIndicator, Stepper, StepTitle} from "@chakra-ui/icons";
import Step0CargarValidarExcel from "./Step0CargarValidarExcel/Step0CargarValidarExcel.tsx";
import Step1CalcularDistribucion from "./Step1CalcularDistribucion/Step1CalcularDistribucion.tsx";

type Props = {
    isActive?: boolean;
};

const steps = [
    { title: 'Primero', description: 'Cargar y Validar Excel' },
    { title: 'Segundo', description: 'Visualizar Distribución' },
];

export const PlaneacionProduccionTab = (props: Props) => {

    const { activeStep, setActiveStep } = useSteps({
        index: 0,
        count: steps.length,
    });

    const [excelFile, setExcelFile] = useState<File | null>(null);

    function ConditionalRenderStep() {
        if (activeStep === 0) {
            return(
                <Step0CargarValidarExcel setActiveStep={setActiveStep} setExcelFile={setExcelFile} />
            );
        }
        if (activeStep === 1) {
            return(
                <Step1CalcularDistribucion excelFile={excelFile} setActiveStep={setActiveStep} />
            );
        }
    }

    const handleReset = () => {
        setExcelFile(null);
        setActiveStep(0);
    };

    return (
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
                <ConditionalRenderStep/>
            </Flex>
        </Container>
    );
};