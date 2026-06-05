import {
    Box,
    Container,
    Flex,
    Heading,
    Text,
    VStack,
    Icon,
    Divider,
    useColorModeValue
} from '@chakra-ui/react';
import { FaLightbulb, FaEye, FaHandshake, FaBalanceScale, FaLeaf, FaUsers } from 'react-icons/fa';

export function MisionVision() {
    const bgGradient = useColorModeValue(
        'linear(to-r, blue.50, white, blue.50)',
        'linear(to-r, gray.800, gray.900, gray.800)'
    );

    const cardBg = useColorModeValue('white', 'gray.700');
    const borderColor = useColorModeValue('blue.100', 'blue.700');
    const missionHeadingColor = useColorModeValue('blue.600', 'blue.200');
    const visionHeadingColor = useColorModeValue('teal.600', 'teal.200');
    const valuesHeadingColor = useColorModeValue('purple.600', 'purple.200');

    return (
        <Box bgGradient={bgGradient} minH="100vh" py={8}>
            <Container maxW="container.xl">
                {/* Encabezado */}
                <Flex 
                    direction="column" 
                    align="center" 
                    textAlign="center" 
                    mb={12}
                >
                    <Heading 
                        as="h1" 
                        size="2xl" 
                        mb={4} 
                        bgGradient="linear(to-r, blue.400, teal.400)" 
                        bgClip="text"
                    >
                        Nuestra Identidad Corporativa
                    </Heading>
                    <Text fontSize="xl" maxW="800px" color="app.textMuted">
                        Conoce los principios que guían nuestro trabajo y definen quiénes somos como organización.
                    </Text>
                </Flex>

                {/* Sección de Misión y Visión */}
                <Flex 
                    direction={{ base: 'column', lg: 'row' }} 
                    gap={8} 
                    mb={16}
                >
                    {/* Misión */}
                    <Box 
                        flex="1" 
                        bg={cardBg} 
                        p={8} 
                        borderRadius="xl" 
                        boxShadow="xl"
                        borderWidth="1px"
                        borderColor={borderColor}
                        position="relative"
                        overflow="hidden"
                        _before={{
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '5px',
                            bgGradient: 'linear(to-r, blue.400, blue.600)',
                        }}
                    >
                        <Flex align="center" mb={6}>
                            <Icon as={FaLightbulb} boxSize={10} color="blue.500" mr={4} />
                            <Heading as="h2" size="xl" color={missionHeadingColor}>
                                Nuestra Misión
                            </Heading>
                        </Flex>
                        <Text fontSize="lg" lineHeight="tall">
                            Proporcionar productos capilares innovadores y de alta calidad, 
                            comprometidos con la excelencia en cada proceso, la satisfacción de nuestros clientes 
                            y el desarrollo sostenible de nuestra comunidad. Buscamos transformar ingredientes naturales 
                            en soluciones capilares excepcionales que mejoren la salud y belleza del cabello.
                        </Text>
                    </Box>

                    {/* Visión */}
                    <Box 
                        flex="1" 
                        bg={cardBg} 
                        p={8} 
                        borderRadius="xl" 
                        boxShadow="xl"
                        borderWidth="1px"
                        borderColor={borderColor}
                        position="relative"
                        overflow="hidden"
                        _before={{
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '5px',
                            bgGradient: 'linear(to-r, teal.400, teal.600)',
                        }}
                    >
                        <Flex align="center" mb={6}>
                            <Icon as={FaEye} boxSize={10} color="teal.500" mr={4} />
                            <Heading as="h2" size="xl" color={visionHeadingColor}>
                                Nuestra Visión
                            </Heading>
                        </Flex>
                        <Text fontSize="lg" lineHeight="tall">
                            Ser reconocidos como líderes en la industria de productos capilares a nivel nacional e internacional, 
                            destacándonos por la innovación, calidad y sostenibilidad de nuestras formulaciones y procesos. 
                            Aspiramos a expandir nuestra presencia en nuevos mercados, manteniendo siempre nuestro 
                            compromiso con la excelencia, la belleza natural y la responsabilidad social y ambiental.
                        </Text>
                    </Box>
                </Flex>

                {/* Sección de Valores */}
                <Box mb={16}>
                    <Heading 
                        as="h2" 
                        size="xl" 
                        textAlign="center" 
                        mb={10}
                        color={valuesHeadingColor}
                    >
                        Nuestros Valores
                    </Heading>

                    <Flex 
                        wrap="wrap" 
                        justify="center" 
                        gap={6}
                    >
                        {/* Valor 1 */}
                        <Box 
                            bg={cardBg} 
                            p={6} 
                            borderRadius="lg" 
                            boxShadow="md"
                            borderWidth="1px"
                            borderColor={borderColor}
                            width={{ base: '100%', md: '45%', lg: '30%' }}
                        >
                            <VStack align="center" spacing={4}>
                                <Icon as={FaHandshake} boxSize={12} color="blue.500" />
                                <Heading as="h3" size="md">Integridad</Heading>
                                <Text textAlign="center">
                                    Actuamos con honestidad, transparencia y ética en todas nuestras relaciones 
                                    y decisiones empresariales.
                                </Text>
                            </VStack>
                        </Box>

                        {/* Valor 2 */}
                        <Box 
                            bg={cardBg} 
                            p={6} 
                            borderRadius="lg" 
                            boxShadow="md"
                            borderWidth="1px"
                            borderColor={borderColor}
                            width={{ base: '100%', md: '45%', lg: '30%' }}
                        >
                            <VStack align="center" spacing={4}>
                                <Icon as={FaBalanceScale} boxSize={12} color="teal.500" />
                                <Heading as="h3" size="md">Excelencia</Heading>
                                <Text textAlign="center">
                                    Nos esforzamos por alcanzar los más altos estándares de calidad y belleza en todos 
                                    nuestros productos capilares, garantizando resultados excepcionales para el cuidado del cabello.
                                </Text>
                            </VStack>
                        </Box>

                        {/* Valor 3 */}
                        <Box 
                            bg={cardBg} 
                            p={6} 
                            borderRadius="lg" 
                            boxShadow="md"
                            borderWidth="1px"
                            borderColor={borderColor}
                            width={{ base: '100%', md: '45%', lg: '30%' }}
                        >
                            <VStack align="center" spacing={4}>
                                <Icon as={FaLeaf} boxSize={12} color="green.500" />
                                <Heading as="h3" size="md">Sostenibilidad</Heading>
                                <Text textAlign="center">
                                    Desarrollamos nuestras actividades con respeto al medio ambiente, 
                                    utilizando ingredientes naturales, prácticas libres de crueldad animal y 
                                    un compromiso con las futuras generaciones.
                                </Text>
                            </VStack>
                        </Box>

                        {/* Valor 4 */}
                        <Box 
                            bg={cardBg} 
                            p={6} 
                            borderRadius="lg" 
                            boxShadow="md"
                            borderWidth="1px"
                            borderColor={borderColor}
                            width={{ base: '100%', md: '45%', lg: '30%' }}
                        >
                            <VStack align="center" spacing={4}>
                                <Icon as={FaUsers} boxSize={12} color="purple.500" />
                                <Heading as="h3" size="md">Trabajo en Equipo</Heading>
                                <Text textAlign="center">
                                    Fomentamos la colaboración, el respeto mutuo y la comunicación efectiva 
                                    entre todos los miembros de nuestra organización.
                                </Text>
                            </VStack>
                        </Box>
                    </Flex>
                </Box>

                {/* Pie de página */}
                <Divider mb={8} />
                <Text textAlign="center" color="app.textSubtle" fontSize="sm">
                    © {new Date().getFullYear()} Exotic Expert. Todos los derechos reservados.
                </Text>
            </Container>
        </Box>
    );
}
