
import {Button, Flex, Heading, HStack, Icon, Text} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";

import { RiSave3Fill } from "react-icons/ri";
import { ImCheckboxChecked } from "react-icons/im";

const colorAnimation = keyframes`
  0% { color: #68D391; }   /* green.400 */
  50% { color: #22d3ee; }  /* cyan.400 */
  100% { color: #68D391; }
`;

interface StepFourComponentProps {
    setActiveStep: (step: number) => void;
}

export default function IngresoOCMStep4Confirmation({setActiveStep}: StepFourComponentProps) {

    const onClickRegresar = () => {
        setActiveStep(0);
    }

    return(
        <Flex
            p="1em"
            direction="column"
            backgroundColor="blue.50"
            gap={8}
            alignItems="center"
        >
            <HStack>
                <Heading fontFamily="Comfortaa Variable">
                    Formato de Ingreso Enviado
                </Heading>
                <Icon as={ImCheckboxChecked} w={"3em"} h={"3em"} color={"green.500"} />
            </HStack>
            <Text fontFamily="Comfortaa Variable">
                El formato de ingreso a almacen fue enviado y guardado correctamente.
            </Text>

            <Icon as={RiSave3Fill} w={"10em"} h={"10em"} animation={`${colorAnimation} 3s infinite ease-in-out`} />

            <Button
                variant="solid"
                colorScheme={"green"}
                onClick={onClickRegresar}
            > Regresar </Button>
        </Flex>
    );
}
