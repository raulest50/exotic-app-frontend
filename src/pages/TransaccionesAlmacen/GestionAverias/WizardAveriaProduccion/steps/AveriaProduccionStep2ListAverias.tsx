import { Box, Button, Flex, Text } from '@chakra-ui/react';

interface AveriaProduccionStep2ListAveriasProps {
    setActiveStep: (step: number) => void;
}

export default function AveriaProduccionStep2ListAverias({ setActiveStep }: AveriaProduccionStep2ListAveriasProps) {
    return (
        <Box p={4}>
            <Text fontSize="lg" fontWeight="bold" mb={4}>
                Paso 2: Listado de Averías
            </Text>
            <Text mb={6} color="gray.600">
                (Contenido por implementar)
            </Text>
            <Flex gap={4}>
                <Button variant="outline" onClick={() => setActiveStep(1)}>
                    Anterior
                </Button>
                <Button colorScheme="blue" onClick={() => setActiveStep(3)}>
                    Siguiente
                </Button>
            </Flex>
        </Box>
    );
}
