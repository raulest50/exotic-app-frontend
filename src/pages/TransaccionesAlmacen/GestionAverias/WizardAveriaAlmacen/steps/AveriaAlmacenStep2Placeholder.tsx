import { Box, Button, Flex, Text, VStack } from '@chakra-ui/react';

interface AveriaAlmacenStep2PlaceholderProps {
    setActiveStep: (step: number) => void;
    onReset: () => void;
}

export default function AveriaAlmacenStep2Placeholder({
    setActiveStep,
    onReset,
}: AveriaAlmacenStep2PlaceholderProps) {
    return (
        <Box p={4}>
            <Text fontSize="lg" fontWeight="bold" mb={4}>
                Paso 3: Confirmar
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
                    <Button variant="outline" onClick={() => setActiveStep(1)}>
                        Anterior
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
