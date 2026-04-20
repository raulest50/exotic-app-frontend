import {
    Alert,
    AlertDescription,
    AlertIcon,
    Box,
    Button,
    Flex,
    Heading,
    Text,
    VStack,
} from "@chakra-ui/react";

interface EliminacionPurgaBaseDatosStep1InformacionProps {
    setActiveStep: (step: number) => void;
}

export default function EliminacionPurgaBaseDatosStep1Informacion({
    setActiveStep,
}: EliminacionPurgaBaseDatosStep1InformacionProps) {
    return (
        <Box>
            <VStack align="stretch" spacing={6}>
                <Heading size="md" color="red.700">
                    Borrado Total Base de Datos
                </Heading>

                <Text color="gray.600">
                    Esta operacion vaciara todas las tablas de la base de datos, preservando
                    solo lo minimo necesario para mantener a <strong>master</strong> y{" "}
                    <strong>super_master</strong>. Es una accion pensada unicamente para
                    entornos local y staging.
                </Text>

                <Alert status="warning">
                    <AlertIcon />
                    <AlertDescription>
                        La accion es <strong>irreversible</strong>. Una vez ejecutada, no sera
                        posible recuperar la informacion purgada desde este flujo.
                    </AlertDescription>
                </Alert>

                <Alert status="error">
                    <AlertIcon />
                    <AlertDescription>
                        Se eliminaran filas de practicamente toda la base de datos. Solo se
                        conservaran las tablas y usuarios minimos definidos por el backend.
                    </AlertDescription>
                </Alert>

                <Alert status="info">
                    <AlertIcon />
                    <AlertDescription>
                        El backend rechazara automaticamente esta operacion si detecta entorno
                        de produccion.
                    </AlertDescription>
                </Alert>

                <Flex gap={3} w="full" justify="space-between">
                    <Button variant="outline" onClick={() => setActiveStep(0)}>
                        Atras
                    </Button>
                    <Button colorScheme="red" onClick={() => setActiveStep(2)}>
                        Continuar
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
