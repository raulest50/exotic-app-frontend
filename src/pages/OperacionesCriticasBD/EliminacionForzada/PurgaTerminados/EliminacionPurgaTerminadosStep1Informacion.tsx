import { Alert, Box, Button, Flex, Heading, Text, VStack } from "@chakra-ui/react";

interface EliminacionPurgaTerminadosStep1InformacionProps {
    setActiveStep: (step: number) => void;
}

export default function EliminacionPurgaTerminadosStep1Informacion({
    setActiveStep,
}: EliminacionPurgaTerminadosStep1InformacionProps) {
    return (
        <Box>
            <VStack align="stretch" gap={6}>
                <Heading size="md" color="red.700">
                    Purga Completa Terminados
                </Heading>

                <Text color="app.textMuted">
                    Esta operación eliminará todos los productos de tipo terminado y sus
                    datos relacionados de producción, inventario, ventas y manufactura.
                    Está pensada únicamente para entornos de desarrollo local y staging.
                </Text>

                <Alert.Root status="warning">
                    <Alert.Indicator />
                    <Alert.Description>
                        La acción es <strong>irreversible</strong>. Una vez ejecutada,
                        no será posible recuperar los terminados eliminados ni sus
                        dependencias asociadas.
                    </Alert.Description>
                </Alert.Root>

                <Alert.Root status="info">
                    <Alert.Indicator />
                    <Alert.Description>
                        El backend bloqueará automáticamente esta operación si detecta
                        entorno de producción mediante `PRODUCTION=TRUE` o
                        `SPRING_PROFILES_ACTIVE=prod`.
                    </Alert.Description>
                </Alert.Root>

                <Alert.Root status="success">
                    <Alert.Indicator />
                    <Alert.Description>
                        Uso recomendado: alternar rápidamente entre datos ficticios en
                        local o staging sin afectar otras operaciones críticas fuera del
                        módulo de terminados.
                    </Alert.Description>
                </Alert.Root>

                <Flex gap={3} w="full" justify="space-between">
                    <Button variant="outline" onClick={() => setActiveStep(0)}>
                        Atrás
                    </Button>
                    <Button colorPalette="red" onClick={() => setActiveStep(2)}>
                        Continuar
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
