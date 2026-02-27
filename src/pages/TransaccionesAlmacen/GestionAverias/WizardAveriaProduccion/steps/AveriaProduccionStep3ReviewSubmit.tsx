import { Box, Button, Flex, Text } from '@chakra-ui/react';

interface AveriaProduccionStep3ReviewSubmitProps {
    setActiveStep: (step: number) => void;
    onReset: () => void;
}

export default function AveriaProduccionStep3ReviewSubmit({ setActiveStep, onReset }: AveriaProduccionStep3ReviewSubmitProps) {
    return (
        <Box p={4}>
            <Text fontSize="lg" fontWeight="bold" mb={4}>
                Paso 3: Validar y Realizar Transacción de Almacén
            </Text>
            <Text mb={6} color="gray.600">
                (Contenido por implementar)
            </Text>
            <Flex gap={4}>
                <Button variant="outline" onClick={() => setActiveStep(2)}>
                    Anterior
                </Button>
                <Button colorScheme="green">
                    Ejecutar Transacción
                </Button>
            </Flex>
        </Box>
    );
}
