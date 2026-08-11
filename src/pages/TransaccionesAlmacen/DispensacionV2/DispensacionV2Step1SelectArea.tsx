import {
    Badge,
    Box,
    Button,
    Flex,
    HStack,
    Input,
    InputGroup,
    InputLeftElement,
    Spinner,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    VStack,
    Field,
    Icon,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import EndPointsURL from "../../../api/EndPointsURL";
import BetterPagination from "../../../components/BetterPagination/BetterPagination";
import { LuSearch } from 'react-icons/lu';

export interface AreaOperativaDispensacionV2 {
    areaId: number;
    nombre: string;
    descripcion?: string;
    responsableArea?: {
        id?: number;
        cedula?: number;
        username?: string;
        nombreCompleto?: string;
    } | null;
}

interface DispensacionV2Step1SelectAreaProps {
    selectedArea: AreaOperativaDispensacionV2 | null;
    onSelectArea: (area: AreaOperativaDispensacionV2 | null) => void;
    onNext: () => void;
}

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_SIZE = 50;
const ALMACEN_GENERAL_AREA_ID = -1;
const ALMACEN_GENERAL_NOMBRE = "almacen general";

function normalizeAreaName(value: string) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function isProductiveArea(area: AreaOperativaDispensacionV2) {
    return area.areaId !== ALMACEN_GENERAL_AREA_ID && normalizeAreaName(area.nombre) !== ALMACEN_GENERAL_NOMBRE;
}

function responsableLabel(area: AreaOperativaDispensacionV2) {
    return area.responsableArea?.nombreCompleto || area.responsableArea?.username || "Sin responsable";
}

function extractApiError(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        if (typeof data === "string" && data.trim()) return data;
        if (data && typeof data === "object" && "message" in data && typeof data.message === "string") return data.message;
        return error.message || fallback;
    }
    if (error instanceof Error) return error.message;
    return fallback;
}

export default function DispensacionV2Step1SelectArea({
    selectedArea,
    onSelectArea,
    onNext,
}: DispensacionV2Step1SelectAreaProps) {
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const toast = useAppToast();
    const [searchText, setSearchText] = useState("");
    const [areas, setAreas] = useState<AreaOperativaDispensacionV2[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

    const totalPages = Math.max(1, Math.ceil(areas.length / pageSize));
    const currentAreas = areas.slice(page * pageSize, page * pageSize + pageSize);

    const searchAreas = async (nombre = searchText) => {
        setLoading(true);
        try {
            const response = await axios.post<AreaOperativaDispensacionV2[]>(
                endpoints.area_prod_search_by_name,
                { nombre },
                {
                    params: { page: 0, size: SEARCH_SIZE },
                    withCredentials: true,
                },
            );
            const productiveAreas = (response.data ?? []).filter(isProductiveArea);
            setAreas(productiveAreas);
            setPage(0);

            if (selectedArea && !productiveAreas.some((area) => area.areaId === selectedArea.areaId)) {
                onSelectArea(null);
            }
        } catch (error) {
            toast({
                title: "Error al buscar áreas",
                description: extractApiError(error, "No fue posible buscar áreas operativas."),
                status: "error",
                duration: 4000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void searchAreas("");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSearchSubmit = () => {
        void searchAreas();
    };

    return (
        <Box backgroundColor="app.surface" p={4} borderRadius="md" boxShadow="sm">
            <VStack align="stretch" gap={4}>
                <Field.Root>
                    <Field.Label>Área operativa</Field.Label>
                    <HStack>
                        <InputGroup>
                            <InputLeftElement pointerEvents="none">
                                <Icon as={LuSearch} color="gray.400" />
                            </InputLeftElement>
                            <Input
                                value={searchText}
                                onChange={(event) => setSearchText(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" && !loading) {
                                        handleSearchSubmit();
                                    }
                                }}
                                placeholder="Buscar por nombre"
                                disabled={loading}
                            />
                        </InputGroup>
                        <Button onClick={handleSearchSubmit} loading={loading} loadingText="Buscando">
                            Buscar
                        </Button>
                    </HStack>
                </Field.Root>

                <Box overflowX="auto">
                    <Table.Root size="sm">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>ID</Table.ColumnHeader>
                                <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                <Table.ColumnHeader>Descripción</Table.ColumnHeader>
                                <Table.ColumnHeader>Responsable</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {currentAreas.map((area) => {
                                const isSelected = selectedArea?.areaId === area.areaId;
                                return (
                                    <Table.Row
                                        key={area.areaId}
                                        bg={isSelected ? "app.rowSelectedTeal" : undefined}
                                        _hover={{ bg: isSelected ? "app.rowSelectedTeal" : "app.rowHover", cursor: "pointer" }}
                                        onClick={() => onSelectArea(area)}
                                    >
                                        <Table.Cell>{area.areaId}</Table.Cell>
                                        <Table.Cell fontWeight="semibold">{area.nombre}</Table.Cell>
                                        <Table.Cell maxW="360px">
                                            <Text lineClamp={2}>{area.descripcion || "-"}</Text>
                                        </Table.Cell>
                                        <Table.Cell>{responsableLabel(area)}</Table.Cell>
                                    </Table.Row>
                                );
                            })}
                        </Table.Body>
                    </Table.Root>

                    {loading && (
                        <Flex justify="center" align="center" gap={3} py={6}>
                            <Spinner size="sm" />
                            <Text color="app.textSubtle">Buscando áreas...</Text>
                        </Flex>
                    )}

                    {!loading && areas.length === 0 && (
                        <Text textAlign="center" color="app.textSubtle" py={6}>
                            No hay áreas para mostrar.
                        </Text>
                    )}
                </Box>

                {areas.length > pageSize && (
                    <BetterPagination
                        page={page}
                        size={pageSize}
                        totalPages={totalPages}
                        loading={loading}
                        onPageChange={setPage}
                        onSizeChange={setPageSize}
                    />
                )}

                {selectedArea && (
                    <Box p={3} borderWidth="1px" borderRadius="md" borderColor="app.cardItemBorderBlue" bg="app.stepperBlue">
                        <Flex gap={2} align="center" flexWrap="wrap">
                            <Text fontWeight="semibold">{selectedArea.nombre}</Text>
                            <Badge variant="subtle">ID {selectedArea.areaId}</Badge>
                        </Flex>
                        {selectedArea.descripcion && (
                            <Text mt={1} fontSize="sm" color="app.textMuted">
                                {selectedArea.descripcion}
                            </Text>
                        )}
                        <Text mt={1} fontSize="sm" color="app.textMuted">
                            {responsableLabel(selectedArea)}
                        </Text>
                    </Box>
                )}

                <Flex justify="flex-end">
                    <Button colorPalette="teal" onClick={onNext} disabled={!selectedArea}>
                        Continuar al MPS
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
