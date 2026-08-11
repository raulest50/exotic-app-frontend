import {
    Steps,
    Box,
    Button,
    Input,
    NativeSelect,
    Stack,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    useToast,
    VStack,
    Field,
    Dialog,
    Portal,
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
        <Dialog.Root open={isOpen} size={{ base: "full", md: "4xl" }} scrollBehavior="inside" onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>Seleccionar material</Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body>
                            <VStack align="stretch" gap={4}>
                                <Field.Root>
                                    <Field.Label>Buscar material</Field.Label>
                                    <Stack direction={{ base: "column", md: "row" }} align={{ base: "stretch", md: "end" }}>
                                        <Input
                                            value={searchText}
                                            onValueChange={(e) => setSearchText(e.target.value)}
                                            placeholder="Ingrese nombre o ID"
                                            disabled={loading}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !loading) {
                                                    setPage(0);
                                                    fetchMateriales(0, size);
                                                }
                                            }}
                                        />
                                        <NativeSelect.Root>
                                            <NativeSelect.Field
                                                value={searchType}
                                                onValueChange={(e) => setSearchType(e.target.value as BiSearchType)}
                                                width={{ base: "full", md: "150px" }}
                                                disabled={loading}>
                                                <option value="NOMBRE">Nombre</option>
                                                <option value="ID">ID</option>
                                            </NativeSelect.Field>
                                            <NativeSelect.Indicator />
                                        </NativeSelect.Root>
                                        <Button
                                            colorPalette="blue"
                                            onClick={() => {
                                                setPage(0);
                                                fetchMateriales(0, size);
                                            }}
                                            loading={loading}
                                            w={{ base: "full", md: "auto" }}
                                        >
                                            Buscar
                                        </Button>
                                    </Stack>
                                </Field.Root>

                                <Box w="full" overflowX="auto">
                                    {items.length > 0 ? (
                                        <>
                                            <Table.Root variant="striped" size="sm">
                                                <Table.Header>
                                                    <Table.Row>
                                                        <Table.ColumnHeader>ID</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Tipo</Table.ColumnHeader>
                                                        <Table.ColumnHeader>UOM</Table.ColumnHeader>
                                                        <Table.ColumnHeader textAlign='end'>Punto reorden</Table.ColumnHeader>
                                                    </Table.Row>
                                                </Table.Header>
                                                <Table.Body>
                                                    {items.map((item) => {
                                                        const isSelected = item.productoId === selectedMaterialId;
                                                        return (
                                                            <Table.Row
                                                                key={item.productoId}
                                                                onClick={() => setSelectedMaterialId(item.productoId)}
                                                                bg={isSelected ? "app.rowSelectedBlue" : undefined}
                                                                _hover={{ bg: "app.rowHoverStrong", cursor: "pointer" }}
                                                            >
                                                                <Table.Cell>{item.productoId}</Table.Cell>
                                                                <Table.Cell>{item.nombre}</Table.Cell>
                                                                <Table.Cell>{formatTipoMaterial(item.tipoMaterial)}</Table.Cell>
                                                                <Table.Cell>{item.tipoUnidades}</Table.Cell>
                                                                <Table.Cell textAlign='end'>{formatNumber(item.puntoReorden, 2)}</Table.Cell>
                                                            </Table.Row>
                                                        );
                                                    })}
                                                </Table.Body>
                                            </Table.Root>

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
                                        <Text textAlign="center" color="app.textMuted">
                                            No hay materiales para mostrar.
                                        </Text>
                                    )}
                                </Box>
                            </VStack>
                        </Dialog.Body>
                        <Dialog.Footer
                            gap={3}
                            flexDirection={{ base: "column", sm: "row" }}
                            alignItems={{ base: "stretch", sm: "center" }}
                        >
                            <Button
                                colorPalette="blue"
                                onClick={() => {
                                    if (selectedMaterial) {
                                        onSelectMaterial(selectedMaterial);
                                    }
                                }}
                                disabled={!selectedMaterial}
                                w={{ base: "full", sm: "auto" }}
                            >
                                Confirmar
                            </Button>
                            <Button variant="ghost" onClick={onClose} w={{ base: "full", sm: "auto" }}>
                                Cancelar
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
}
