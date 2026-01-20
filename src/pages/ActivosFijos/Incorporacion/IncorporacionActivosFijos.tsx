import {useState} from 'react';
import {Box, Flex, StepDescription, StepNumber, StepSeparator, StepStatus, useSteps} from '@chakra-ui/react';
import {IncorporacionActivoDto, OrdenCompraActivo} from "../types.tsx";
import {Step, StepIcon, StepIndicator, Stepper, StepTitle} from "@chakra-ui/icons";
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

    const {activeStep, setActiveStep} = useSteps({
        index: 0,
        count: steps.length,
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

            <ConditionalRender />

        </Flex>
    );
}
