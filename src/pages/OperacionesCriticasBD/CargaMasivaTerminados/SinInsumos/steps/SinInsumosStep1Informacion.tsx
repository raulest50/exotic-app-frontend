import {
    Box,
    Button,
    Flex,
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
import axios from "axios";
import { useMemo, useState } from "react";
import EndPointsURL from "../../../../../api/EndPointsURL";

interface SinInsumosStep1InformacionProps {
    setActiveStep: (step: number) => void;
}

const EXAMPLE_ROWS = [
    {
        producto_id: "EJEMPLO_TER01",
        nombre: "Terminado ejemplo",
        costo: 150,
        iva_percentual: 19,
        tipo_unidades: "U",
        cantidad_unidad: 1,
        status: 0,
        categoria_id: 1,
        prefijo_lote: "TRA",
    },
];

export default function SinInsumosStep1Informacion({ setActiveStep }: SinInsumosStep1InformacionProps) {
    const toast = useToast();
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadTemplate = async () => {
        setIsDownloading(true);
        try {
            const response = await axios.get(endpoints.carga_masiva_terminados_template_sin_insumos, {
                withCredentials: true,
                responseType: "blob",
            });

            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;

            const contentDisposition = response.headers["content-disposition"];
            let filename = "plantilla_carga_masiva_terminados_sin_insumos.xlsx";
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?(.+)"?/);
                if (match && match[1]) {
                    filename = match[1].trim();
                }
            }

            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
                title: "Plantilla descargada",
                description: "Complete la hoja 'Datos' y suba el archivo .xlsx en el siguiente paso. Use la hoja 'Valores permitidos' para ver categorias validas.",
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
        <Box p={4}>
            <VStack align="stretch" spacing={6}>
                <Text>
                    Se descargara una plantilla Excel con dos hojas: <strong>Valores permitidos</strong> y <strong>Datos</strong>.
                </Text>
                <Text>
                    <strong>Obligatorios:</strong> producto_id, nombre, costo, iva_percentual (0, 5 o 19), tipo_unidades (L, KG o U), cantidad_unidad y status (0 = activo, 1 = obsoleto).
                </Text>
                <Text>
                    <strong>Formato de producto_id:</strong> escribalo como texto en Excel, solo con letras y numeros en mayusculas. No se aceptan celdas numericas, espacios, puntos, guiones ni guion bajo.
                </Text>
                <Text>
                    <strong>Opcionales:</strong> observaciones, stock_minimo, categoria_id, foto_url y prefijo_lote (unico entre terminados).
                </Text>

                <Text fontWeight="semibold" mt={2}>
                    Ejemplos de filas validas
                </Text>
                <TableContainer borderWidth="1px" borderRadius="md" overflowX="auto">
                    <Table size="sm" variant="simple">
                        <Thead>
                            <Tr>
                                <Th>producto_id</Th>
                                <Th>nombre</Th>
                                <Th>costo</Th>
                                <Th>iva_%</Th>
                                <Th>tipo_unid</Th>
                                <Th>status</Th>
                                <Th>categoria_id</Th>
                                <Th>prefijo_lote</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {EXAMPLE_ROWS.map((row, idx) => (
                                <Tr key={idx}>
                                    <Td>{row.producto_id}</Td>
                                    <Td>{row.nombre}</Td>
                                    <Td>{row.costo}</Td>
                                    <Td>{row.iva_percentual}</Td>
                                    <Td>{row.tipo_unidades}</Td>
                                    <Td>{row.status}</Td>
                                    <Td>{row.categoria_id}</Td>
                                    <Td>{row.prefijo_lote}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </TableContainer>

                <Flex gap={4} wrap="wrap">
                    <Button
                        colorScheme="teal"
                        onClick={handleDownloadTemplate}
                        isLoading={isDownloading}
                        loadingText="Descargando..."
                    >
                        Descargar plantilla Excel (.xlsx)
                    </Button>
                    <Button colorScheme="blue" onClick={() => setActiveStep(1)}>
                        Siguiente
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
