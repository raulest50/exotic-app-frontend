import { Alert, Box, Button, Flex, Heading, Text, VStack } from "@chakra-ui/react";

interface ImportacionTotalBDStep0InformacionProps {
    setActiveStep: (step: number) => void;
    version?: 1 | 2;
}

export default function ImportacionTotalBDStep0Informacion({
    setActiveStep,
    version = 1,
}: ImportacionTotalBDStep0InformacionProps) {
    return (
        <Box>
            <VStack align="stretch" gap={6}>
                <Heading size="md" color="red.700">
                    {version === 2 ? "Importación total V2 · Base de datos y POE" : "Importacion Total de Base de Datos"}
                </Heading>

                <Text color="app.textMuted">
                    {version === 2 ? (
                        <>Se validará un respaldo <strong>.zip V2</strong> y se reemplazará la base de datos del destino,
                            restaurando también los documentos POE vigentes y retirados. Solo disponible en local y staging.
                            Todavía no incluye archivos de otros módulos.</>
                    ) : <>Se comprobará un respaldo <strong>.dump</strong> y, si es compatible, se reemplazará la base
                    de datos del destino. Esta operación solo está disponible en local y staging.</>}
                </Text>

                <Alert.Root status="info">
                    <Alert.Indicator />
                    <Alert.Description>
                        Antes de reemplazar los datos se comprobará la compatibilidad del respaldo con esta versión de Exotic.
                        Si su estructura es anterior y compatible, se actualizará y verificará antes de habilitar el entorno.
                        Un archivo incompatible se rechazará antes de reemplazar el destino.
                    </Alert.Description>
                </Alert.Root>

                <Alert.Root status="error">
                    <Alert.Indicator />
                    <Alert.Description>
                        {version === 2 ? (
                            <>Se reemplazarán usuarios, permisos, configuraciones y datos operativos del destino.
                                Realice la importación cuando nadie esté trabajando en ese ambiente.
                                Los archivos de otros módulos y los POE que no aparezcan en el paquete se conservarán.</>
                        ) : <>Se reemplazarán usuarios, permisos, configuraciones y datos operativos actuales.
                            Realice la importación cuando nadie esté trabajando en ese ambiente.</>}
                    </Alert.Description>
                </Alert.Root>

                <Alert.Root status="warning">
                    <Alert.Indicator />
                    <Alert.Description>
                        Use unicamente {version === 2 ? "paquetes V2" : "backups completos PostgreSQL"} generados por el sistema. No cargue archivos
                        manipulados manualmente ni archivos de origen desconocido.
                        Al finalizar correctamente deberá volver a iniciar sesión con los usuarios y permisos restaurados.
                        Si se requiere recuperación, el entorno permanecerá en mantenimiento hasta que un responsable lo recupere.
                    </Alert.Description>
                </Alert.Root>

                <Alert.Root status="info">
                    <Alert.Indicator />
                    <Alert.Description>
                        Esta operación está bloqueada en producción.
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
