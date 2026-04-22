import {
    Alert,
    AlertDescription,
    AlertIcon,
    Box,
    Button,
    Flex,
    Heading,
    Text,
    VStack,
} from "@chakra-ui/react";

interface ImportacionTotalBDStep0InformacionProps {
    setActiveStep: (step: number) => void;
}

export default function ImportacionTotalBDStep0Informacion({
    setActiveStep,
}: ImportacionTotalBDStep0InformacionProps) {
    return (
        <Box>
            <VStack align="stretch" spacing={6}>
                <Heading size="md" color="red.700">
                    Importacion Total de Base de Datos
                </Heading>

                <Text color="gray.600">
                    Esta operacion vaciara completamente el esquema actual de la base de datos y luego restaurara
                    el contenido de un backup tecnico en formato <strong>.dump</strong>. Es una accion pensada solo
                    para entornos local y staging.
                </Text>

                <Alert status="error">
                    <AlertIcon />
                    <AlertDescription>
                        La accion es <strong>altamente destructiva e irreversible</strong>. Se eliminaran usuarios,
                        permisos, configuraciones y datos operativos actuales antes de restaurar el backup cargado.
                    </AlertDescription>
                </Alert>

                <Alert status="warning">
                    <AlertIcon />
                    <AlertDescription>
                        Use unicamente backups completos PostgreSQL generados por el sistema. No cargue archivos
                        manipulados manualmente ni archivos de origen desconocido.
                    </AlertDescription>
                </Alert>

                <Alert status="info">
                    <AlertIcon />
                    <AlertDescription>
                        El backend bloqueara automaticamente esta operacion en produccion aunque alguien intente
                        invocarla manualmente.
                    </AlertDescription>
                </Alert>

                <Flex gap={3} w="full" justify="flex-end">
                    <Button colorScheme="red" onClick={() => setActiveStep(1)}>
                        Entiendo el riesgo y deseo continuar
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
