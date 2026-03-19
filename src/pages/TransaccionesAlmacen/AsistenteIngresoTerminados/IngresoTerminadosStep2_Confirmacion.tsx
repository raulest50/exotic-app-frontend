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
    FormHelperText,
    FormLabel,
    Heading,
    Input,
    PinInput,
    PinInputField,
    SimpleGrid,
    Text,
    useToast,
} from "@chakra-ui/react";
import { ArrowBackIcon, CheckIcon } from "@chakra-ui/icons";
import axios from "axios";
import { useMemo, useRef, useState } from "react";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import { IngresoTerminadoConsultaResponse, IngresoTerminadoDatos } from "./types.ts";

interface Props {
    consultaResult: IngresoTerminadoConsultaResponse;
    ingresoDatos: IngresoTerminadoDatos;
    username?: string;
    setActiveStep: (step: number) => void;
    onSuccess: () => void;
}

function generateToken(): string {
    return String(Math.floor(1000 + Math.random() * 9000));
}

function formatDateDisplay(isoDate: string): string {
    if (!isoDate) return "—";
    const [year, month, day] = isoDate.split("-");
    return `${day}/${month}/${year}`;
}

function getEstadoLabel(estado: number): { label: string; color: string } {
    switch (estado) {
        case 0: return { label: "Abierta", color: "blue" };
        case 2: return { label: "Terminada", color: "green" };
        case -1: return { label: "Cancelada", color: "red" };
        default: return { label: `En curso (${estado})`, color: "orange" };
    }
}

export default function IngresoTerminadosStep2_Confirmacion({
    consultaResult,
    ingresoDatos,
    username,
    setActiveStep,
    onSuccess,
}: Props) {
    const { ordenProduccion, terminado } = consultaResult;
    const { cantidadIngresada, fechaVencimiento } = ingresoDatos;

    const [token] = useState<string>(generateToken);
    const [tokenInput, setTokenInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toast = useToast();
    const endpoints = useMemo(() => new EndPointsURL(), []);

    const tokenValido = tokenInput === token;
    const puedeEnviar = tokenValido && !isLoading;

    const estadoInfo = getEstadoLabel(ordenProduccion.estadoOrden);

    const handleEnviar = async () => {
        if (!puedeEnviar) return;
        setIsLoading(true);
        setError(null);

        try {
            await axios.post(endpoints.registrar_ingreso_terminado, {
                username: username ?? "",
                ordenProduccionId: ordenProduccion.ordenId,
                cantidadIngresada,
                fechaVencimiento,
                observaciones: "",
            });

            toast({
                title: "Ingreso registrado exitosamente",
                description: `Se registraron ${cantidadIngresada} unidades de "${terminado.nombre}" en el almacén general. La Orden de Producción fue cerrada.`,
                status: "success",
                duration: 6000,
                isClosable: true,
                position: "top",
            });

            onSuccess();
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.detail ?? "Error al registrar el ingreso. Por favor intente nuevamente.");
            } else {
                setError("Error de conexión. Verifique la red e intente nuevamente.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box>
            <Heading size="md" mb={6}>Confirmación de Ingreso</Heading>
            <Text fontSize="sm" color="gray.500" mb={5}>
                Revise los datos antes de confirmar. Esta operación registrará el ingreso al almacén y cerrará la Orden de Producción.
            </Text>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={5}>
                {/* Card: Orden de Producción */}
                <Card variant="outline">
                    <CardHeader pb={1}>
                        <Heading size="xs" color="purple.600" textTransform="uppercase">Orden de Producción</Heading>
                    </CardHeader>
                    <Divider />
                    <CardBody>
                        <Flex direction="column" gap={2} fontSize="sm">
                            <Flex justify="space-between">
                                <Text color="gray.500">ID</Text>
                                <Text fontWeight="bold">#{ordenProduccion.ordenId}</Text>
                            </Flex>
                            <Flex justify="space-between">
                                <Text color="gray.500">Lote</Text>
                                <Text fontWeight="bold" color="green.600">{ordenProduccion.loteAsignado}</Text>
                            </Flex>
                            <Flex justify="space-between" align="center">
                                <Text color="gray.500">Estado actual</Text>
                                <Badge colorScheme={estadoInfo.color}>{estadoInfo.label}</Badge>
                            </Flex>
                            <Flex justify="space-between">
                                <Text color="gray.500">Cantidad planificada</Text>
                                <Text fontWeight="medium">{ordenProduccion.cantidadProducir}</Text>
                            </Flex>
                            {ordenProduccion.areaOperativa && (
                                <Flex justify="space-between">
                                    <Text color="gray.500">Área operativa</Text>
                                    <Text fontWeight="medium">{ordenProduccion.areaOperativa}</Text>
                                </Flex>
                            )}
                            {ordenProduccion.numeroPedidoComercial && (
                                <Flex justify="space-between">
                                    <Text color="gray.500">Pedido comercial</Text>
                                    <Text fontWeight="medium">{ordenProduccion.numeroPedidoComercial}</Text>
                                </Flex>
                            )}
                            {ordenProduccion.fechaCreacion && (
                                <Flex justify="space-between">
                                    <Text color="gray.500">Fecha creación</Text>
                                    <Text>{formatDateDisplay(ordenProduccion.fechaCreacion.split("T")[0])}</Text>
                                </Flex>
                            )}
                        </Flex>
                    </CardBody>
                </Card>

                {/* Card: Producto Terminado */}
                <Card variant="outline">
                    <CardHeader pb={1}>
                        <Heading size="xs" color="blue.600" textTransform="uppercase">Producto Terminado</Heading>
                    </CardHeader>
                    <Divider />
                    <CardBody>
                        <Flex direction="column" gap={2} fontSize="sm">
                            <Flex justify="space-between" align="center">
                                <Text color="gray.500">ID</Text>
                                <Badge colorScheme="purple">{terminado.productoId}</Badge>
                            </Flex>
                            <Flex justify="space-between">
                                <Text color="gray.500">Nombre</Text>
                                <Text fontWeight="bold" textAlign="right" maxW="60%">{terminado.nombre}</Text>
                            </Flex>
                            {terminado.categoria && (
                                <Flex justify="space-between">
                                    <Text color="gray.500">Categoría</Text>
                                    <Text fontWeight="medium">{terminado.categoria.categoriaNombre}</Text>
                                </Flex>
                            )}
                            {terminado.tipoUnidades && (
                                <Flex justify="space-between" align="center">
                                    <Text color="gray.500">Tipo unidades</Text>
                                    <Badge colorScheme="gray">{terminado.tipoUnidades}</Badge>
                                </Flex>
                            )}
                        </Flex>
                    </CardBody>
                </Card>

                {/* Card: Datos digitados */}
                <Card variant="outline" borderColor="green.300">
                    <CardHeader pb={1}>
                        <Heading size="xs" color="green.600" textTransform="uppercase">Datos del Ingreso</Heading>
                    </CardHeader>
                    <Divider />
                    <CardBody>
                        <Flex direction="column" gap={3} fontSize="sm">
                            <Flex justify="space-between" align="center">
                                <Text color="gray.500">Unidades que ingresan</Text>
                                <Badge colorScheme="green" fontSize="md" px={3} py={1}>
                                    {cantidadIngresada}
                                </Badge>
                            </Flex>
                            <Flex justify="space-between" align="center">
                                <Text color="gray.500">Fecha de vencimiento</Text>
                                <Text fontWeight="bold" color="orange.600">
                                    {formatDateDisplay(fechaVencimiento)}
                                </Text>
                            </Flex>
                            <Flex justify="space-between" align="center">
                                <Text color="gray.500">Almacén destino</Text>
                                <Badge colorScheme="teal">GENERAL</Badge>
                            </Flex>
                            <Flex justify="space-between" align="center">
                                <Text color="gray.500">Tipo movimiento</Text>
                                <Badge colorScheme="blue">BACKFLUSH</Badge>
                            </Flex>
                        </Flex>
                    </CardBody>
                </Card>

                {/* Card: Token de validación */}
                <Card variant="outline" borderColor="orange.300">
                    <CardHeader pb={1}>
                        <Heading size="xs" color="orange.600" textTransform="uppercase">Validación de Seguridad</Heading>
                    </CardHeader>
                    <Divider />
                    <CardBody>
                        <Text fontSize="sm" color="gray.600" mb={3}>
                            Para confirmar esta operación, ingrese el siguiente código de 4 dígitos:
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
                            <FormLabel fontSize="sm" fontWeight="semibold">Confirme el código</FormLabel>
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
                                    Código incorrecto. Inténtelo de nuevo.
                                </Text>
                            )}
                            {tokenValido && (
                                <Text fontSize="xs" color="green.600" mt={1} textAlign="center" fontWeight="semibold">
                                    ✓ Código validado
                                </Text>
                            )}
                        </FormControl>
                    </CardBody>
                </Card>
            </SimpleGrid>

            {error && (
                <Alert status="error" borderRadius="md" mb={4}>
                    <AlertIcon />
                    <AlertDescription fontSize="sm">{error}</AlertDescription>
                </Alert>
            )}

            {/* Botones de navegación */}
            <Flex justify="space-between" mt={2}>
                <Button
                    leftIcon={<ArrowBackIcon />}
                    variant="outline"
                    onClick={() => setActiveStep(1)}
                    isDisabled={isLoading}
                >
                    Atrás
                </Button>
                <Button
                    leftIcon={<CheckIcon />}
                    colorScheme="green"
                    onClick={handleEnviar}
                    isLoading={isLoading}
                    loadingText="Registrando..."
                    isDisabled={!puedeEnviar}
                >
                    Confirmar Ingreso
                </Button>
            </Flex>
        </Box>
    );
}
