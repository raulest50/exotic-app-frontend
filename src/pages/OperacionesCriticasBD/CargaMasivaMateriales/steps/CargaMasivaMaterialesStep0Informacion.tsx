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
    const toast = useAppToast();
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
            <VStack align="stretch" gap={6}>
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
                <Table.ScrollArea borderWidth="1px" borderRadius="md" overflowX="auto">
                    <Table.Root size="sm" variant="line">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>producto_id</Table.ColumnHeader>
                                <Table.ColumnHeader>nombre</Table.ColumnHeader>
                                <Table.ColumnHeader>costo</Table.ColumnHeader>
                                <Table.ColumnHeader>iva_%</Table.ColumnHeader>
                                <Table.ColumnHeader>tipo_unid</Table.ColumnHeader>
                                <Table.ColumnHeader>cant_unid</Table.ColumnHeader>
                                <Table.ColumnHeader>tipo_mat</Table.ColumnHeader>
                                <Table.ColumnHeader>punto_reorden</Table.ColumnHeader>
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
                                    <Table.Cell>{row.cantidad_unidad}</Table.Cell>
                                    <Table.Cell>{row.tipo_material}</Table.Cell>
                                    <Table.Cell>{row.punto_reorden}</Table.Cell>
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
                        loadingText="Descargando…"
                    >
                        Descargar plantilla Excel
                    </Button>
                    <Button colorPalette="blue" onClick={() => setActiveStep(1)}>
                        Siguiente
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
