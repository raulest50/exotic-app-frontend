import {
    Alert,
    AlertDescription,
    AlertIcon,
    Box,
    Button,
    Divider,
    Flex,
    Heading,
    Icon,
    Stack,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { ImCheckboxChecked } from "react-icons/im";
import { RiSave3Fill } from "react-icons/ri";
import { Producto } from "../../Productos/types.tsx";

interface Step3SendAjusteProps {
    selectedProducts: Producto[];
    quantities: Record<string, number | "">;
    lotIds: Record<string, number | "">;
    observaciones?: string;
    currentUserName?: string;
    onBack: () => void;
    onSend: () => Promise<void>;
    isSending: boolean;
    error?: string | null;
    isSuccess?: boolean;
    onRestart?: () => void;
}

export default function AjustesInventarioStep2ReviewSubmit({
    selectedProducts,
    quantities,
    lotIds,
    observaciones,
    currentUserName,
    onBack,
    onSend,
    isSending,
    error,
    isSuccess = false,
    onRestart,
}: Step3SendAjusteProps) {
    const colorAnimation = keyframes`
  0% { color: #68D391; }
  50% { color: #22d3ee; }
  100% { color: #68D391; }
`;

    if (isSuccess) {
        return (
            <Flex
                p={"1em"}
                direction={"column"}
                backgroundColor={"green.50"}
                gap={8}
                alignItems={"center"}
                textAlign={"center"}
            >
                <Flex alignItems={"center"} gap={3}>
                    <Heading fontFamily={"Comfortaa Variable"} color={"green.800"}>
                        Ajuste enviado correctamente
                    </Heading>
                    <Icon as={ImCheckboxChecked} w={{ base: "2.5em", md: "3em" }} h={{ base: "2.5em", md: "3em" }} color={"green.500"} />
                </Flex>
                <Text fontFamily={"Comfortaa Variable"} color={"green.900"}>
                    El ajuste de inventario se registró. Puedes iniciar un nuevo ajuste cuando lo necesites.
                </Text>

                <Icon
                    as={RiSave3Fill}
                    w={{ base: "8em", md: "10em" }}
                    h={{ base: "8em", md: "10em" }}
                    color={"green.400"}
                    animation={`${colorAnimation} 3s infinite ease-in-out`}
                />

                <Button
                    variant={"solid"}
                    colorScheme={"green"}
                    onClick={onRestart}
                >
                    Iniciar nuevo ajuste
                </Button>
            </Flex>
        );
    }

    const renderObservaciones = () => {
        if (!observaciones || observaciones.trim() === "") {
            return <Text color={"gray.500"}>Sin observaciones adicionales.</Text>;
        }

        return <Text whiteSpace={"pre-line"}>{observaciones}</Text>;
    };

    return (
        <Flex direction={{ base: "column" }} gap={4}>
            <Box p={4} borderWidth={"1px"} borderRadius={"md"} borderColor={"gray.200"} w={"full"}>
                <Heading as={"h3"} size={"md"} mb={3}>
                    Resumen del ajuste
                </Heading>

                <Stack spacing={3} mb={4}>
                    <Flex alignItems={"center"} justifyContent={"space-between"}>
                        <Text fontWeight={"semibold"}>Usuario</Text>
                        <Text>{currentUserName ?? "No disponible"}</Text>
                    </Flex>
                    <Divider />
                    <Box>
                        <Text fontWeight={"semibold"} mb={2}>
                            Observaciones
                        </Text>
                        {renderObservaciones()}
                    </Box>
                </Stack>

                <Box overflowX={"auto"}>
                    <Table size={"sm"} variant={"simple"}>
                        <Thead>
                            <Tr>
                                <Th>ID</Th>
                                <Th>Nombre</Th>
                                <Th>Tipo</Th>
                                <Th isNumeric>Unidades de ajuste</Th>
                                <Th>ID de lote</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {selectedProducts.map((producto) => (
                                <Tr key={producto.productoId}>
                                    <Td>{producto.productoId}</Td>
                                    <Td>{producto.nombre}</Td>
                                    <Td textTransform={"capitalize"}>{producto.tipo_producto}</Td>
                                    <Td isNumeric>{quantities[producto.productoId]?.toString() ?? ""}</Td>
                                    <Td>{lotIds[producto.productoId]}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Box>

                {error && (
                    <Alert status={"error"} mt={4} borderRadius={"md"}>
                        <AlertIcon />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <Flex mt={4} justifyContent={"flex-end"} gap={3}>
                    <Button onClick={onBack} variant={"outline"} isDisabled={isSending}>
                        Regresar
                    </Button>
                    <Button
                        colorScheme={"teal"}
                        onClick={onSend}
                        isLoading={isSending}
                        loadingText={"Enviando"}
                    >
                        Enviar ajuste
                    </Button>
                </Flex>
            </Box>
        </Flex>
    );
}
