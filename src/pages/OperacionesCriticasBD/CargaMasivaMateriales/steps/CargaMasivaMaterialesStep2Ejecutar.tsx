import { Box, Button, Flex, Text } from "@chakra-ui/react";

interface CargaMasivaMaterialesStep2EjecutarProps {
    setActiveStep: (step: number) => void;
    excelFile: File | null;
    onSuccess?: () => void;
}

export default function CargaMasivaMaterialesStep2Ejecutar({
    setActiveStep,
}: CargaMasivaMaterialesStep2EjecutarProps) {
    return (
        <Box p={4}>
            <Text mb={4}>Paso en desarrollo. Realizar carga masiva próximamente.</Text>
            <Flex gap={4}>
                <Button onClick={() => setActiveStep(1)}>Atrás</Button>
            </Flex>
        </Box>
    );
}
