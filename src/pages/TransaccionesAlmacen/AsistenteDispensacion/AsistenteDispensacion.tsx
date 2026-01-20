import {Box, Container, Flex, StepDescription, StepNumber, StepSeparator, StepStatus, useSteps} from '@chakra-ui/react';
import {Step, StepIcon, StepIndicator, Stepper, StepTitle} from '@chakra-ui/icons';
import {useState} from 'react';
import DispensacionStep1SelectOrder from './DispensacionStep1SelectOrder.tsx';
import DispensacionStep2EditItems from './DispensacionStep2EditItems.tsx';
import DispensacionStep3ReviewSubmit from './DispensacionStep3ReviewSubmit.tsx';
import {CasePackResponseDTO, DispensacionDTO, InsumoDesglosado, LoteSeleccionado, TransaccionAlmacenDetalle} from '../types';

const steps = [
    {title:'Primero', description:'Identificar Orden'},
    {title:'Segundo', description:'Editar Dispensación'},
    {title:'Tercero', description:'Revisar y Enviar'}
];

export function AsistenteDispensacion(){
    const {activeStep, setActiveStep} = useSteps({index:0, count:steps.length});
    const [dispensacion, setDispensacion] = useState<DispensacionDTO | null>(null);
    const [insumosDesglosados, setInsumosDesglosados] = useState<InsumoDesglosado[]>([]);
    const [ordenProduccionId, setOrdenProduccionId] = useState<number | null>(null);
    const [lotesPorMaterial, setLotesPorMaterial] = useState<Map<string, LoteSeleccionado[]>>(new Map());
    const [insumosAnidados, setInsumosAnidados] = useState<any[]>([]);
    const [productoId, setProductoId] = useState<string | null>(null);
    const [insumosEmpaque, setInsumosEmpaque] = useState<InsumoDesglosado[]>([]);
    const [casePack, setCasePack] = useState<CasePackResponseDTO | null>(null);
    const [cantidadProducir, setCantidadProducir] = useState<number | null>(null);
    const [lotesPorMaterialEmpaque, setLotesPorMaterialEmpaque] = useState<Map<string, LoteSeleccionado[]>>(new Map());
    const [refreshToken, setRefreshToken] = useState(0);
    const [historialDispensaciones, setHistorialDispensaciones] = useState<TransaccionAlmacenDetalle[]>([]);

    const renderStep = () => {
        if(activeStep===0){
            return <DispensacionStep1SelectOrder
                setActiveStep={setActiveStep}
                setDispensacion={setDispensacion}
                setInsumosDesglosados={setInsumosDesglosados}
                setOrdenProduccionId={setOrdenProduccionId}
                setInsumosAnidados={setInsumosAnidados}
                setProductoId={setProductoId}
                setInsumosEmpaque={setInsumosEmpaque}
                setCasePack={setCasePack}
                setCantidadProducir={setCantidadProducir}
                setHistorialDispensaciones={setHistorialDispensaciones}
                refreshToken={refreshToken}
            />;
        }
        if(activeStep===1){
            return <DispensacionStep2EditItems
                setActiveStep={setActiveStep} 
                dispensacion={dispensacion} 
                setDispensacion={setDispensacion}
                insumosDesglosados={insumosDesglosados}
                ordenProduccionId={ordenProduccionId}
                lotesPorMaterial={lotesPorMaterial}
                setLotesPorMaterial={setLotesPorMaterial}
                insumosAnidados={insumosAnidados}
                productoId={productoId}
                insumosEmpaque={insumosEmpaque}
                casePack={casePack}
                cantidadProducir={cantidadProducir}
                historialDispensaciones={historialDispensaciones}
                lotesPorMaterialEmpaque={lotesPorMaterialEmpaque}
                setLotesPorMaterialEmpaque={setLotesPorMaterialEmpaque}
            />;
        }
        if(activeStep===2){
            return <DispensacionStep3ReviewSubmit
                setActiveStep={setActiveStep} 
                dispensacion={dispensacion}
                insumosDesglosados={insumosDesglosados}
                ordenProduccionId={ordenProduccionId}
                lotesPorMaterial={lotesPorMaterial}
                insumosEmpaque={insumosEmpaque}
                lotesPorMaterialEmpaque={lotesPorMaterialEmpaque}
                onDispensacionSuccess={() => setRefreshToken(prev => prev + 1)}
            />;
        }
    };

    return (
        <Container minW={['auto','container.lg','container.xl']} w='full' h='full'>
            <Flex direction='column' gap={4}>
                <Stepper index={activeStep} p='1em' backgroundColor='teal.50' w='full'>
                    {steps.map((step, index)=>(
                        <Step key={index}>
                            <StepIndicator>
                                <StepStatus complete={<StepIcon />} incomplete={<StepNumber />} active={<StepNumber />}/>
                            </StepIndicator>
                            <Box flexShrink='0'>
                                <StepTitle>{step.title}</StepTitle>
                                <StepDescription>{step.description}</StepDescription>
                            </Box>
                            <StepSeparator />
                        </Step>
                    ))}
                </Stepper>
                {renderStep()}
            </Flex>
        </Container>
    );
}
