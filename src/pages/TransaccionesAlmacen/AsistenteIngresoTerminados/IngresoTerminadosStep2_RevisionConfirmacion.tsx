import {
    Box,
    Button,
    Card,
    CardBody,
    Flex,
    Heading,
    SimpleGrid,
    VStack,
} from "@chakra-ui/react";
import { ArrowBackIcon, DownloadIcon } from "@chakra-ui/icons";
import { IngresoTerminadoValidado } from "./types";
import ReporteHyLButton from "./ReporteHyLButton";

interface Props {
    ingresosValidados: IngresoTerminadoValidado[];
    setActiveStep: (step: number) => void;
}

export default function IngresoTerminadosStep2_RevisionConfirmacion({
    ingresosValidados,
    setActiveStep,
}: Props) {
    return (
        <Box>
            <Heading size="md" mb={4}>Descargar Reportes</Heading>

            <VStack align="stretch" spacing={5}>
                <Card variant="outline">
                    <CardBody>
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                            <Button
                                leftIcon={<DownloadIcon />}
                                colorScheme="blue"
                                size="lg"
                                minH="72px"
                                isDisabled
                                title="Pendiente de implementar"
                            >
                                Descargar Reporte Dorance
                            </Button>
                            <ReporteHyLButton ingresosValidados={ingresosValidados} />
                        </SimpleGrid>
                    </CardBody>
                </Card>

                <Flex justify="space-between" gap={4} wrap="wrap">
                    <Button
                        leftIcon={<ArrowBackIcon />}
                        variant="outline"
                        onClick={() => setActiveStep(1)}
                    >
                        Atras
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
