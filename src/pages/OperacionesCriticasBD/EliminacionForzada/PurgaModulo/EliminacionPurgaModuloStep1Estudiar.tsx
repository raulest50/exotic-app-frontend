import {
    Alert,
    AlertDescription,
    AlertIcon,
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
import { useEffect, useMemo, useState } from "react";
import EndPointsURL from "../../../../api/EndPointsURL";
import type { PurgaModuloProductosSummaryDTO } from "../types";

interface EliminacionPurgaModuloStep1EstudiarProps {
    setActiveStep: (step: number) => void;
    setStudyResultPurga: (result: PurgaModuloProductosSummaryDTO | null) => void;
    studyResultPurga: PurgaModuloProductosSummaryDTO | null;
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

export default function EliminacionPurgaModuloStep1Estudiar({
    setActiveStep,
    setStudyResultPurga,
    studyResultPurga,
}: EliminacionPurgaModuloStep1EstudiarProps) {
    const [isLoading, setIsLoading] = useState(true);
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const toast = useToast();

    useEffect(() => {
        const fetchStudy = async () => {
            setIsLoading(true);
            try {
                const response = await axios.get<PurgaModuloProductosSummaryDTO>(
                    endpoints.estudiar_purga_modulo_productos,
                    { withCredentials: true }
                );
                setStudyResultPurga(response.data);
            } catch (error) {
                console.error("Error al estudiar purga", error);
                const message =
                    axios.isAxiosError(error) && error.response?.data?.message
                        ? String(error.response.data.message)
                        : "No se pudo obtener el estudio de la purga.";
                toast({
                    title: "Error",
                    description: message,
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchStudy();
        // toast excluido intencionalmente: useToast() puede cambiar ref cada render y causar bucle de requests
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endpoints, setStudyResultPurga]);

    const handleContinuar = () => {
        setActiveStep(2);
    };

    if (isLoading) {
        return (
            <Box>
                <Text color="gray.600">Cargando estudio de la purga...</Text>
            </Box>
        );
    }

    if (!studyResultPurga) {
        return (
            <Box>
                <Text color="gray.600">No se pudo cargar el estudio. Reintente más tarde.</Text>
                <Button variant="outline" mt={4} onClick={() => setActiveStep(0)}>
                    Volver
                </Button>
            </Box>
        );
    }

    const { permitido, mensajeEntorno } = studyResultPurga;

    return (
        <VStack align="stretch" spacing={6}>
            <Heading size="md" color="red.700">
                Purga Completa Módulo Productos
            </Heading>

            <Alert status="info">
                <AlertIcon />
                <AlertDescription>
                    Esta funcionalidad permite eliminar <strong>todas</strong> las entidades
                    relacionadas con el módulo de productos: transacciones de almacén, movimientos,
                    lotes, órdenes de compra y producción, insumos, recetas, procesos de producción,
                    case packs, y productos (materiales, semiterminados y terminados). Las entidades
                    de otros módulos como usuarios, vendedores, proveedores, categorías y áreas de
                    producción <strong>no se verán afectadas</strong>.
                </AlertDescription>
            </Alert>

            <Alert status="success">
                <AlertIcon />
                <AlertDescription>
                    <strong>Seguridad:</strong> Esta funcionalidad únicamente está disponible en
                    entornos de desarrollo local (localhost) y entorno de pruebas remotas (staging).
                    <strong> No está disponible en el entorno de producción</strong>, por lo que sus
                    datos reales en producción no corren ningún riesgo.
                </AlertDescription>
            </Alert>

            <Text color="gray.600" fontSize="sm">
                Entorno actual: {mensajeEntorno}
            </Text>

            {!permitido && (
                <Alert status="error">
                    <AlertIcon />
                    <AlertDescription>
                        La purga no está permitida en el entorno actual (producción). Esta
                        operación solo se puede ejecutar en entornos de desarrollo o pruebas.
                    </AlertDescription>
                </Alert>
            )}

            <Box>
                <Heading size="sm" mb={2}>
                    Resumen de entidades a eliminar
                </Heading>
                <Table size="sm" variant="simple">
                    <Thead>
                        <Tr>
                            <Th>Entidad</Th>
                            <Th isNumeric>Cantidad</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {ENTITY_LABELS.map(({ key, label }) => {
                            const val = studyResultPurga[key];
                            return (
                                <Tr key={key}>
                                    <Td>{label}</Td>
                                    <Td isNumeric>
                                        {typeof val === "number" ? val.toLocaleString() : "-"}
                                    </Td>
                                </Tr>
                            );
                        })}
                    </Tbody>
                </Table>
            </Box>

            <Flex gap={3} w="full" justify="space-between">
                <Button variant="outline" onClick={() => setActiveStep(0)}>
                    Atrás
                </Button>
                <Button
                    colorScheme="red"
                    onClick={handleContinuar}
                    isDisabled={!permitido}
                >
                    Continuar y ejecutar purga
                </Button>
            </Flex>
        </VStack>
    );
}
