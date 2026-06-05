import {useState} from "react";
import {
    Box,
    Flex,
    StepDescription,
    Step,
    StepIcon,
    StepIndicator,
    StepNumber,
    StepSeparator,
    StepStatus,
    Stepper,
    StepTitle,
    useSteps,
} from "@chakra-ui/react";
import Step0CargarValidarExcel from "./Step0CargarValidarExcel/Step0CargarValidarExcel.tsx";
import Step1CalcularDistribucion from "./Step1CalcularDistribucion/Step1CalcularDistribucion.tsx";
import {
    type TerminadoConVentas,
} from "./PlaneacionProduccionService.tsx";

const steps = [
    { title: 'Primero',  description: 'Cargar y Validar Excel' },
    { title: 'Segundo',  description: 'Pareto y necesidades mensuales' },
];

export const PlaneacionProduccionTab = () => {

    const { activeStep, setActiveStep } = useSteps({
        index: 0,
        count: steps.length,
    });

    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [rawData, setRawData] = useState<TerminadoConVentas[]>([]);
    const [necesidades, setNecesidades] = useState<Record<string, number>>({});

    return (
        <Box w={'full'} h={'full'} minW={0}>
            <Flex direction={"column"} gap={4} w="full" minW={0}>
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
                {activeStep === 0 && (
                    <Step0CargarValidarExcel setActiveStep={setActiveStep} setExcelFile={setExcelFile} />
                )}
                {activeStep === 1 && (
                    <Step1CalcularDistribucion
                        excelFile={excelFile}
                        setActiveStep={setActiveStep}
                        rawData={rawData}
                        setRawData={setRawData}
                        necesidades={necesidades}
                        setNecesidades={setNecesidades}
                        showNextButton={false}
                    />
                )}
            </Flex>
        </Box>
    );
};
