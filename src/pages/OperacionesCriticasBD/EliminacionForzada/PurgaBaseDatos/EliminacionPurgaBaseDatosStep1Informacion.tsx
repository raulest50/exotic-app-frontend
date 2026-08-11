import { Steps, Alert, Box, Button, Flex, Heading, Text, VStack } from "@chakra-ui/react";

interface EliminacionPurgaBaseDatosStep1InformacionProps {
    setActiveStep: (step: number) => void;
}

export default function EliminacionPurgaBaseDatosStep1Informacion({
    setActiveStep,
}: EliminacionPurgaBaseDatosStep1InformacionProps) {
    return (
        <Box>
            <VStack align="stretch" gap={6}>
                <Heading size="md" color="red.700">
                    Borrado Total Base de Datos
                </Heading>

                <Text color="app.textMuted">
                    Esta operacion vaciara todas las tablas de la base de datos, preservando
                    solo lo minimo necesario para mantener a <strong>master</strong> y{" "}
                    <strong>super_master</strong>. Es una accion pensada unicamente para
                    entornos local y staging.
                </Text>

                <Alert.Root status="warning">
                    <Alert.Indicator />
                    <Alert.Description>
                        La accion es <strong>irreversible</strong>. Una vez ejecutada, no sera
                        posible recuperar la informacion purgada desde este flujo.
                    </Alert.Description>
                </Alert.Root>

                <Alert.Root status="error">
                    <Alert.Indicator />
                    <Alert.Description>
                        Se eliminaran filas de practicamente toda la base de datos. Solo se
                        conservaran las tablas y usuarios minimos definidos por el backend.
                    </Alert.Description>
                </Alert.Root>

                <Alert.Root status="info">
                    <Alert.Indicator />
                    <Alert.Description>
                        El backend rechazara automaticamente esta operacion si detecta entorno
                        de produccion.
                    </Alert.Description>
                </Alert.Root>

                <Flex gap={3} w="full" justify="space-between">
                    <Button variant="outline" onClick={() => setActiveStep(0)}>
                        Atras
                    </Button>
                    <Button colorPalette="red" onClick={() => setActiveStep(2)}>
                        Continuar
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
