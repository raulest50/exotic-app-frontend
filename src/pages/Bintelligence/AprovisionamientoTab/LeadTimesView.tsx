import {
    Box,
    Button,
    Card,
    CardBody,
    Flex,
    HStack,
    IconButton,
    Select,
    Spinner,
    Stack,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tooltip,
    Tr,
    useDisclosure,
    useToast,
} from "@chakra-ui/react";
import { QuestionIcon } from "@chakra-ui/icons";
import { useEffect, useState } from "react";
import axios from "axios";
import BetterPagination from "../../../components/BetterPagination/BetterPagination.tsx";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import type { Material } from "../../Productos/types.tsx";
import LeadTimeDetailDrawer from "./LeadTimeDetailDrawer.tsx";
import LeadTimesRankingHelpModal from "./LeadTimesRankingHelpModal.tsx";
import type {
    LeadTimeDirection,
    LeadTimeProveedorMaterialDTO,
    LeadTimeProveedorMaterialPageRowDTO,
    SpringPage,
} from "./types.ts";
import { formatNumber } from "./utils.ts";

type Props = {
    selectedMaterial: Material | null;
    fechaCorte: string;
    ventanaDias: number;
};

const endPoints = new EndPointsURL();

export default function LeadTimesView({ selectedMaterial, fechaCorte, ventanaDias }: Props) {
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const {
        isOpen: isHelpOpen,
        onOpen: onHelpOpen,
        onClose: onHelpClose,
    } = useDisclosure();
    const [direction, setDirection] = useState<LeadTimeDirection>("asc");
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [rows, setRows] = useState<LeadTimeProveedorMaterialPageRowDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detail, setDetail] = useState<LeadTimeProveedorMaterialDTO | null>(null);
    const [selectedRow, setSelectedRow] = useState<LeadTimeProveedorMaterialPageRowDTO | null>(null);

    const fetchRanking = async (pageNumber: number = page, pageSize: number = size) => {
        if (!selectedMaterial) {
            setRows([]);
            setTotalPages(0);
            return;
        }

        setLoading(true);
        try {
            const url = endPoints.biMaterialLeadTimes(
                selectedMaterial.productoId,
                fechaCorte,
                ventanaDias,
                pageNumber,
                pageSize,
                direction
            );
            const response = await axios.get<SpringPage<LeadTimeProveedorMaterialPageRowDTO>>(url);
            setRows(response.data.content ?? []);
            setPage(response.data.number ?? pageNumber);
            setSize(response.data.size ?? pageSize);
            setTotalPages(response.data.totalPages ?? 0);
        } catch (error) {
            console.error("Error loading lead time ranking:", error);
            setRows([]);
            setTotalPages(0);
            toast({
                title: "Error",
                description: "No se pudo cargar el ranking de lead times.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const openDetail = async (row: LeadTimeProveedorMaterialPageRowDTO) => {
        if (!selectedMaterial) return;
        setSelectedRow(row);
        setDetail(null);
        setDetailLoading(true);
        onOpen();
        try {
            const url = endPoints.biProveedorLeadTime(
                row.proveedorId,
                selectedMaterial.productoId,
                fechaCorte,
                ventanaDias
            );
            const response = await axios.get<LeadTimeProveedorMaterialDTO>(url);
            setDetail(response.data);
        } catch (error) {
            console.error("Error loading lead time detail:", error);
            toast({
                title: "Error",
                description: "No se pudo cargar el detalle del lead time.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            onClose();
        } finally {
            setDetailLoading(false);
        }
    };

    useEffect(() => {
        setPage(0);
        setRows([]);
        setTotalPages(0);
        setDetail(null);
        setSelectedRow(null);
        onClose();
    }, [selectedMaterial?.productoId, fechaCorte, ventanaDias, onClose]);

    useEffect(() => {
        if (!selectedMaterial) return;
        fetchRanking(0, size);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMaterial?.productoId, fechaCorte, ventanaDias, direction]);

    if (!selectedMaterial) {
        return (
            <Card variant="outline">
                <CardBody>
                    <Text color="gray.600">Seleccione un material para estudiar lead times de aprovisionamiento.</Text>
                </CardBody>
            </Card>
        );
    }

    return (
        <Stack spacing={4}>
            <Card variant="outline">
                <CardBody>
                    <Flex justify="space-between" align={{ base: "stretch", md: "center" }} gap={4} direction={{ base: "column", md: "row" }}>
                        <Box>
                            <HStack spacing={2} align="center">
                                <Text fontWeight="semibold">Ranking de proveedores para {selectedMaterial.nombre}</Text>
                                <Tooltip label="Explicacion de columnas y criterios del ranking">
                                    <IconButton
                                        aria-label="Ayuda del ranking de lead times"
                                        icon={<QuestionIcon />}
                                        size="sm"
                                        variant="outline"
                                        colorScheme="blue"
                                        onClick={onHelpOpen}
                                    />
                                </Tooltip>
                            </HStack>
                            <Text fontSize="sm" color="gray.600">
                                Ordena por lead time ajustado, que combina rapidez observada y confiabilidad del historico.
                            </Text>
                        </Box>
                        <HStack>
                            <Text fontSize="sm">Orden:</Text>
                            <Select
                                value={direction}
                                onChange={(e) => setDirection(e.target.value as LeadTimeDirection)}
                                width="180px"
                            >
                                <option value="asc">Mejores primero</option>
                                <option value="desc">Peores primero</option>
                            </Select>
                            <Button colorScheme="blue" variant="outline" onClick={() => fetchRanking(page, size)} isLoading={loading}>
                                Refrescar
                            </Button>
                        </HStack>
                    </Flex>
                </CardBody>
            </Card>

            <Card variant="outline">
                <CardBody>
                    {loading ? (
                        <Stack align="center" py={10}>
                            <Spinner />
                            <Text color="gray.600">Cargando ranking de lead times...</Text>
                        </Stack>
                    ) : rows.length === 0 ? (
                        <Text color="gray.600">
                            No hay historico suficiente para ranking de este material.
                        </Text>
                    ) : (
                        <Stack spacing={4}>
                            <Box overflowX="auto">
                                <Table variant="striped" size="sm">
                                    <Thead>
                                        <Tr>
                                            <Th>Proveedor ID</Th>
                                            <Th>Proveedor</Th>
                                            <Th isNumeric>Lead time 1ra recepcion</Th>
                                            <Th isNumeric>Lead time recepcion completa</Th>
                                            <Th isNumeric>Confianza 1ra recepcion</Th>
                                            <Th isNumeric>Confianza recepcion completa</Th>
                                            <Th isNumeric>Observaciones 1ra recepcion</Th>
                                            <Th isNumeric>Observaciones recepcion completa</Th>
                                            <Th isNumeric>Ordenes</Th>
                                            <Th isNumeric>Lead time ajustado</Th>
                                            <Th>Accion</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {rows.map((row) => (
                                            <Tr key={`${row.proveedorId}-${row.materialId}`}>
                                                <Td>{row.proveedorId}</Td>
                                                <Td>{row.proveedorNombre}</Td>
                                                <Td isNumeric>{formatNumber(row.representativeFirstReceiptLeadTimeDays, 4)}</Td>
                                                <Td isNumeric>{formatNumber(row.representativeCompleteReceiptLeadTimeDays, 4)}</Td>
                                                <Td isNumeric>{formatNumber(row.firstReceiptConfidenceScore, 0)}</Td>
                                                <Td isNumeric>{formatNumber(row.completeReceiptConfidenceScore, 0)}</Td>
                                                <Td isNumeric>{formatNumber(row.firstReceiptValidObservations, 0)}</Td>
                                                <Td isNumeric>{formatNumber(row.completeReceiptValidObservations, 0)}</Td>
                                                <Td isNumeric>{formatNumber(row.totalOrdersConsidered, 0)}</Td>
                                                <Td isNumeric>{formatNumber(row.adjustedLeadTimeDays, 4)}</Td>
                                                <Td>
                                                    <Button size="sm" colorScheme="blue" variant="ghost" onClick={() => openDetail(row)}>
                                                        Ver detalle
                                                    </Button>
                                                </Td>
                                            </Tr>
                                        ))}
                                    </Tbody>
                                </Table>
                            </Box>

                            <BetterPagination
                                page={page}
                                size={size}
                                totalPages={totalPages}
                                loading={loading}
                                onPageChange={(newPage) => {
                                    setPage(newPage);
                                    fetchRanking(newPage, size);
                                }}
                                onSizeChange={(newSize) => {
                                    setSize(newSize);
                                    setPage(0);
                                    fetchRanking(0, newSize);
                                }}
                            />
                        </Stack>
                    )}
                </CardBody>
            </Card>

            <LeadTimeDetailDrawer
                isOpen={isOpen}
                onClose={onClose}
                loading={detailLoading}
                detail={detail}
                selectedProveedorNombre={selectedRow?.proveedorNombre}
            />
            <LeadTimesRankingHelpModal isOpen={isHelpOpen} onClose={onHelpClose} />
        </Stack>
    );
}
