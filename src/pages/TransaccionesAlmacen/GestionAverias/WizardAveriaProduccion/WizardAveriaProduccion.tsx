import { useState } from 'react';
import { LuCheck } from 'react-icons/lu';
import { Steps, Box, Button, Container, Flex, useSteps } from '@chakra-ui/react';
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
    politicaDispensacionInicio?: string | null;
    fechaAplicacionPoliticaDispensacion?: string | null;
    estadoDispensacionMateriales?: string | null;
    cantidadProducir: number;
    fechaCreacion: string;
    observaciones: string;
    areaOperativa: string;
    departamentoOperativo: string;
    numeroPedidoComercial: string;
}

export interface ItemDispensadoAveria {
    productoId: string;
    productoNombre: string;
    tipoUnidades: string;
    loteId: number;
    batchNumber: string;
    cantidadDispensada: number;
    cantidadAveriadaPrevia: number;
    cantidadDisponibleAveria: number;
}

export interface AveriaItemSeleccionado extends ItemDispensadoAveria {
    cantidadAveria: number;
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
    const stepsApi = useSteps({
        defaultStep: 0,
        count: steps.length
    });
    const activeStep = stepsApi.value;
    const setActiveStep = stepsApi.setStep;

    const [selectedArea, setSelectedArea] = useState<AreaProduccion | null>(null);
    const [selectedOrden, setSelectedOrden] = useState<OrdenProduccionDTO | null>(null);
    const [averiaItems, setAveriaItems] = useState<AveriaItemSeleccionado[]>([]);

    const handleReset = () => {
        setSelectedArea(null);
        setSelectedOrden(null);
        setAveriaItems([]);
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
            return (
                <AveriaProduccionStep2ListAverias
                    setActiveStep={setActiveStep}
                    selectedArea={selectedArea}
                    selectedOrden={selectedOrden}
                    averiaItems={averiaItems}
                    setAveriaItems={setAveriaItems}
                />
            );
        }
        if (activeStep === 3) {
            return (
                <AveriaProduccionStep3ReviewSubmit
                    setActiveStep={setActiveStep}
                    onReset={handleReset}
                    selectedArea={selectedArea}
                    selectedOrden={selectedOrden}
                    averiaItems={averiaItems}
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
                <Steps.RootProvider p="1em" backgroundColor="app.stepperBlue" w="full" value={stepsApi}>
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
                            <Box flexShrink="0">
                                <Steps.Title>{step.title}</Steps.Title>
                                <Steps.Description>{step.description}</Steps.Description>
                            </Box>
                            <Steps.Separator />
                        </Steps.Item>
                    ))}
                    </Steps.List>
                </Steps.RootProvider>
                {ConditionalRenderStep()}
            </Flex>
        </Container>
    );
}
