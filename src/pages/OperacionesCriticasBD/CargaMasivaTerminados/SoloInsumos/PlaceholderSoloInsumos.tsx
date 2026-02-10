import { Box, Button, Container, Text } from "@chakra-ui/react";

interface PlaceholderSoloInsumosProps {
    onVolver: () => void;
}

export default function PlaceholderSoloInsumos({ onVolver }: PlaceholderSoloInsumosProps) {
    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
            <Box p={4}>
                <Text mb={4}>Carga masiva Terminado solo con lista de insumos — Próximamente.</Text>
                <Button onClick={onVolver}>Volver</Button>
            </Box>
        </Container>
    );
}
