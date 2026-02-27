import { Box, Card, CardBody, Container, Flex, Heading, SimpleGrid, Text } from '@chakra-ui/react';
import { useState } from 'react';
import WizardAveriaProduccion from './WizardAveriaProduccion/WizardAveriaProduccion';
import WizardAveriaAlmacen from './WizardAveriaAlmacen/WizardAveriaAlmacen';

type TipoAveria = 'almacen' | 'produccion' | null;

function GestionAveriasTab() {
    const [tipoAveriaSeleccionado, setTipoAveriaSeleccionado] = useState<TipoAveria>(null);

    if (tipoAveriaSeleccionado === 'produccion') {
        return <WizardAveriaProduccion onBack={() => setTipoAveriaSeleccionado(null)} />;
    }

    if (tipoAveriaSeleccionado === 'almacen') {
        return <WizardAveriaAlmacen onBack={() => setTipoAveriaSeleccionado(null)} />;
    }

    return (
        <Container maxW="container.xl" py={8}>
            <Flex direction="column" gap={6}>
                <Heading size="lg">Gestión de Averías</Heading>
                <Text>Seleccione el tipo de ingreso de avería:</Text>
                <SimpleGrid columns={[1, 2]} spacing={6}>
                    <Card
                        cursor="pointer"
                        onClick={() => setTipoAveriaSeleccionado('almacen')}
                        _hover={{ transform: 'scale(1.02)', shadow: 'lg' }}
                        transition="all 0.2s"
                        borderWidth={2}
                        borderColor="gray.200"
                    >
                        <CardBody>
                            <Flex direction="column" gap={3} align="center" textAlign="center">
                                <Heading size="md" color="teal.600">
                                    Avería en Almacén
                                </Heading>
                                <Text color="gray.600">
                                    Registrar averías ocurridas en el almacén
                                </Text>
                            </Flex>
                        </CardBody>
                    </Card>

                    <Card
                        cursor="pointer"
                        onClick={() => setTipoAveriaSeleccionado('produccion')}
                        _hover={{ transform: 'scale(1.02)', shadow: 'lg' }}
                        transition="all 0.2s"
                        borderWidth={2}
                        borderColor="gray.200"
                    >
                        <CardBody>
                            <Flex direction="column" gap={3} align="center" textAlign="center">
                                <Heading size="md" color="blue.600">
                                    Avería en Producción
                                </Heading>
                                <Text color="gray.600">
                                    Registrar averías ocurridas durante una orden de producción
                                </Text>
                            </Flex>
                        </CardBody>
                    </Card>
                </SimpleGrid>
            </Flex>
        </Container>
    );
}

export default GestionAveriasTab;