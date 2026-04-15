import {useState} from "react";
import {
    Box,
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
import Step2PlaneacionProduccion from "./Step1VisualizarDistribucion/Step2PlaneacionProduccion.tsx";
import type { TerminadoConVentas } from "./PlaneacionProduccionService.tsx";

type Props = {
    isActive?: boolean;
};

const steps = [
    { title: 'Primero',  description: 'Cargar y Validar Excel' },
    { title: 'Segundo',  description: 'Visualizar Distribución' },
    { title: 'Tercero',  description: 'Planeación de Producción' },
];

export const PlaneacionProduccionTab = (props: Props) => {

    const { activeStep, setActiveStep } = useSteps({
        index: 0,
        count: steps.length,
    });

    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [rawData, setRawData] = useState<TerminadoConVentas[]>([]);
    const [necesidades, setNecesidades] = useState<Record<string, number>>({});

    function ConditionalRenderStep() {
        if (activeStep === 0) {
            return(
                <Step0CargarValidarExcel setActiveStep={setActiveStep} setExcelFile={setExcelFile} />
            );
        }
        if (activeStep === 1) {
            return(
                <Step1CalcularDistribucion
                    excelFile={excelFile}
                    setActiveStep={setActiveStep}
                    rawData={rawData}
                    setRawData={setRawData}
                    necesidades={necesidades}
                    setNecesidades={setNecesidades}
                />
            );
        }
        if (activeStep === 2) {
            return(
                <Step2PlaneacionProduccion
                    rawData={rawData}
                    necesidades={necesidades}
                    setActiveStep={setActiveStep}
                />
            );
        }
    }

    const handleReset = () => {
        setExcelFile(null);
        setRawData([]);
        setNecesidades({});
        setActiveStep(0);
    };

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
                <ConditionalRenderStep/>
            </Flex>
        </Box>
    );
};
