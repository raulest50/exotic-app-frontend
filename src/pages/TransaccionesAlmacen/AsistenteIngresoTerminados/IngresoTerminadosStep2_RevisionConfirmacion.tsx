import {
    Alert,
    AlertDescription,
    AlertIcon,
    Badge,
    Box,
    Button,
    Card,
    CardBody,
    CardHeader,
    Divider,
    Flex,
    FormControl,
    FormLabel,
    Heading,
    PinInput,
    PinInputField,
    SimpleGrid,
    Stat,
    StatLabel,
    StatNumber,
    Table,
    TableContainer,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    useToast,
    VStack,
} from "@chakra-ui/react";
import { ArrowBackIcon, CheckIcon } from "@chakra-ui/icons";
import { ImCheckboxChecked } from "react-icons/im";
import { RiSave3Fill } from "react-icons/ri";
import { keyframes } from "@emotion/react";
import axios from "axios";
import { useMemo, useState } from "react";
import EndPointsURL from "../../../api/EndPointsURL";
import { IngresoTerminadoValidado, RegistroMasivoPayload } from "./types";

interface Props {
    ingresosValidados: IngresoTerminadoValidado[];
    username?: string;
    setActiveStep: (step: number) => void;
    onSuccess: () => void;
}

function generateToken(): string {
    return String(Math.floor(1000 + Math.random() * 9000));
}

function formatDateDisplay(isoDate: string): string {
    if (!isoDate) return "-";
    const [year, month, day] = isoDate.split("-");
    return `${day}/${month}/${year}`;
}

export default function IngresoTerminadosStep2_RevisionConfirmacion({
    ingresosValidados,
    username,
    setActiveStep,
    onSuccess,
}: Props) {
    const toast = useToast();
    const endpoints = useMemo(() => new EndPointsURL(), []);

    const [token] = useState<string>(generateToken);
    const [tokenInput, setTokenInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [registroExitoso, setRegistroExitoso] = useState(false);

    const tokenValido = tokenInput === token;
    const puedeEnviar = tokenValido && !isLoading;

    // Calcular estadisticas
    const totalOrdenes = ingresosValidados.length;
    const totalUnidades = ingresosValidados.reduce((acc, i) => acc + i.cantidadIngresada, 0);
    const totalEsperado = ingresosValidados.reduce((acc, i) => acc + i.cantidadEsperada, 0);

    const colorAnimation = keyframes`
        0% { color: #68D391; }
        50% { color: #22d3ee; }
        100% { color: #68D391; }
    `;

    const handleConfirmar = async () => {
        if (!puedeEnviar) return;
        setIsLoading(true);
        setError(null);

        try {
            const payload: RegistroMasivoPayload = {
                username: username ?? "",
                ingresos: ingresosValidados.map((i) => ({
                    ordenProduccionId: i.ordenId,
                    cantidadIngresada: i.cantidadIngresada,
                    fechaVencimiento: i.fechaVencimiento,
                })),
            };

            await axios.post(endpoints.ingreso_terminados_registrar_masivo, payload, {
                withCredentials: true,
            });

            setRegistroExitoso(true);

            toast({
                title: "Ingresos registrados exitosamente",
                description: `Se registraron ${totalOrdenes} ingreso(s) con un total de ${totalUnidades} unidades.`,
                status: "success",
                duration: 6000,
                isClosable: true,
                position: "top",
            });
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.detail ?? "Error al registrar los ingresos. Por favor intente nuevamente.");
            } else {
                setError("Error de conexion. Verifique la red e intente nuevamente.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Pantalla de exito
    if (registroExitoso) {
        return (
            <Flex
                p="2em"
                direction="column"
                backgroundColor="green.50"
                gap={8}
                alignItems="center"
                textAlign="center"
                borderRadius="lg"
            >
                <Flex alignItems="center" gap={3}>
                    <Heading fontFamily="Comfortaa Variable" color="green.800">
                        Ingresos Registrados
                    </Heading>
                    <ImCheckboxChecked style={{ width: "2.5em", height: "2.5em", color: "#48BB78" }} />
                </Flex>

                <VStack spacing={2}>
                    <Text fontFamily="Comfortaa Variable" color="green.900" fontSize="lg">
                        Se registraron {totalOrdenes} ingreso(s) de producto terminado
                    </Text>
                    <Text fontFamily="Comfortaa Variable" color="green.700">
                        Total de unidades ingresadas: <strong>{totalUnidades}</strong>
                    </Text>
                </VStack>

                <RiSave3Fill
                    style={{
                        width: "8em",
                        height: "8em",
                        color: "#68D391",
                        animation: `${colorAnimation} 3s infinite ease-in-out`,
                    }}
                />

                <Button
                    variant="solid"
                    colorScheme="green"
                    size="lg"
                    onClick={() => {
                        setRegistroExitoso(false);
                        onSuccess();
                    }}
                >
                    Iniciar Nuevo Proceso
                </Button>
            </Flex>
        );
    }

    return (
        <Box>
            <Heading size="md" mb={4}>Revision y Confirmacion</Heading>
            <Text fontSize="sm" color="gray.500" mb={5}>
                Revise el resumen de los ingresos a registrar. Esta operacion registrara todos los ingresos
                y cerrara las ordenes de produccion correspondientes.
            </Text>

            <VStack align="stretch" spacing={5}>
                {/* Estadisticas */}
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                    <Card variant="outline">
                        <CardBody>
                            <Stat>
                                <StatLabel color="gray.500">Total Ordenes</StatLabel>
                                <StatNumber color="blue.600">{totalOrdenes}</StatNumber>
                            </Stat>
                        </CardBody>
                    </Card>
                    <Card variant="outline">
                        <CardBody>
                            <Stat>
                                <StatLabel color="gray.500">Unidades a Ingresar</StatLabel>
                                <StatNumber color="green.600">{totalUnidades}</StatNumber>
                            </Stat>
                        </CardBody>
                    </Card>
                    <Card variant="outline">
                        <CardBody>
                            <Stat>
                                <StatLabel color="gray.500">Unidades Esperadas</StatLabel>
                                <StatNumber color="purple.600">{totalEsperado}</StatNumber>
                            </Stat>
                        </CardBody>
                    </Card>
                </SimpleGrid>

                {/* Tabla de resumen */}
                <Card variant="outline">
                    <CardHeader pb={2}>
                        <Heading size="sm" color="purple.600">Detalle de Ingresos</Heading>
                    </CardHeader>
                    <Divider />
                    <CardBody p={0}>
                        <TableContainer maxH="300px" overflowY="auto">
                            <Table size="sm" variant="simple">
                                <Thead bg="gray.50" position="sticky" top={0}>
                                    <Tr>
                                        <Th>Lote</Th>
                                        <Th>Producto</Th>
                                        <Th>Categoria</Th>
                                        <Th isNumeric>Esperado</Th>
                                        <Th isNumeric>Ingresa</Th>
                                        <Th isNumeric>Dif. %</Th>
                                        <Th>Vencimiento</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {ingresosValidados.map((ingreso, idx) => (
                                        <Tr key={idx}>
                                            <Td fontWeight="bold" color="green.600">
                                                {ingreso.loteAsignado}
                                            </Td>
                                            <Td>
                                                <Text fontSize="xs" noOfLines={1} maxW="150px">
                                                    {ingreso.productoNombre}
                                                </Text>
                                            </Td>
                                            <Td>
                                                <Badge colorScheme="gray" fontSize="xs">
                                                    {ingreso.categoriaNombre}
                                                </Badge>
                                            </Td>
                                            <Td isNumeric>{ingreso.cantidadEsperada}</Td>
                                            <Td isNumeric fontWeight="bold" color="green.600">
                                                {ingreso.cantidadIngresada}
                                            </Td>
                                            <Td isNumeric>
                                                <Badge
                                                    colorScheme={
                                                        ingreso.diferenciaPorcentaje === 0
                                                            ? "green"
                                                            : ingreso.diferenciaPorcentaje > 0
                                                            ? "blue"
                                                            : "orange"
                                                    }
                                                    fontSize="xs"
                                                >
                                                    {ingreso.diferenciaPorcentaje > 0 ? "+" : ""}
                                                    {ingreso.diferenciaPorcentaje.toFixed(1)}%
                                                </Badge>
                                            </Td>
                                            <Td fontSize="xs">{formatDateDisplay(ingreso.fechaVencimiento)}</Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </TableContainer>
                    </CardBody>
                </Card>

                {/* Token de validacion */}
                <Card variant="outline" borderColor="orange.300">
                    <CardHeader pb={2}>
                        <Heading size="sm" color="orange.600">Validacion de Seguridad</Heading>
                    </CardHeader>
                    <Divider />
                    <CardBody>
                        <Text fontSize="sm" color="gray.600" mb={3}>
                            Para confirmar esta operacion, ingrese el siguiente codigo de 4 digitos:
                        </Text>
                        <Flex justify="center" mb={4}>
                            <Text
                                fontSize="3xl"
                                fontWeight="black"
                                letterSpacing="widest"
                                color="orange.500"
                                fontFamily="mono"
                            >
                                {token}
                            </Text>
                        </Flex>
                        <FormControl>
                            <FormLabel fontSize="sm" fontWeight="semibold">Confirme el codigo</FormLabel>
                            <Flex justify="center">
                                <PinInput
                                    value={tokenInput}
                                    onChange={setTokenInput}
                                    otp
                                    size="lg"
                                    isInvalid={tokenInput.length === 4 && !tokenValido}
                                >
                                    <PinInputField />
                                    <PinInputField />
                                    <PinInputField />
                                    <PinInputField />
                                </PinInput>
                            </Flex>
                            {tokenInput.length === 4 && !tokenValido && (
                                <Text fontSize="xs" color="red.500" mt={1} textAlign="center">
                                    Codigo incorrecto. Intentelo de nuevo.
                                </Text>
                            )}
                            {tokenValido && (
                                <Text fontSize="xs" color="green.600" mt={1} textAlign="center" fontWeight="semibold">
                                    Codigo validado
                                </Text>
                            )}
                        </FormControl>
                    </CardBody>
                </Card>

                {/* Error */}
                {error && (
                    <Alert status="error" borderRadius="md">
                        <AlertIcon />
                        <AlertDescription fontSize="sm">{error}</AlertDescription>
                    </Alert>
                )}

                {/* Botones de navegacion */}
                <Flex justify="space-between">
                    <Button
                        leftIcon={<ArrowBackIcon />}
                        variant="outline"
                        onClick={() => setActiveStep(1)}
                        isDisabled={isLoading}
                    >
                        Atras
                    </Button>
                    <Button
                        leftIcon={<CheckIcon />}
                        colorScheme="green"
                        onClick={handleConfirmar}
                        isLoading={isLoading}
                        loadingText="Registrando..."
                        isDisabled={!puedeEnviar}
                    >
                        Confirmar Ingresos ({totalOrdenes})
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
