import {
    Alert,
    AlertDescription,
    AlertIcon,
    Box,
    Button,
    Card,
    CardBody,
    CardHeader,
    Divider,
    Flex,
    Heading,
    Icon,
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
import { ArrowForwardIcon, DownloadIcon } from "@chakra-ui/icons";
import { FaFileExcel } from "react-icons/fa6";
import axios from "axios";
import { useMemo, useState } from "react";
import EndPointsURL from "../../../api/EndPointsURL";

interface Props {
    setActiveStep: (step: number) => void;
}

const COLUMN_INFO = [
    { col: "A", name: "lote_asignado", editable: false, desc: "Identificador del lote (ej: LAC-0042-25)" },
    { col: "B", name: "orden_id", editable: false, desc: "ID interno de la orden de produccion" },
    { col: "C", name: "producto_id", editable: false, desc: "Codigo del producto terminado" },
    { col: "D", name: "producto_nombre", editable: false, desc: "Nombre del producto" },
    { col: "E", name: "categoria_nombre", editable: false, desc: "Categoria del producto" },
    { col: "F", name: "cantidad_esperada", editable: false, desc: "Unidades esperadas (de Categoria.loteSize)" },
    { col: "G", name: "cantidad_ingresada", editable: true, desc: "Unidades reales a ingresar (usuario llena)" },
    { col: "H", name: "fecha_vencimiento", editable: true, desc: "Fecha de vencimiento (pre-llenada: hoy + 2 anios)" },
];

export default function IngresoTerminadosStep0_DescargarPlantilla({ setActiveStep }: Props) {
    const toast = useToast();
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadTemplate = async () => {
        setIsDownloading(true);
        try {
            const response = await axios.get(endpoints.ingreso_terminados_plantilla, {
                withCredentials: true,
                responseType: "blob",
            });

            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;

            const contentDisposition = response.headers["content-disposition"];
            let filename = "plantilla_ingreso_terminados.xlsx";
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?(.+)"?/);
                if (match && match[1]) filename = match[1].trim();
            }
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
                title: "Plantilla descargada",
                description: "Complete las columnas G y H, luego suba el archivo en el siguiente paso.",
                status: "success",
                duration: 5000,
                isClosable: true,
            });
        } catch (error) {
            const message = axios.isAxiosError(error)
                ? error.response?.data?.message || error.message
                : (error as Error).message;
            toast({
                title: "Error al descargar plantilla",
                description: message,
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <Box>
            <Heading size="md" mb={4}>Descargar Plantilla Excel</Heading>
            <Text fontSize="sm" color="gray.500" mb={5}>
                Este asistente permite registrar multiples ingresos de producto terminado de forma masiva
                usando una plantilla Excel.
            </Text>

            <VStack align="stretch" spacing={5}>
                {/* Card de instrucciones */}
                <Card variant="outline">
                    <CardHeader pb={2}>
                        <Flex align="center" gap={2}>
                            <Icon as={FaFileExcel} color="green.500" boxSize={5} />
                            <Heading size="sm" color="green.700">Instrucciones</Heading>
                        </Flex>
                    </CardHeader>
                    <Divider />
                    <CardBody>
                        <VStack align="stretch" spacing={3} fontSize="sm">
                            <Text>
                                <strong>1.</strong> Descargue la plantilla Excel con las ordenes de produccion pendientes.
                            </Text>
                            <Text>
                                <strong>2.</strong> Abra el archivo en Excel y complete la columna <strong>G (cantidad_ingresada)</strong> con
                                las unidades reales producidas para cada orden.
                            </Text>
                            <Text>
                                <strong>3.</strong> Opcionalmente, modifique la columna <strong>H (fecha_vencimiento)</strong> si necesita
                                una fecha diferente a la predeterminada (hoy + 2 anios).
                            </Text>
                            <Text>
                                <strong>4.</strong> Guarde el archivo y regrese al sistema para subirlo en el siguiente paso.
                            </Text>
                        </VStack>
                    </CardBody>
                </Card>

                {/* Alerta de columnas editables */}
                <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <AlertDescription fontSize="sm">
                        <strong>Solo las columnas G y H son editables.</strong> Las demas columnas contienen informacion
                        de referencia y no deben modificarse. Si se alteran, la validacion fallara.
                    </AlertDescription>
                </Alert>

                {/* Tabla de columnas */}
                <Box>
                    <Text fontWeight="semibold" mb={2}>Estructura del Excel</Text>
                    <TableContainer borderWidth="1px" borderRadius="md">
                        <Table size="sm" variant="simple">
                            <Thead bg="gray.50">
                                <Tr>
                                    <Th>Columna</Th>
                                    <Th>Nombre</Th>
                                    <Th>Editable</Th>
                                    <Th>Descripcion</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {COLUMN_INFO.map((col) => (
                                    <Tr key={col.col} bg={col.editable ? "green.50" : undefined}>
                                        <Td fontWeight="bold">{col.col}</Td>
                                        <Td fontFamily="mono" fontSize="xs">{col.name}</Td>
                                        <Td>
                                            <Text
                                                color={col.editable ? "green.600" : "gray.500"}
                                                fontWeight={col.editable ? "bold" : "normal"}
                                            >
                                                {col.editable ? "SI" : "NO"}
                                            </Text>
                                        </Td>
                                        <Td fontSize="xs">{col.desc}</Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    </TableContainer>
                </Box>

                {/* Reglas de validacion */}
                <Card variant="outline" borderColor="orange.200">
                    <CardHeader pb={2}>
                        <Heading size="sm" color="orange.600">Reglas de Validacion</Heading>
                    </CardHeader>
                    <Divider />
                    <CardBody>
                        <VStack align="stretch" spacing={2} fontSize="sm">
                            <Text>
                                <strong>cantidad_ingresada:</strong> Debe ser un numero entero mayor o igual a 1,
                                y estar dentro del ±20% del valor esperado.
                            </Text>
                            <Text>
                                <strong>fecha_vencimiento:</strong> Debe ser una fecha valida en formato YYYY-MM-DD
                                y posterior a la fecha actual.
                            </Text>
                        </VStack>
                    </CardBody>
                </Card>

                {/* Botones de accion */}
                <Flex gap={4} wrap="wrap" justify="space-between">
                    <Button
                        leftIcon={<DownloadIcon />}
                        colorScheme="teal"
                        onClick={handleDownloadTemplate}
                        isLoading={isDownloading}
                        loadingText="Descargando..."
                    >
                        Descargar Plantilla Excel
                    </Button>
                    <Button
                        rightIcon={<ArrowForwardIcon />}
                        colorScheme="blue"
                        onClick={() => setActiveStep(1)}
                    >
                        Siguiente
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
