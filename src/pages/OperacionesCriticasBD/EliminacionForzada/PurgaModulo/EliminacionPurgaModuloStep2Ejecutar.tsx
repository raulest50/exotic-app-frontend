import {
    Steps,
    Alert,
    Box,
    Button,
    Flex,
    Heading,
    Table,
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
import type { PurgaModuloProductosSummaryDTO } from "../types";

interface EliminacionPurgaModuloStep2EjecutarProps {
    setActiveStep: (step: number) => void;
    studyResultPurga: PurgaModuloProductosSummaryDTO | null;
    onReset: () => void;
}

const ENTITY_LABELS: { key: keyof PurgaModuloProductosSummaryDTO; label: string }[] = [
    { key: "transaccionesAlmacen", label: "Transacciones de almacén" },
    { key: "movimientos", label: "Movimientos" },
    { key: "lotes", label: "Lotes" },
    { key: "ordenesCompra", label: "Órdenes de compra" },
    { key: "ordenesProduccion", label: "Órdenes de producción" },
    { key: "insumos", label: "Insumos (recetas)" },
    { key: "procesosProduccionCompleto", label: "Procesos de producción completos" },
    { key: "casePacks", label: "Case packs" },
    { key: "insumosEmpaque", label: "Insumos de empaque" },
    { key: "manufacturingVersions", label: "Versiones de manufactura" },
    { key: "productos", label: "Productos" },
];

export default function EliminacionPurgaModuloStep2Ejecutar({
    setActiveStep,
    studyResultPurga,
    onReset,
}: EliminacionPurgaModuloStep2EjecutarProps) {
    const [isExecuting, setIsExecuting] = useState(false);
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const toast = useToast();

    const handleEjecutarPurga = async () => {
        if (!studyResultPurga?.permitido) return;
        setIsExecuting(true);
        try {
            await axios.delete(endpoints.ejecutar_purga_modulo_productos, {
                withCredentials: true,
            });
            toast({
                title: "Purga ejecutada correctamente",
                description:
                    "Todas las entidades del módulo de productos han sido eliminadas. Las entidades de otros módulos permanecen intactas.",
                status: "success",
                duration: 6000,
                isClosable: true,
            });
            onReset();
        } catch (error) {
            console.error("Error al ejecutar purga", error);
            const message =
                axios.isAxiosError(error) && error.response?.data?.message
                    ? String(error.response.data.message)
                    : "No se pudo ejecutar la purga.";
            toast({
                title: "Error",
                description: message,
                status: "error",
                duration: 6000,
                isClosable: true,
            });
        } finally {
            setIsExecuting(false);
        }
    };

    if (!studyResultPurga) {
        return (
            <Box>
                <Text color="app.textMuted">No hay datos del estudio. Regrese al paso anterior.</Text>
                <Button variant="outline" mt={4} onClick={() => setActiveStep(1)}>
                    Atrás
                </Button>
            </Box>
        );
    }

    const { permitido } = studyResultPurga;

    return (
        <VStack align="stretch" gap={6}>
            <Heading size="md" color="red.700">
                Confirmar ejecución de la purga
            </Heading>

            <Alert.Root status="warning">
                <Alert.Indicator />
                <Alert.Description>
                    Está a punto de eliminar <strong>permanentemente</strong> todas las entidades
                    listadas a continuación. Esta acción no se puede deshacer. Asegúrese de que está
                    en un entorno de desarrollo o pruebas.
                </Alert.Description>
            </Alert.Root>

            <Box>
                <Heading size="sm" mb={2}>
                    Resumen de entidades a eliminar
                </Heading>
                <Table.Root size="sm" variant="simple">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader>Entidad</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign='end'>Cantidad</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {ENTITY_LABELS.map(({ key, label }) => {
                            const val = studyResultPurga[key];
                            return (
                                <Table.Row key={key}>
                                    <Table.Cell>{label}</Table.Cell>
                                    <Table.Cell textAlign='end'>
                                        {typeof val === "number" ? val.toLocaleString() : "-"}
                                    </Table.Cell>
                                </Table.Row>
                            );
                        })}
                    </Table.Body>
                </Table.Root>
            </Box>

            <Flex gap={3} w="full" justify="space-between">
                <Button variant="outline" onClick={() => setActiveStep(1)}>
                    Atrás
                </Button>
                <Button
                    colorPalette="red"
                    onClick={handleEjecutarPurga}
                    disabled={!permitido}
                    loading={isExecuting}
                    loadingText="Ejecutando purga..."
                >
                    Ejecutar purga completa
                </Button>
            </Flex>
        </VStack>
    );
}
