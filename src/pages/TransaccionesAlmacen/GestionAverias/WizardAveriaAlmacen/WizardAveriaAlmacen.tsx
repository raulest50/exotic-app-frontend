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
import AveriaAlmacenStep0SelectMaterial from './steps/AveriaAlmacenStep0SelectMaterial';
import AveriaAlmacenStep1Quantities from './steps/AveriaAlmacenStep1Quantities';
import AveriaAlmacenStep2ReviewSubmit from './steps/AveriaAlmacenStep2ReviewSubmit';

export interface AveriaAlmacenItem {
    productoId: string;
    productoNombre: string;
    tipoUnidades: string;
    loteId: number;
    batchNumber: string;
    cantidadDisponible: number;
    cantidadAveria: number;
}

interface WizardAveriaAlmacenProps {
    onBack: () => void;
}

const steps = [
    { title: 'Selección de Materiales', description: 'Buscar por lote' },
    { title: 'Cantidades Averiadas', description: 'Especificar cantidades' },
    { title: 'Confirmar', description: 'Validar y ejecutar' },
];

export default function WizardAveriaAlmacen({ onBack }: WizardAveriaAlmacenProps) {
    const { activeStep, setActiveStep } = useSteps({
        index: 0,
        count: steps.length,
    });

    const [selectedItems, setSelectedItems] = useState<AveriaAlmacenItem[]>([]);

    const handleReset = () => {
        setSelectedItems([]);
        setActiveStep(0);
    };

    function ConditionalRenderStep() {
        if (activeStep === 0) {
            return (
                <AveriaAlmacenStep0SelectMaterial
                    setActiveStep={setActiveStep}
                    selectedItems={selectedItems}
                    setSelectedItems={setSelectedItems}
                />
            );
        }
        if (activeStep === 1) {
            return (
                <AveriaAlmacenStep1Quantities
                    setActiveStep={setActiveStep}
                    selectedItems={selectedItems}
                    setSelectedItems={setSelectedItems}
                />
            );
        }
        if (activeStep === 2) {
            return (
                <AveriaAlmacenStep2ReviewSubmit
                    setActiveStep={setActiveStep}
                    onReset={handleReset}
                    selectedItems={selectedItems}
                />
            );
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
                <Stepper index={activeStep} p="1em" backgroundColor="teal.50" w="full">
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
