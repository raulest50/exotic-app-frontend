import { useState } from 'react';
import { LuCheck } from 'react-icons/lu';
import { Steps, Box, Button, Container, Flex, useSteps } from '@chakra-ui/react';
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
    const stepsApi = useSteps({
        defaultStep: 0,
        count: steps.length
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
                <Steps.RootProvider p="1em" backgroundColor="app.stepperTeal" w="full" value={stepsApi}>
                    {steps.map((step, index) => (
                        <Steps.Item key={index}>
                            <Steps.Indicator>
                                <Steps.Status
                                    complete={<LuCheck />}
                                    incomplete={<Steps.Number />}
                                    current={<Steps.Number />}
                                />
                            </Steps.Indicator>
                            <Box flexShrink="0">
                                <Steps.Title>{step.title}</Steps.Title>
                                <Steps.Description>{step.description}</Steps.Description>
                            </Box>
                            <Steps.Separator />
                        </Steps.Item>
                    ))}
                </Steps.RootProvider>
                {ConditionalRenderStep()}
            </Flex>
        </Container>
    );
}
