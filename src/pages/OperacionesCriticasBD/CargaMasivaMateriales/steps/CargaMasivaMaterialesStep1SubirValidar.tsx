import { Box, Button, Flex, Text } from "@chakra-ui/react";

interface CargaMasivaMaterialesStep1SubirValidarProps {
    setActiveStep: (step: number) => void;
    setExcelFile: (file: File | null) => void;
    setExcelData?: (data: unknown[] | null) => void;
}

export default function CargaMasivaMaterialesStep1SubirValidar({
    setActiveStep,
}: CargaMasivaMaterialesStep1SubirValidarProps) {
    return (
        <Box p={4}>
            <Text mb={4}>Paso en desarrollo. Subir y validar Excel próximamente.</Text>
            <Flex gap={4}>
                <Button onClick={() => setActiveStep(0)}>Atrás</Button>
                <Button colorScheme="teal" onClick={() => setActiveStep(2)}>
                    Siguiente
                </Button>
            </Flex>
        </Box>
    );
}
