import {
    Box,
    Button,
    FormControl,
    FormLabel,
    HStack,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Select,
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
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import BetterPagination from "../../../components/BetterPagination/BetterPagination.tsx";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import type { Material } from "../../Productos/types.tsx";
import { normalizeProductId } from "../../Productos/productIdUtils.ts";
import type { BiSearchType, MaterialSearchResponse } from "./types.ts";
import { formatNumber, formatTipoMaterial } from "./utils.ts";

const endPoints = new EndPointsURL();
const MATERIAL_CATEGORIES = ["materia prima", "material empaque"];

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSelectMaterial: (material: Material) => void;
};

export default function MaterialSelectorModal({ isOpen, onClose, onSelectMaterial }: Props) {
    const toast = useToast();
    const [searchText, setSearchText] = useState("");
    const [searchType, setSearchType] = useState<BiSearchType>("NOMBRE");
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [items, setItems] = useState<Material[]>([]);
    const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);

    const selectedMaterial = useMemo(
        () => items.find((item) => item.productoId === selectedMaterialId) ?? null,
        [items, selectedMaterialId]
    );

    const fetchMateriales = async (pageNumber: number = page, pageSize: number = size) => {
        setLoading(true);
        try {
            const search = searchType === "ID" ? normalizeProductId(searchText.trim()) : searchText;
            const response = await axios.post<MaterialSearchResponse>(endPoints.consulta_productos, {
                search,
                searchType,
                categories: MATERIAL_CATEGORIES,
                page: pageNumber,
                size: pageSize,
            });

            const content = (response.data.content ?? []).filter((item) => item.tipo_producto === "M");
            setItems(content);
            setPage(response.data.number ?? pageNumber);
            setSize(response.data.size ?? pageSize);
            setTotalPages(response.data.totalPages ?? 0);
            setSelectedMaterialId(null);
        } catch (error) {
            console.error("Error searching materiales:", error);
            setItems([]);
            setTotalPages(0);
            toast({
                title: "Error",
                description: "No se pudo buscar materiales para aprovisionamiento.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        setPage(0);
        fetchMateriales(0, size);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="4xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Seleccionar material</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack align="stretch" spacing={4}>
                        <FormControl>
                            <FormLabel>Buscar material</FormLabel>
                            <HStack align="end">
                                <Input
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    placeholder="Ingrese nombre o ID"
                                    isDisabled={loading}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !loading) {
                                            setPage(0);
                                            fetchMateriales(0, size);
                                        }
                                    }}
                                />
                                <Select
                                    value={searchType}
                                    onChange={(e) => setSearchType(e.target.value as BiSearchType)}
                                    width="150px"
                                    isDisabled={loading}
                                >
                                    <option value="NOMBRE">Nombre</option>
                                    <option value="ID">ID</option>
                                </Select>
                                <Button
                                    colorScheme="blue"
                                    onClick={() => {
                                        setPage(0);
                                        fetchMateriales(0, size);
                                    }}
                                    isLoading={loading}
                                >
                                    Buscar
                                </Button>
                            </HStack>
                        </FormControl>

                        <Box w="full" overflowX="auto">
                            {items.length > 0 ? (
                                <>
                                    <Table variant="striped" size="sm">
                                        <Thead>
                                            <Tr>
                                                <Th>ID</Th>
                                                <Th>Nombre</Th>
                                                <Th>Tipo</Th>
                                                <Th>UOM</Th>
                                                <Th isNumeric>Punto reorden</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {items.map((item) => {
                                                const isSelected = item.productoId === selectedMaterialId;
                                                return (
                                                    <Tr
                                                        key={item.productoId}
                                                        onClick={() => setSelectedMaterialId(item.productoId)}
                                                        bg={isSelected ? "blue.100" : undefined}
                                                        _hover={{ bg: "gray.100", cursor: "pointer" }}
                                                    >
                                                        <Td>{item.productoId}</Td>
                                                        <Td>{item.nombre}</Td>
                                                        <Td>{formatTipoMaterial(item.tipoMaterial)}</Td>
                                                        <Td>{item.tipoUnidades}</Td>
                                                        <Td isNumeric>{formatNumber(item.puntoReorden, 2)}</Td>
                                                    </Tr>
                                                );
                                            })}
                                        </Tbody>
                                    </Table>

                                    <Box mt={4}>
                                        <BetterPagination
                                            page={page}
                                            size={size}
                                            totalPages={totalPages}
                                            loading={loading}
                                            onPageChange={(newPage) => {
                                                setPage(newPage);
                                                fetchMateriales(newPage, size);
                                            }}
                                            onSizeChange={(newSize) => {
                                                setSize(newSize);
                                                setPage(0);
                                                fetchMateriales(0, newSize);
                                            }}
                                        />
                                    </Box>
                                </>
                            ) : (
                                <Text textAlign="center" color="gray.600">
                                    No hay materiales para mostrar.
                                </Text>
                            )}
                        </Box>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button
                        colorScheme="blue"
                        mr={3}
                        onClick={() => {
                            if (selectedMaterial) {
                                onSelectMaterial(selectedMaterial);
                            }
                        }}
                        isDisabled={!selectedMaterial}
                    >
                        Confirmar
                    </Button>
                    <Button variant="ghost" onClick={onClose}>
                        Cancelar
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
