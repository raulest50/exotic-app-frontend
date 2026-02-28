import { useState } from 'react';
import {
    Box,
    Button,
    Container,
    Flex,
    StepDescription,
    StepNumber,
    StepSeparator,
    StepStatus,
    useSteps,
} from '@chakra-ui/react';
import { Step, StepIcon, StepIndicator, Stepper, StepTitle } from '@chakra-ui/icons';
import AveriaProduccionStep0SelectArea from './steps/AveriaProduccionStep0SelectArea';
import AveriaProduccionStep1SelectOrder from './steps/AveriaProduccionStep1SelectOrder';
import AveriaProduccionStep2ListAverias from './steps/AveriaProduccionStep2ListAverias';
import AveriaProduccionStep3ReviewSubmit from './steps/AveriaProduccionStep3ReviewSubmit';

export interface AreaProduccion {
    areaId: number;
    nombre: string;
    descripcion: string;
    responsableArea?: any;
}

export interface OrdenProduccionDTO {
    ordenId: number;
    loteAsignado: string;
    productoId: string;
    productoNombre: string;
    estadoOrden: number;
    cantidadProducir: number;
    fechaCreacion: string;
    observaciones: string;
    areaOperativa: string;
    departamentoOperativo: string;
    numeroPedidoComercial: string;
}

interface WizardAveriaProduccionProps {
    onBack: () => void;
}

const steps = [
    { title: 'Área Operativa', description: 'Selección de área' },
    { title: 'Orden de Producción', description: 'Identificar orden/lote' },
    { title: 'Averías', description: 'Listado de averías' },
    { title: 'Confirmar', description: 'Validar y ejecutar' },
];

export default function WizardAveriaProduccion({ onBack }: WizardAveriaProduccionProps) {
    const { activeStep, setActiveStep } = useSteps({
        index: 0,
        count: steps.length,
    });

    const [selectedArea, setSelectedArea] = useState<AreaProduccion | null>(null);
    const [selectedOrden, setSelectedOrden] = useState<OrdenProduccionDTO | null>(null);

    const handleReset = () => {
        setSelectedArea(null);
        setSelectedOrden(null);
        setActiveStep(0);
    };

    function ConditionalRenderStep() {
        if (activeStep === 0) {
            return (
                <AveriaProduccionStep0SelectArea
                    setActiveStep={setActiveStep}
                    selectedArea={selectedArea}
                    onSelectArea={setSelectedArea}
                />
            );
        }
        if (activeStep === 1) {
            return (
                <AveriaProduccionStep1SelectOrder
                    setActiveStep={setActiveStep}
                    selectedArea={selectedArea}
                    selectedOrden={selectedOrden}
                    onSelectOrden={setSelectedOrden}
                />
            );
        }
        if (activeStep === 2) {
            return <AveriaProduccionStep2ListAverias setActiveStep={setActiveStep} />;
        }
        if (activeStep === 3) {
            return <AveriaProduccionStep3ReviewSubmit setActiveStep={setActiveStep} onReset={handleReset} />;
        }
        return null;
    }

    return (
        <Container minW={['auto', 'container.lg', 'container.xl']} w="full" h="full">
            <Flex direction="column" gap={4}>
                <Flex justify="space-between" align="center">
                    <Button variant="ghost" onClick={onBack}>
                        ← Volver a selección de tipo
                    </Button>
                </Flex>
                <Stepper index={activeStep} p="1em" backgroundColor="blue.50" w="full">
                    {steps.map((step, index) => (
                        <Step key={index}>
                            <StepIndicator>
                                <StepStatus
                                    complete={<StepIcon />}
                                    incomplete={<StepNumber />}
                                    active={<StepNumber />}
                                />
                            </StepIndicator>
                            <Box flexShrink="0">
                                <StepTitle>{step.title}</StepTitle>
                                <StepDescription>{step.description}</StepDescription>
                            </Box>
                            <StepSeparator />
                        </Step>
                    ))}
                </Stepper>
                {ConditionalRenderStep()}
            </Flex>
        </Container>
    );
}
