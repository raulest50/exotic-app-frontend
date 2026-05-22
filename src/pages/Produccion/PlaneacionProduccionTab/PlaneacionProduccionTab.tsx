import {useState} from "react";
import {
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    Input,
    StepDescription,
    StepNumber,
    StepSeparator,
    StepStatus,
    Text,
    useToast,
    useSteps,
} from "@chakra-ui/react";
import {Step, StepIcon, StepIndicator, Stepper, StepTitle} from "@chakra-ui/icons";
import Step0CargarValidarExcel from "./Step0CargarValidarExcel/Step0CargarValidarExcel.tsx";
import Step1CalcularDistribucion from "./Step1CalcularDistribucion/Step1CalcularDistribucion.tsx";
import Step2PlaneacionProduccion from "./Step1VisualizarDistribucion/Step2PlaneacionProduccion.tsx";
import {
    ObtenerBorradorMpsSemanal,
    type MpsSemanalDraftDTO,
    type TerminadoConVentas,
} from "./PlaneacionProduccionService.tsx";
import axios from "axios";

function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getCurrentWeekMonday(): string {
    const today = new Date();
    const currentDay = today.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    return formatLocalDate(monday);
}

function getAxiosErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.error ?? error.response?.data?.message ?? error.message ?? fallback;
    }
    return error instanceof Error ? error.message : fallback;
}

const steps = [
    { title: 'Primero',  description: 'Cargar y Validar Excel' },
    { title: 'Segundo',  description: 'Visualizar Distribución' },
    { title: 'Tercero',  description: 'Planeación de Producción' },
];

export const PlaneacionProduccionTab = () => {

    const { activeStep, setActiveStep } = useSteps({
        index: 0,
        count: steps.length,
    });

    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [rawData, setRawData] = useState<TerminadoConVentas[]>([]);
    const [necesidades, setNecesidades] = useState<Record<string, number>>({});
    const [draftWeekStartDate, setDraftWeekStartDate] = useState<string>(getCurrentWeekMonday());
    const [currentDraft, setCurrentDraft] = useState<MpsSemanalDraftDTO | null>(null);
    const [openedPersistedDraft, setOpenedPersistedDraft] = useState(false);
    const [loadingDraft, setLoadingDraft] = useState(false);
    const toast = useToast();

    const handleOpenDraft = async () => {
        setLoadingDraft(true);
        try {
            const draft = await ObtenerBorradorMpsSemanal(draftWeekStartDate);
            setCurrentDraft(draft);
            setOpenedPersistedDraft(true);
            setActiveStep(2);
            toast({
                title: "Borrador cargado",
                description: `Se cargo el borrador MPS de la semana ${draft.weekStartDate}.`,
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: "No se pudo abrir el borrador",
                description: getAxiosErrorMessage(error, "No fue posible cargar el borrador MPS."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoadingDraft(false);
        }
    };

    const handleNuevaPropuesta = () => {
        setCurrentDraft(null);
        setOpenedPersistedDraft(false);
        setExcelFile(null);
        setRawData([]);
        setNecesidades({});
        setActiveStep(0);
    };

    return (
        <Box w={'full'} h={'full'} minW={0}>
            <Flex direction={"column"} gap={4} w="full" minW={0}>
                <Box p={4} borderWidth="1px" borderRadius="lg" bg="white">
                    <Flex align="end" gap={4} wrap="wrap">
                        <FormControl maxW="220px">
                            <FormLabel>Abrir borrador semanal</FormLabel>
                            <Input
                                type="date"
                                value={draftWeekStartDate}
                                onChange={(e) => setDraftWeekStartDate(e.target.value)}
                            />
                        </FormControl>
                        <Button
                            colorScheme="blue"
                            onClick={handleOpenDraft}
                            isLoading={loadingDraft}
                        >
                            Abrir borrador
                        </Button>
                        {currentDraft && (
                            <Button variant="outline" onClick={handleNuevaPropuesta}>
                                Nueva propuesta
                            </Button>
                        )}
                    </Flex>
                    {currentDraft && (
                        <Text mt={3} fontSize="sm" color="gray.600">
                            Borrador activo: MPS #{currentDraft.mpsId} - semana {currentDraft.weekStartDate}
                        </Text>
                    )}
                </Box>
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
                    />
                )}
                {activeStep === 2 && (
                    <Step2PlaneacionProduccion
                        rawData={rawData}
                        necesidades={necesidades}
                        setActiveStep={setActiveStep}
                        currentDraft={currentDraft}
                        openedPersistedDraft={openedPersistedDraft}
                        onDraftSaved={setCurrentDraft}
                    />
                )}
            </Flex>
        </Box>
    );
};
