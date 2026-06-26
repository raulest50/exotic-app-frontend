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
    FormControl,
    FormLabel,
    Heading,
    Icon,
    Input,
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
    fechaReporte: string;
    setFechaReporte: (fecha: string) => void;
    setActiveStep: (step: number) => void;
}

const COLUMN_INFO = [
    { col: "A", name: "producto_id", editable: false, desc: "Codigo del producto terminado" },
    { col: "B", name: "producto_nombre", editable: false, desc: "Nombre del producto terminado" },
    { col: "C", name: "categoria_nombre", editable: false, desc: "Categoria del terminado para ubicarlo rapido" },
    { col: "D", name: "cantidad_producida", editable: true, desc: "Unidades producidas en el dia; vacio equivale a cero" },
];

export default function IngresoTerminadosStep0_DescargarPlantilla({
    fechaReporte,
    setFechaReporte,
    setActiveStep,
}: Props) {
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
            let filename = "plantilla_reporte_produccion_terminados.xlsx";
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match && match[1]) filename = match[1].trim();
            }
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
                title: "Plantilla descargada",
                description: "Digite solo las cantidades producidas en la columna D.",
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
            <Text fontSize="sm" color="app.textSubtle" mb={5}>
                Use esta plantilla para reportar el consolidado diario de producto terminado. El archivo
                contiene todos los terminados de la planta agrupados por categoria.
            </Text>

            <VStack align="stretch" spacing={5}>
                <Card variant="outline">
                    <CardHeader pb={2}>
                        <Flex align="center" gap={2}>
                            <Icon as={FaFileExcel} color="green.500" boxSize={5} />
                            <Heading size="sm" color="green.700">Datos del reporte</Heading>
                        </Flex>
                    </CardHeader>
                    <Divider />
                    <CardBody>
                        <VStack align="stretch" spacing={4}>
                            <FormControl maxW={{ base: "full", md: "260px" }} isRequired>
                                <FormLabel>Fecha del reporte</FormLabel>
                                <Input
                                    type="date"
                                    value={fechaReporte}
                                    onChange={(event) => setFechaReporte(event.target.value)}
                                />
                            </FormControl>
                            <Text fontSize="sm">
                                La fecha se define aqui para evitar que el jefe de produccion tenga que editarla
                                fila por fila en Excel.
                            </Text>
                        </VStack>
                    </CardBody>
                </Card>

                <Card variant="outline">
                    <CardHeader pb={2}>
                        <Heading size="sm" color="teal.700">Instrucciones</Heading>
                    </CardHeader>
                    <Divider />
                    <CardBody>
                        <VStack align="stretch" spacing={3} fontSize="sm">
                            <Text><strong>1.</strong> Descargue la plantilla Excel.</Text>
                            <Text><strong>2.</strong> En Excel, diligencie unicamente la columna <strong>D (cantidad_producida)</strong>.</Text>
                            <Text><strong>3.</strong> Deje la celda vacia si ese terminado no tuvo produccion en el dia.</Text>
                            <Text><strong>4.</strong> No cambie codigos, nombres, categorias ni encabezados.</Text>
                        </VStack>
                    </CardBody>
                </Card>

                <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <AlertDescription fontSize="sm">
                        El archivo no registra inventario ni cierra ordenes de produccion. Esta primera version
                        prepara un reporte local para revisar cantidades y formatos futuros.
                    </AlertDescription>
                </Alert>

                <Box>
                    <Text fontWeight="semibold" mb={2}>Estructura del Excel</Text>
                    <TableContainer borderWidth="1px" borderRadius="md">
                        <Table size="sm" variant="simple">
                            <Thead bg="app.tableHeader">
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
                                                color={col.editable ? "green.600" : "app.textSubtle"}
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

                <Card variant="outline" borderColor="orange.200">
                    <CardHeader pb={2}>
                        <Heading size="sm" color="orange.600">Reglas de Validacion</Heading>
                    </CardHeader>
                    <Divider />
                    <CardBody>
                        <VStack align="stretch" spacing={2} fontSize="sm">
                            <Text><strong>cantidad_producida:</strong> acepta enteros mayores o iguales a cero.</Text>
                            <Text><strong>Celda vacia:</strong> se interpreta como cero unidades producidas.</Text>
                            <Text><strong>No permitido:</strong> decimales, negativos, texto, formulas o cambios en la estructura.</Text>
                        </VStack>
                    </CardBody>
                </Card>

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
                        isDisabled={!fechaReporte}
                    >
                        Siguiente
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
