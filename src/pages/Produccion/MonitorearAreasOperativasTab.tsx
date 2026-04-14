import { useEffect, useState } from "react";
import axios from "axios";
import {
    Alert,
    AlertIcon,
    Box,
    Flex,
    Heading,
    Spinner,
    Table,
    TableContainer,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    VStack,
} from "@chakra-ui/react";

import EndPointsURL from "../../api/EndPointsURL.tsx";

interface ResponsableAreaResumen {
    id: number;
    username: string;
    nombreCompleto: string | null;
}

interface AreaOperativaMonitoreo {
    areaId: number;
    nombre: string;
    descripcion: string | null;
    responsableArea: ResponsableAreaResumen;
}

const endPoints = new EndPointsURL();

export default function MonitorearAreasOperativasTab() {
    const [areas, setAreas] = useState<AreaOperativaMonitoreo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAreas = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await axios.get<AreaOperativaMonitoreo[]>(
                    endPoints.monitoreo_areas_operativas,
                    { withCredentials: true },
                );
                setAreas(response.data ?? []);
            } catch (err: any) {
                const message =
                    err.response?.data?.message ||
                    err.message ||
                    "No fue posible cargar las areas operativas.";
                setError(message);
                setAreas([]);
            } finally {
                setLoading(false);
            }
        };

        void fetchAreas();
    }, []);

    return (
        <VStack align="stretch" spacing={4}>
            <Box p={6} bg="white" borderRadius="md" boxShadow="sm">
                <VStack align="start" spacing={1}>
                    <Heading size="md">Monitorear Areas Operativas</Heading>
                    <Text color="gray.600">
                        Listado actual de areas operativas con lider asignado.
                    </Text>
                </VStack>
            </Box>

            {loading ? (
                <Flex justify="center" align="center" py={10}>
                    <Spinner size="xl" />
                </Flex>
            ) : null}

            {!loading && error ? (
                <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    {error}
                </Alert>
            ) : null}

            {!loading && !error && areas.length === 0 ? (
                <Box p={6} bg="white" borderRadius="md" boxShadow="sm">
                    <Text color="gray.600">
                        No hay areas operativas monitoreables por ahora.
                    </Text>
                </Box>
            ) : null}

            {!loading && !error && areas.length > 0 ? (
                <Box bg="white" borderRadius="md" boxShadow="sm" overflowX="auto">
                    <TableContainer>
                        <Table variant="simple" size="sm">
                            <Thead>
                                <Tr>
                                    <Th>Area</Th>
                                    <Th>Descripcion</Th>
                                    <Th>Lider</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {areas.map((area) => (
                                    <Tr key={area.areaId}>
                                        <Td>{area.nombre}</Td>
                                        <Td>
                                            <Text noOfLines={2} maxW="320px">
                                                {area.descripcion || "Sin descripcion"}
                                            </Text>
                                        </Td>
                                        <Td>
                                            {area.responsableArea.nombreCompleto || area.responsableArea.username}
                                        </Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    </TableContainer>
                </Box>
            ) : null}
        </VStack>
    );
}
