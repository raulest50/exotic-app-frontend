import {Card, CardBody, CardHeader, Flex, Heading, Icon, SimpleGrid, Text} from '@chakra-ui/react';
import {FaTools, FaBoxOpen, FaCogs} from 'react-icons/fa';

interface Props {
    setViewMode: (mode: 'menu' | 'basic' | 'terminados' | 'procesos') => void;
    productosAccessLevel: number;
}

export function ProductosMenuSelection({setViewMode, productosAccessLevel}: Props) {
    return (
        <Flex direction={"column"} gap={10} w="full">
            <Heading as="h2" size="lg" textAlign="center" mb={6} fontFamily="Arimo">
                Seleccione una opción
            </Heading>

            <SimpleGrid columns={3} spacing={8} w="full">
                {/* Basic Operations card */}
                <Card
                    h="250px"
                    cursor="pointer"
                    bg="orange.100"
                    _hover={{
                        bg: "orange.300",
                        transform: "translateY(-5px)",
                        boxShadow: "xl",
                    }}
                    _active={{ bg: "orange.800", color: "white" }}
                    transition="all 0.3s ease"
                    onClick={() => setViewMode('basic')}
                >
                    <CardHeader borderBottom="0.1em solid" p={4}>
                        <Heading as="h3" size="md" fontFamily="Comfortaa Variable">
                            Basic Operations
                        </Heading>
                    </CardHeader>
                    <CardBody display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={6}>
                        <Icon as={FaTools} boxSize="5em" mb={4} />
                        <Text textAlign="center">Codificar material y consultar productos</Text>
                    </CardBody>
                </Card>

                {/* Definicion Terminados/Semiterminados card */}
                <Card
                    h="250px"
                    cursor="pointer"
                    bg="teal.100"
                    _hover={{
                        bg: "teal.300",
                        transform: "translateY(-5px)",
                        boxShadow: "xl",
                    }}
                    _active={{ bg: "teal.800", color: "white" }}
                    transition="all 0.3s ease"
                    onClick={() => setViewMode('terminados')}
                >
                    <CardHeader borderBottom="0.1em solid" p={4}>
                        <Heading as="h3" size="md" fontFamily="Comfortaa Variable">
                            Definición Terminados/Semiterminados
                        </Heading>
                    </CardHeader>
                    <CardBody display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={6}>
                        <Icon as={FaBoxOpen} boxSize="5em" mb={4} />
                        <Text textAlign="center">Gestionar terminados, semiterminados y categorías</Text>
                    </CardBody>
                </Card>

                {/* Definicion Procesos card, only for privileged users */}
                {productosAccessLevel >= 2 && (
                    <Card
                        h="250px"
                        cursor="pointer"
                        bg="purple.100"
                        _hover={{
                            bg: "purple.300",
                            transform: "translateY(-5px)",
                            boxShadow: "xl",
                        }}
                        _active={{ bg: "purple.800", color: "white" }}
                        transition="all 0.3s ease"
                        onClick={() => setViewMode('procesos')}
                    >
                        <CardHeader borderBottom="0.1em solid" p={4}>
                            <Heading as="h3" size="md" fontFamily="Comfortaa Variable">
                                Definición de Procesos
                            </Heading>
                        </CardHeader>
                        <CardBody display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={6}>
                            <Icon as={FaCogs} boxSize="5em" mb={4} />
                            <Text textAlign="center">Definir procesos de producción</Text>
                        </CardBody>
                    </Card>
                )}
            </SimpleGrid>
        </Flex>
    );
}

export default ProductosMenuSelection;
