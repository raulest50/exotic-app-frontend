import {useState} from 'react';
import { LuCheck } from 'react-icons/lu';
import { Steps, Box, Flex, useSteps } from '@chakra-ui/react';
import {IncorporacionActivoDto, OrdenCompraActivo} from "../types.tsx";
import {ActivosFijosStep0SelectType} from "./step_zero/ActivosFijosStep0SelectType.tsx";
import {ActivosFijosStep1Form} from "./step_one/ActivosFijosStep1Form.tsx";
import {ActivosFijosStep2UploadInvoice} from "./step_two/ActivosFijosStep2UploadInvoice.tsx";
import {ActivosFijosStep3ReviewSubmit} from "./step_three/ActivosFijosStep3ReviewSubmit.tsx";


const steps = [
    {title:"0", description:"Tipo de Incorporacion"},
    {title:"1", description:"Formulario de Activos"},
    {title:"2", description:"Factura / Doc Soporte"},
    {title:"3", description:"Validar y Enviar"}
];

export function IncorporacionActivosFijos() {

    const [incorporacionActivoDto, setIncorporacionActivoDto] =
        useState<IncorporacionActivoDto>({});

    const [ordenCompraActivo, setOrdenCompraActivo] = useState<OrdenCompraActivo>({});

    const stepsApi = useSteps({
        defaultStep: 0,
        count: steps.length
    });


    function ConditionalRender(){
        if(activeStep === 0){
            return(
                <ActivosFijosStep0SelectType
                    setActiveStep={setActiveStep}
                    setOrdenCompraActivo={setOrdenCompraActivo}
                    setIncorporacionActivoHeader={setIncorporacionActivoDto}
                />
            )
        }
        if(activeStep === 1){
            return(
                <ActivosFijosStep1Form
                    setActiveStep={setActiveStep}
                    setIncorporacionActivoHeader={setIncorporacionActivoDto}
                    incorporacionActivoDto={incorporacionActivoDto}
                    ordenCompraActivo={ordenCompraActivo}
                />
            )
        }
        if(activeStep === 2){
            return(
                <ActivosFijosStep2UploadInvoice
                    setActiveStep={setActiveStep}
                    setIncorporacionActivoHeader={setIncorporacionActivoDto}
                    incorporacionActivoDto={incorporacionActivoDto}
                />
            )
        }
        if(activeStep === 3){
            return(
                <ActivosFijosStep3ReviewSubmit
                    setActiveStep={setActiveStep}
                    incorporacionActivoDto={incorporacionActivoDto}
                    ordenCompraActivo={ordenCompraActivo}
                />
            )
        }
    }


    return (
        <Flex direction={"column"} gap={4}>
            <Steps.RootProvider p={'1em'} backgroundColor="app.stepperTeal" w={'full'} value={stepsApi} >
                {steps.map((step, index) => (
                    <Steps.Item key={index}>
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
            </Steps.RootProvider>

            <ConditionalRender />

        </Flex>
    );
}
