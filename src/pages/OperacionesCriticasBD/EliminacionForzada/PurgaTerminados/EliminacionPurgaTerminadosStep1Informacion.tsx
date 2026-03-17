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

interface EliminacionPurgaTerminadosStep1InformacionProps {
    setActiveStep: (step: number) => void;
}

export default function EliminacionPurgaTerminadosStep1Informacion({
    setActiveStep,
}: EliminacionPurgaTerminadosStep1InformacionProps) {
    return (
        <Box>
            <VStack align="stretch" spacing={6}>
                <Heading size="md" color="red.700">
                    Purga Completa Terminados
                </Heading>

                <Text color="gray.600">
                    Esta operación eliminará todos los productos de tipo terminado y sus
                    datos relacionados de producción, inventario, ventas y manufactura.
                    Está pensada únicamente para entornos de desarrollo local y staging.
                </Text>

                <Alert status="warning">
                    <AlertIcon />
                    <AlertDescription>
                        La acción es <strong>irreversible</strong>. Una vez ejecutada,
                        no será posible recuperar los terminados eliminados ni sus
                        dependencias asociadas.
                    </AlertDescription>
                </Alert>

                <Alert status="info">
                    <AlertIcon />
                    <AlertDescription>
                        El backend bloqueará automáticamente esta operación si detecta
                        entorno de producción mediante `PRODUCTION=TRUE` o
                        `SPRING_PROFILES_ACTIVE=prod`.
                    </AlertDescription>
                </Alert>

                <Alert status="success">
                    <AlertIcon />
                    <AlertDescription>
                        Uso recomendado: alternar rápidamente entre datos ficticios en
                        local o staging sin afectar otras operaciones críticas fuera del
                        módulo de terminados.
                    </AlertDescription>
                </Alert>

                <Flex gap={3} w="full" justify="space-between">
                    <Button variant="outline" onClick={() => setActiveStep(0)}>
                        Atrás
                    </Button>
                    <Button colorScheme="red" onClick={() => setActiveStep(2)}>
                        Continuar
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
