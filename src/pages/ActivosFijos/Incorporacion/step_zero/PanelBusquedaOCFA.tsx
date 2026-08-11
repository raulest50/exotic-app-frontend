import {
    Steps,
    Flex,
    Card,
    Input,
    IconButton,
    Button,
    InputGroup,
    InputRightElement,
    Heading,
    Text,
    Field,
} from '@chakra-ui/react';
import { useColorModeValue } from "../../../../components/ui/color-mode";
import { LuArrowLeft, LuSearch } from 'react-icons/lu';

type Props = {
    ocNumber: string;
    setOcNumber: (value: string) => void;
    isSearching: boolean;
    onBack: () => void;
    onSearch: () => void;
};

/**
 * Panel para buscar órdenes de compra para activos fijos (OC-AF)
 */
export function PanelBusquedaOCFA({
    ocNumber,
    setOcNumber,
    isSearching,
    onBack,
    onSearch
}: Props) {
    const headingColor = useColorModeValue("gray.800", "gray.100");
    const labelColor = useColorModeValue("gray.700", "gray.300");
    const headerTextColor = useColorModeValue("teal.700", "teal.200");
    const softBorderColor = useColorModeValue("gray.100", "gray.600");
    const inputHoverBorderColor = useColorModeValue("gray.300", "gray.500");
    const backHoverColor = useColorModeValue("blue.600", "blue.300");

    return (
        <Flex direction="column" gap={8} alignItems="center" w="full" py={4}>
            <Heading as="h2" size="lg" textAlign="center" mb={4} color={headingColor} fontWeight="bold">
                Buscar Orden de Compra
            </Heading>
            <Flex direction="row" gap={5} alignItems="start" w="full" maxW="800px" mx="auto">
                <IconButton
                    aria-label="Volver"
                    onClick={onBack}
                    size="lg"
                    color="app.textMuted"
                    bg="app.surface"
                    border="1px solid"
                    borderColor="app.border"
                    borderRadius="md"
                    boxShadow="sm"
                    _hover={{ bg: "app.rowHover", color: backHoverColor }}><LuArrowLeft /></IconButton>

                <Card.Root 
                    flex={1} 
                    boxShadow="sm" 
                    borderRadius="md" 
                    overflow="hidden"
                    transition="all 0.2s ease"
                    _hover={{ boxShadow: "md" }}
                    bg="app.surface"
                    border="1px solid"
                    borderColor={softBorderColor}
                >
                    <Card.Header 
                        borderBottom="1px solid"
                        borderColor={softBorderColor}
                        color={headerTextColor}
                        py={5} 
                        px={6}
                        fontWeight="semibold"
                        fontSize="lg"
                        bg="app.surfaceSubtle"
                    >
                        Buscar OC-AF por ID
                    </Card.Header>

                    <Card.Body p={8}>
                        <Text mb={5} color="app.textMuted" fontSize="md" lineHeight="1.6">
                            Ingrese el número de la orden de compra para activos fijos que desea incorporar al sistema.
                        </Text>

                        <Field.Root mb={8}>
                            <Field.Label fontWeight="medium" color={labelColor} fontSize="md" mb={2}>Número de OC-AF</Field.Label>
                            <InputGroup size="lg">
                                <Input
                                    placeholder="Ej: 12345"
                                    value={ocNumber}
                                    onValueChange={(e) => setOcNumber(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            onSearch();
                                        }
                                    }}
                                    borderRadius="md"
                                    border="1px solid"
                                    borderColor="app.border"
                                    _hover={{ borderColor: inputHoverBorderColor }}
                                    fontSize="md"
                                    py={6} />
                                <InputRightElement width="4.5rem" h="full" pr={1}>
                                    <Button 
                                        h="2rem" 
                                        size="sm" 
                                        bg="blue.600"
                                        color="white"
                                        _hover={{ bg: "blue.700" }}
                                        _active={{ bg: "blue.800" }}
                                        onClick={onSearch}
                                        borderRadius="md"
                                    >
                                        <LuSearch />
                                    </Button>
                                </InputRightElement>
                            </InputGroup>
                        </Field.Root>

                        <Button
                            bg="blue.600"
                            color="white"
                            size="lg"
                            width="full"
                            onClick={onSearch}
                            loading={isSearching}
                            loadingText="Buscando..."
                            _hover={{ bg: "blue.700" }}
                            _active={{ bg: "blue.800" }}
                            borderRadius="md"
                            py={6}
                            fontWeight="medium"
                            boxShadow="sm"><LuSearch />Buscar Orden de Compra
                                                    </Button>
                    </Card.Body>
                </Card.Root>
            </Flex>
        </Flex>
    );
}
