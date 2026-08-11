import {useState} from "react";
import { LuCheck } from 'react-icons/lu';
import { Steps, Box, Flex, useSteps } from "@chakra-ui/react";
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

    const stepsApi = useSteps({
        defaultStep: 0,
        count: steps.length
    });
    const { value: activeStep, setStep: setActiveStep } = stepsApi;

    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [rawData, setRawData] = useState<TerminadoConVentas[]>([]);
    const [necesidades, setNecesidades] = useState<Record<string, number>>({});

    return (
        <Box w={'full'} h={'full'} minW={0}>
            <Flex direction={"column"} gap={4} w="full" minW={0}>
                <Steps.RootProvider p={'1em'} backgroundColor={"teal.50"} w={'full'} value={stepsApi} >
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
