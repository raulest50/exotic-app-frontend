import { Box, Button, Flex, Text } from '@chakra-ui/react';

interface AveriaProduccionStep0SelectAreaProps {
    setActiveStep: (step: number) => void;
}

export default function AveriaProduccionStep0SelectArea({ setActiveStep }: AveriaProduccionStep0SelectAreaProps) {
    return (
        <Box p={4}>
            <Text fontSize="lg" fontWeight="bold" mb={4}>
                Paso 0: Selección de Área Operativa
            </Text>
            <Text mb={6} color="gray.600">
                (Contenido por implementar)
            </Text>
            <Flex gap={4}>
                <Button colorScheme="blue" onClick={() => setActiveStep(1)}>
                    Siguiente
                </Button>
            </Flex>
        </Box>
    );
}
