import { Box, Button, Flex, Text } from '@chakra-ui/react';

interface AveriaProduccionStep1SelectOrderProps {
    setActiveStep: (step: number) => void;
}

export default function AveriaProduccionStep1SelectOrder({ setActiveStep }: AveriaProduccionStep1SelectOrderProps) {
    return (
        <Box p={4}>
            <Text fontSize="lg" fontWeight="bold" mb={4}>
                Paso 1: Identificación Orden/Lote de Producción
            </Text>
            <Text mb={6} color="gray.600">
                (Contenido por implementar)
            </Text>
            <Flex gap={4}>
                <Button variant="outline" onClick={() => setActiveStep(0)}>
                    Anterior
                </Button>
                <Button colorScheme="blue" onClick={() => setActiveStep(2)}>
                    Siguiente
                </Button>
            </Flex>
        </Box>
    );
}
