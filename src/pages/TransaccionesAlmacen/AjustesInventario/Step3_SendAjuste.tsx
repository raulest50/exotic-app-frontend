import {
    Steps,
    Alert,
    Box,
    Button,
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
    Separator,
} from "@chakra-ui/react";
import { useColorModeValue } from "../../../components/ui/color-mode";
import { keyframes } from "@emotion/react";
import { ImCheckboxChecked } from "react-icons/im";
import { RiSave3Fill } from "react-icons/ri";
import type { AjusteInventarioItemNormalizado } from "./types";
import {
    causaAjusteLabel,
    type CausaAjusteInventario,
} from "./causasAjuste";

interface Step3SendAjusteProps {
    normalizedItems: AjusteInventarioItemNormalizado[];
    causaAjuste: CausaAjusteInventario | "";
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
    normalizedItems,
    causaAjuste,
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
    const successHeadingColor = useColorModeValue("green.800", "green.100");
    const successTextColor = useColorModeValue("green.900", "green.100");

    if (isSuccess) {
        return (
            <Flex
                p="1em"
                direction="column"
                backgroundColor="app.rowSelectedGreen"
                gap={8}
                alignItems="center"
                textAlign="center"
            >
                <Flex alignItems="center" gap={3}>
                    <Heading fontFamily="Comfortaa Variable" color={successHeadingColor}>
                        Ajuste enviado correctamente
                    </Heading>
                    <Icon
                        w={{ base: "2.5em", md: "3em" }}
                        h={{ base: "2.5em", md: "3em" }}
                        color="green.500"
                        asChild><ImCheckboxChecked /></Icon>
                </Flex>
                <Text fontFamily="Comfortaa Variable" color={successTextColor}>
                    El ajuste de inventario se registró. Puedes iniciar un nuevo ajuste cuando lo necesites.
                </Text>

                <Icon
                    w={{ base: "8em", md: "10em" }}
                    h={{ base: "8em", md: "10em" }}
                    color="green.400"
                    animation={`${colorAnimation} 3s infinite ease-in-out`}
                    asChild><RiSave3Fill /></Icon>

                <Button variant="solid" colorPalette="green" onClick={onRestart}>
                    Iniciar nuevo ajuste
                </Button>
            </Flex>
        );
    }

    return (
        <Flex direction={{ base: "column" }} gap={4}>
            <Box p={4} borderWidth="1px" borderRadius="md" borderColor="app.border" w="full">
                <Heading as="h3" size="md" mb={3}>
                    Resumen del ajuste
                </Heading>

                <Stack gap={3} mb={4}>
                    <Flex alignItems="center" justifyContent="space-between">
                        <Text fontWeight="semibold">Usuario</Text>
                        <Text>{currentUserName ?? "No disponible"}</Text>
                    </Flex>
                    <Separator />
                    <Flex alignItems="center" justifyContent="space-between" gap={4}>
                        <Text fontWeight="semibold">Causa del ajuste</Text>
                        <Text textAlign="right">
                            {causaAjuste
                                ? causaAjusteLabel(causaAjuste)
                                : "Sin clasificar"}
                        </Text>
                    </Flex>
                    <Separator />
                    <Box>
                        <Text fontWeight="semibold" mb={2}>
                            Observaciones
                        </Text>
                        {observaciones?.trim() ? (
                            <Text whiteSpace="pre-line">{observaciones}</Text>
                        ) : (
                            <Text color="app.textSubtle">Sin observaciones adicionales.</Text>
                        )}
                    </Box>
                </Stack>

                <Box overflowX="auto">
                    <Table.Root size="sm" variant="simple">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>ID</Table.ColumnHeader>
                                <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                <Table.ColumnHeader>Tipo</Table.ColumnHeader>
                                <Table.ColumnHeader>Lote</Table.ColumnHeader>
                                <Table.ColumnHeader>ID lote</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign='end'>Cantidad</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {normalizedItems.map((item) => (
                                <Table.Row key={`${item.productoId}-${item.loteId}-${item.cantidad}`}>
                                    <Table.Cell>{item.productoId}</Table.Cell>
                                    <Table.Cell>{item.productoNombre}</Table.Cell>
                                    <Table.Cell textTransform="capitalize">{item.tipoProducto}</Table.Cell>
                                    <Table.Cell>{item.batchNumber}</Table.Cell>
                                    <Table.Cell>{item.loteId}</Table.Cell>
                                    <Table.Cell textAlign='end'>{item.cantidad.toFixed(4)}</Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Box>

                {error && (
                    <Alert.Root status="error" mt={4} borderRadius="md">
                        <Alert.Indicator />
                        <Alert.Description>{error}</Alert.Description>
                    </Alert.Root>
                )}

                <Flex mt={4} justifyContent="flex-end" gap={3}>
                    <Button onClick={onBack} variant="outline" disabled={isSending}>
                        Regresar
                    </Button>
                    <Button
                        colorPalette="teal"
                        onClick={onSend}
                        loading={isSending}
                        loadingText="Enviando"
                        disabled={normalizedItems.length === 0}
                    >
                        Enviar ajuste
                    </Button>
                </Flex>
            </Box>
        </Flex>
    );
}
