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
    { col: "A", name: "producto_id", editable: false, desc: "Codigo del producto terminado" },
    { col: "B", name: "producto_nombre", editable: false, desc: "Nombre del producto" },
    { col: "C", name: "categoria_nombre", editable: false, desc: "Categoria del producto" },
    { col: "D", name: "tipo_unidades", editable: false, desc: "Unidad base reportada para el terminado" },
    { col: "E", name: "capacidad_productiva_diaria", editable: false, desc: "Capacidad diaria configurada para la categoria" },
    { col: "F", name: "cantidad_producida", editable: true, desc: "Unidades producidas en el dia; deje vacia si no hubo produccion" },
    { col: "G", name: "fecha_produccion", editable: true, desc: "Fecha del reporte diario" },
    { col: "H", name: "observaciones", editable: true, desc: "Notas opcionales para socializar el reporte" },
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
                description: "Complete las columnas F, G y H, luego suba el archivo en el siguiente paso.",
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
                Este asistente permite preparar el reporte diario consolidado de produccion de terminados
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
                                <strong>1.</strong> Descargue la plantilla Excel con todos los productos terminados.
                            </Text>
                            <Text>
                                <strong>2.</strong> Abra el archivo en Excel y complete la columna <strong>F (cantidad_producida)</strong> solo
                                para las referencias producidas en el dia.
                            </Text>
                            <Text>
                                <strong>3.</strong> Verifique la columna <strong>G (fecha_produccion)</strong>. Todas las filas reportadas
                                deben corresponder al mismo dia.
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
                        <strong>Solo las columnas F, G y H son editables.</strong> Las demas columnas contienen informacion
                        de referencia y no deben modificarse. Las filas sin cantidad producida se omiten del reporte.
                    </AlertDescription>
                </Alert>

                {/* Tabla de columnas */}
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

                {/* Reglas de validacion */}
                <Card variant="outline" borderColor="orange.200">
                    <CardHeader pb={2}>
                        <Heading size="sm" color="orange.600">Reglas de Validacion</Heading>
                    </CardHeader>
                    <Divider />
                    <CardBody>
                        <VStack align="stretch" spacing={2} fontSize="sm">
                            <Text>
                                <strong>cantidad_producida:</strong> Debe ser un numero entero mayor o igual a 1.
                                Las filas vacias no se incluyen en el reporte.
                            </Text>
                            <Text>
                                <strong>fecha_produccion:</strong> Debe ser una fecha valida en formato YYYY-MM-DD.
                                Todas las filas producidas deben tener la misma fecha.
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
