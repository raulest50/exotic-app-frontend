import { Box, Button, Flex, Text, VStack } from '@chakra-ui/react';

interface AveriaAlmacenStep1PlaceholderProps {
    setActiveStep: (step: number) => void;
}

export default function AveriaAlmacenStep1Placeholder({
    setActiveStep,
}: AveriaAlmacenStep1PlaceholderProps) {
    return (
        <Box p={4}>
            <Text fontSize="lg" fontWeight="bold" mb={4}>
                Paso 2: Detalles
            </Text>

            <VStack spacing={4} align="stretch">
                <Box
                    p={8}
                    bg="gray.50"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="gray.200"
                    textAlign="center"
                >
                    <Text color="gray.500">
                        Pendiente de implementación
                    </Text>
                </Box>

                <Flex gap={4} pt={2}>
                    <Button variant="outline" onClick={() => setActiveStep(0)}>
                        Anterior
                    </Button>
                    <Button colorScheme="blue" onClick={() => setActiveStep(2)}>
                        Siguiente
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
