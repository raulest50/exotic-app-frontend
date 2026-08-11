import { Steps, Alert, Box, Button, Flex, Heading, Text, VStack } from "@chakra-ui/react";

interface ImportacionTotalBDStep0InformacionProps {
    setActiveStep: (step: number) => void;
}

export default function ImportacionTotalBDStep0Informacion({
    setActiveStep,
}: ImportacionTotalBDStep0InformacionProps) {
    return (
        <Box>
            <VStack align="stretch" gap={6}>
                <Heading size="md" color="red.700">
                    Importacion Total de Base de Datos
                </Heading>

                <Text color="app.textMuted">
                    Esta operacion vaciara completamente el esquema actual de la base de datos y luego restaurara
                    el contenido de un backup tecnico en formato <strong>.dump</strong>. Es una accion pensada solo
                    para entornos local y staging.
                </Text>

                <Alert.Root status="error">
                    <Alert.Indicator />
                    <Alert.Description>
                        La accion es <strong>altamente destructiva e irreversible</strong>. Se eliminaran usuarios,
                        permisos, configuraciones y datos operativos actuales antes de restaurar el backup cargado.
                    </Alert.Description>
                </Alert.Root>

                <Alert.Root status="warning">
                    <Alert.Indicator />
                    <Alert.Description>
                        Use unicamente backups completos PostgreSQL generados por el sistema. No cargue archivos
                        manipulados manualmente ni archivos de origen desconocido.
                    </Alert.Description>
                </Alert.Root>

                <Alert.Root status="info">
                    <Alert.Indicator />
                    <Alert.Description>
                        El backend bloqueara automaticamente esta operacion en produccion aunque alguien intente
                        invocarla manualmente.
                    </Alert.Description>
                </Alert.Root>

                <Flex gap={3} w="full" justify="flex-end">
                    <Button colorPalette="red" onClick={() => setActiveStep(1)}>
                        Entiendo el riesgo y deseo continuar
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
