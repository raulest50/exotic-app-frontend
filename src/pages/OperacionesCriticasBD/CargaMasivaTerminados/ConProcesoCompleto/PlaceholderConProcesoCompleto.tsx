import { Box, Button, Container, Text } from "@chakra-ui/react";

interface PlaceholderConProcesoCompletoProps {
    onVolver: () => void;
}

export default function PlaceholderConProcesoCompleto({ onVolver }: PlaceholderConProcesoCompletoProps) {
    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
            <Box p={4}>
                <Text mb={4}>Carga masiva Terminado con proceso de producción completo — Próximamente.</Text>
                <Button onClick={onVolver}>Volver</Button>
            </Box>
        </Container>
    );
}
