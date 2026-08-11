import {
    Box,
    Button,
    Flex,
    Table,
    Text,
    VStack,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from "axios";
import { useMemo, useState } from "react";
import EndPointsURL from "../../../../../api/EndPointsURL";

interface SinInsumosStep1InformacionProps {
    setActiveStep: (step: number) => void;
}

const EXAMPLE_ROWS = [
    {
        producto_id: "EJEMPLOTER01",
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
    const toast = useAppToast();
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
            <VStack align="stretch" gap={6}>
                <Text>
                    Se descargara una plantilla Excel con dos hojas: <strong>Valores permitidos</strong> y <strong>Datos</strong>.
                </Text>
                <Text>
                    <strong>Obligatorios:</strong> producto_id, nombre, costo, iva_percentual (0, 5 o 19), tipo_unidades (L, KG o U), cantidad_unidad y status (0 = activo, 1 = obsoleto).
                </Text>
                <Text>
                    <strong>Formato de producto_id:</strong> use letras y numeros en mayusculas. Tambien se aceptan celdas numericas si son enteros sin decimales. No se aceptan espacios, puntos, guiones ni guion bajo.
                </Text>
                <Text>
                    <strong>Opcionales:</strong> observaciones, stock_minimo, categoria_id, foto_url y prefijo_lote (unico entre terminados).
                </Text>

                <Text fontWeight="semibold" mt={2}>
                    Ejemplos de filas validas
                </Text>
                <Table.ScrollArea borderWidth="1px" borderRadius="md" overflowX="auto">
                    <Table.Root size="sm" variant="line">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>producto_id</Table.ColumnHeader>
                                <Table.ColumnHeader>nombre</Table.ColumnHeader>
                                <Table.ColumnHeader>costo</Table.ColumnHeader>
                                <Table.ColumnHeader>iva_%</Table.ColumnHeader>
                                <Table.ColumnHeader>tipo_unid</Table.ColumnHeader>
                                <Table.ColumnHeader>status</Table.ColumnHeader>
                                <Table.ColumnHeader>categoria_id</Table.ColumnHeader>
                                <Table.ColumnHeader>prefijo_lote</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {EXAMPLE_ROWS.map((row, idx) => (
                                <Table.Row key={idx}>
                                    <Table.Cell>{row.producto_id}</Table.Cell>
                                    <Table.Cell>{row.nombre}</Table.Cell>
                                    <Table.Cell>{row.costo}</Table.Cell>
                                    <Table.Cell>{row.iva_percentual}</Table.Cell>
                                    <Table.Cell>{row.tipo_unidades}</Table.Cell>
                                    <Table.Cell>{row.status}</Table.Cell>
                                    <Table.Cell>{row.categoria_id}</Table.Cell>
                                    <Table.Cell>{row.prefijo_lote}</Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Table.ScrollArea>

                <Flex gap={4} wrap="wrap">
                    <Button
                        colorPalette="teal"
                        onClick={handleDownloadTemplate}
                        loading={isDownloading}
                        loadingText="Descargando..."
                    >
                        Descargar plantilla Excel (.xlsx)
                    </Button>
                    <Button colorPalette="blue" onClick={() => setActiveStep(1)}>
                        Siguiente
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
