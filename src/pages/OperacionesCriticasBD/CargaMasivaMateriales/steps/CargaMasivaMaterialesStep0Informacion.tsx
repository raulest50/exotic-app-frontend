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
import EndPointsURL from "../../../../api/EndPointsURL";

interface CargaMasivaMaterialesStep0InformacionProps {
    setActiveStep: (step: number) => void;
}

const EXAMPLE_ROWS = [
    {
        producto_id: "EJEMPLO_MP01",
        nombre: "Materia prima ejemplo",
        observaciones: "",
        costo: 100,
        iva_percentual: 19,
        tipo_unidades: "KG",
        cantidad_unidad: 1,
        stock_minimo: 0,
        ficha_tecnica_url: "",
        tipo_material: 1,
        punto_reorden: -1,
    },
    {
        producto_id: "EJEMPLO_EMP02",
        nombre: "Material de empaque ejemplo",
        observaciones: "",
        costo: 50,
        iva_percentual: 5,
        tipo_unidades: "U",
        cantidad_unidad: 1,
        stock_minimo: 0,
        ficha_tecnica_url: "",
        tipo_material: 2,
        punto_reorden: -1,
    },
];

export default function CargaMasivaMaterialesStep0Informacion({ setActiveStep }: CargaMasivaMaterialesStep0InformacionProps) {
    const toast = useToast();
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadTemplate = async () => {
        setIsDownloading(true);
        try {
            const response = await axios.get(endpoints.carga_masiva_materiales_template, {
                withCredentials: true,
                responseType: "blob",
            });

            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;

            const contentDisposition = response.headers["content-disposition"];
            let filename = "plantilla_carga_masiva_materiales.xlsx";
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
                description: "Complete las columnas y suba el archivo en el siguiente paso.",
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
                    Se descargará una plantilla Excel vacía para registrar materiales (ROH) en bloque. Todos los materiales de esta carga se consideran <strong>inventariables</strong>.
                </Text>
                <Text>
                    <strong>Obligatorios:</strong> producto_id, nombre, costo, iva_percentual (0, 5 o 19), tipo_unidades (L, KG o U), cantidad_unidad, tipo_material (1 = Materia Prima, 2 = Material de Empaque).
                </Text>
                <Text>
                    <strong>Opcionales:</strong> observaciones, stock_minimo, ficha_tecnica_url, punto_reorden (-1 para ignorar alertas).
                </Text>

                <Text fontWeight="semibold" mt={2}>
                    Ejemplos de filas válidas (solo referencia)
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
                                <Th>cant_unid</Th>
                                <Th>tipo_mat</Th>
                                <Th>punto_reorden</Th>
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
                                    <Td>{row.cantidad_unidad}</Td>
                                    <Td>{row.tipo_material}</Td>
                                    <Td>{row.punto_reorden}</Td>
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
                        loadingText="Descargando…"
                    >
                        Descargar plantilla Excel
                    </Button>
                    <Button colorScheme="blue" onClick={() => setActiveStep(1)}>
                        Siguiente
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
