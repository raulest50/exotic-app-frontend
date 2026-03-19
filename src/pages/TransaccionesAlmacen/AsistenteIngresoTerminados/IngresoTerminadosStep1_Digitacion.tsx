import {
    Badge,
    Box,
    Button,
    Card,
    CardBody,
    CardHeader,
    Divider,
    Flex,
    FormControl,
    FormErrorMessage,
    FormHelperText,
    FormLabel,
    Heading,
    Image,
    Input,
    NumberDecrementStepper,
    NumberIncrementStepper,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    SimpleGrid,
    Stat,
    StatLabel,
    StatNumber,
    Text,
} from "@chakra-ui/react";
import { ArrowBackIcon, ArrowForwardIcon } from "@chakra-ui/icons";
import { useState } from "react";
import { IngresoTerminadoConsultaResponse, IngresoTerminadoDatos } from "./types.ts";

interface Props {
    consultaResult: IngresoTerminadoConsultaResponse;
    setActiveStep: (step: number) => void;
    setIngresoDatos: (datos: IngresoTerminadoDatos) => void;
    setConsultaResult: (result: null) => void;
}

function getTwoYearsFromNow(): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d.toISOString().split("T")[0];
}

export default function IngresoTerminadosStep1_Digitacion({
    consultaResult,
    setActiveStep,
    setIngresoDatos,
    setConsultaResult,
}: Props) {
    const { terminado, ordenProduccion, loteSizeEsperado } = consultaResult;

    const [cantidad, setCantidad] = useState<number | "">(loteSizeEsperado > 0 ? loteSizeEsperado : "");
    const [fechaVencimiento, setFechaVencimiento] = useState<string>(getTwoYearsFromNow());

    const cantidadValida = typeof cantidad === "number" && Number.isInteger(cantidad) && cantidad >= 1;
    const fechaValida = !!fechaVencimiento;
    const puedeAvanzar = cantidadValida && fechaValida;

    const handleSiguiente = () => {
        if (!puedeAvanzar) return;
        setIngresoDatos({
            cantidadIngresada: cantidad as number,
            fechaVencimiento,
        });
        setActiveStep(2);
    };

    const handleAtras = () => {
        setConsultaResult(null);
        setActiveStep(0);
    };

    return (
        <Box>
            <Heading size="md" mb={6}>Datos de Ingreso al Almacén</Heading>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5} mb={6}>
                {/* Card: Información del Producto Terminado */}
                <Card variant="outline">
                    <CardHeader pb={2}>
                        <Heading size="sm" color="blue.600">Producto Terminado</Heading>
                    </CardHeader>
                    <Divider />
                    <CardBody>
                        {terminado.fotoUrl && (
                            <Image
                                src={terminado.fotoUrl}
                                alt={terminado.nombre}
                                boxSize="80px"
                                objectFit="cover"
                                borderRadius="md"
                                mb={3}
                            />
                        )}
                        <Flex direction="column" gap={2}>
                            <Flex justify="space-between" align="center">
                                <Text fontSize="xs" color="gray.500" fontWeight="semibold" textTransform="uppercase">ID Producto</Text>
                                <Badge colorScheme="purple" fontSize="xs">{terminado.productoId}</Badge>
                            </Flex>
                            <Text fontWeight="bold" fontSize="lg">{terminado.nombre}</Text>
                            {terminado.categoria && (
                                <Flex justify="space-between" align="center">
                                    <Text fontSize="sm" color="gray.500">Categoría</Text>
                                    <Text fontSize="sm" fontWeight="medium">{terminado.categoria.categoriaNombre}</Text>
                                </Flex>
                            )}
                            {terminado.tipoUnidades && (
                                <Flex justify="space-between" align="center">
                                    <Text fontSize="sm" color="gray.500">Unidades</Text>
                                    <Badge colorScheme="gray">{terminado.tipoUnidades}</Badge>
                                </Flex>
                            )}
                            {terminado.prefijoLote && (
                                <Flex justify="space-between" align="center">
                                    <Text fontSize="sm" color="gray.500">Prefijo Lote</Text>
                                    <Text fontSize="sm" fontWeight="medium">{terminado.prefijoLote}</Text>
                                </Flex>
                            )}
                            <Divider my={1} />
                            <Flex justify="space-between" align="center">
                                <Text fontSize="sm" color="gray.500">Lote OP</Text>
                                <Text fontSize="sm" fontWeight="bold" color="green.600">{ordenProduccion.loteAsignado}</Text>
                            </Flex>
                        </Flex>
                    </CardBody>
                </Card>

                {/* Card: Datos del Ingreso */}
                <Card variant="outline">
                    <CardHeader pb={2}>
                        <Heading size="sm" color="green.600">Datos de Ingreso</Heading>
                    </CardHeader>
                    <Divider />
                    <CardBody>
                        {/* Unidades esperadas */}
                        <Stat mb={4} p={3} bg="blue.50" borderRadius="md">
                            <StatLabel color="blue.600" fontSize="xs" textTransform="uppercase">Unidades Planificadas</StatLabel>
                            <StatNumber fontSize="2xl" color="blue.700">
                                {loteSizeEsperado > 0 ? loteSizeEsperado : "—"}
                            </StatNumber>
                            {loteSizeEsperado > 0 && (
                                <Text fontSize="xs" color="blue.500">Según tamaño de lote de la categoría</Text>
                            )}
                        </Stat>

                        {/* Unidades reales que ingresan */}
                        <FormControl isInvalid={typeof cantidad === "number" && cantidad < 1} mb={4}>
                            <FormLabel fontWeight="semibold" fontSize="sm">
                                Unidades que ingresan al almacén <Text as="span" color="red.500">*</Text>
                            </FormLabel>
                            <NumberInput
                                min={1}
                                precision={0}
                                value={cantidad === "" ? "" : cantidad}
                                onChange={(_, valueAsNumber) => {
                                    if (isNaN(valueAsNumber)) {
                                        setCantidad("");
                                    } else {
                                        setCantidad(Math.floor(valueAsNumber));
                                    }
                                }}
                            >
                                <NumberInputField placeholder="Ingrese cantidad real" />
                                <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                </NumberInputStepper>
                            </NumberInput>
                            {typeof cantidad === "number" && cantidad < 1 && (
                                <FormErrorMessage>La cantidad debe ser mayor que cero.</FormErrorMessage>
                            )}
                            <FormHelperText fontSize="xs">Solo se permiten valores enteros mayores a 0.</FormHelperText>
                        </FormControl>

                        {/* Fecha de vencimiento */}
                        <FormControl isInvalid={!fechaValida}>
                            <FormLabel fontWeight="semibold" fontSize="sm">
                                Fecha de vencimiento <Text as="span" color="red.500">*</Text>
                            </FormLabel>
                            <Input
                                type="date"
                                value={fechaVencimiento}
                                onChange={(e) => setFechaVencimiento(e.target.value)}
                                min={new Date().toISOString().split("T")[0]}
                            />
                            {!fechaValida && (
                                <FormErrorMessage>Seleccione una fecha de vencimiento.</FormErrorMessage>
                            )}
                            <FormHelperText fontSize="xs">Por defecto: 2 años desde hoy. Ajuste si es necesario.</FormHelperText>
                        </FormControl>
                    </CardBody>
                </Card>
            </SimpleGrid>

            {/* Botones de navegación */}
            <Flex justify="space-between" mt={4}>
                <Button
                    leftIcon={<ArrowBackIcon />}
                    variant="outline"
                    onClick={handleAtras}
                >
                    Atrás
                </Button>
                <Button
                    rightIcon={<ArrowForwardIcon />}
                    colorScheme="blue"
                    onClick={handleSiguiente}
                    isDisabled={!puedeAvanzar}
                >
                    Siguiente
                </Button>
            </Flex>
        </Box>
    );
}
