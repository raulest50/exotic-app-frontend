/**
 * Componente: InformeProductosTab
 *
 * Ubicacion en la navegacion:
 * 1. Productos > Basic > Consulta (pestana)
 * 2. Productos > Definir Terminado/Semiterminado > Consulta (pestana)
 *
 * Descripcion:
 * Componente de busqueda de productos que permite filtrar por categorias y texto.
 * Este componente se reutiliza en dos secciones diferentes de la aplicacion.
 *
 * Cuando se hace clic en "Ver Detalle" en la tabla de resultados, se abre el
 * componente DetalleProducto.tsx con la informacion detallada del producto.
 */

import {
    Flex,
    Stack,
    Checkbox,
    CheckboxGroup,
    Input,
    Button,
    NativeSelect,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableContainer,
    Field,
} from "@chakra-ui/react";
import { useRef, useState } from "react";
import axios from "axios";
import BetterPagination from "../../../components/BetterPagination/BetterPagination.tsx";
import { Producto } from "../types.tsx";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import DetalleProducto from "./componentes/DetalleProducto.tsx";
import { normalizeProductId } from "../productIdUtils.ts";

const endpoints = new EndPointsURL();

type SearchType = "NOMBRE" | "ID" | "ID_PARCIAL";

export default function InformeProductosTab() {
    const [chkbox, setChkbox] = useState<string[]>(["material empaque"]);
    const [searchType, setSearchType] = useState<SearchType>("NOMBRE");
    const [searchText, setSearchText] = useState("");
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const pageRef = useRef(0);
    const sizeRef = useRef(10);

    // Estados para manejar la visualizacion del detalle
    const [estado, setEstado] = useState(0);
    const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);

    const fetchProductos = async (pageNumber: number, pageSize: number = sizeRef.current) => {
        setLoading(true);
        try {
            const normalizedSearch =
                searchType === "ID" || searchType === "ID_PARCIAL"
                    ? normalizeProductId(searchText.trim())
                    : searchText;

            const response = await axios.post(endpoints.consulta_productos, {
                search: normalizedSearch,
                searchType,
                categories: chkbox,
                page: pageNumber,
                size: pageSize,
            });

            const nextPage = response.data.number ?? pageNumber;
            const nextSize = response.data.size ?? pageSize;

            setProductos(response.data.content ?? []);
            setTotalPages(response.data.totalPages ?? 0);
            setPage(nextPage);
            setSize(nextSize);
            pageRef.current = nextPage;
            sizeRef.current = nextSize;
        } catch (error) {
            console.error("Error searching productos:", error);
            setProductos([]);
            setTotalPages(0);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        fetchProductos(0, sizeRef.current);
    };

    const handlePageChange = (newPage: number) => {
        fetchProductos(newPage, sizeRef.current);
    };

    const handleSizeChange = (newSize: number) => {
        setSize(newSize);
        sizeRef.current = newSize;
    };

    const verDetalleProducto = (producto: Producto) => {
        setProductoSeleccionado(producto);
        setEstado(1);
    };

    const refreshCurrentSearch = () => {
        fetchProductos(pageRef.current, sizeRef.current);
    };

    if (estado === 1 && productoSeleccionado) {
        return (
            <DetalleProducto
                producto={productoSeleccionado}
                setEstado={setEstado}
                setProductoSeleccionado={setProductoSeleccionado}
                refreshSearch={refreshCurrentSearch}
            />
        );
    }

    return (
        <Flex direction="column" p={4}>
            <Flex direction="row" align="center" gap={10} w="full" mb={4}>
                <Field.Root>
                    <Field.Label>
                        {searchType === "ID"
                            ? "Buscar por ID exacto:"
                            : searchType === "ID_PARCIAL"
                                ? "Buscar por ID parcial:"
                                : "Buscar por nombre:"}
                    </Field.Label>
                    <Input
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder={
                            searchType === "ID"
                                ? "Ingrese codigo o identificador unico"
                                : searchType === "ID_PARCIAL"
                                    ? "Ingrese parte del codigo o identificador"
                                    : "Ingrese nombre del producto"
                        }
                        disabled={chkbox.length === 0}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleSearch();
                            }
                        }}
                    />
                </Field.Root>

                <Field.Root maxW="220px">
                    <Field.Label>Tipo de busqueda:</Field.Label>
                    <NativeSelect.Root>
                        <NativeSelect.Field
                            value={searchType}
                            onChange={(e) => setSearchType(e.target.value as SearchType)}>
                            <option value="NOMBRE">Nombre</option>
                            <option value="ID">ID exacto</option>
                            <option value="ID_PARCIAL">ID parcial</option>
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                </Field.Root>

                <Field.Root>
                    <Field.Label>Categorias:</Field.Label>
                    <CheckboxGroup
                        colorPalette="green"
                        value={chkbox}
                        onValueChange={(values) => setChkbox(values as string[])}
                    >
                        <Stack
                            gap={[2, 5]}
                            direction="column"
                            border="1px solid gray"
                            borderRadius="10px"
                            p="1em"
                            w="fit-content"
                        >
                            <Checkbox.Root value="material empaque"><Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Label>Material de empaque
                                                                </Checkbox.Label></Checkbox.Root>
                            <Checkbox.Root value="materia prima"><Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Label>Materia Prima</Checkbox.Label></Checkbox.Root>
                            <Checkbox.Root value="semiterminado"><Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Label>SemiTerminado</Checkbox.Label></Checkbox.Root>
                            <Checkbox.Root value="terminado"><Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Label>Producto Terminado</Checkbox.Label></Checkbox.Root>
                        </Stack>
                    </CheckboxGroup>
                </Field.Root>

                <Button onClick={handleSearch} colorPalette="blue" loading={loading}>
                    Buscar
                </Button>
            </Flex>

            <Table.ScrollArea>
                <Table.Root variant="striped" colorPalette="gray">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader>ID</Table.ColumnHeader>
                            <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                            <Table.ColumnHeader>Costo</Table.ColumnHeader>
                            <Table.ColumnHeader>Tipo</Table.ColumnHeader>
                            <Table.ColumnHeader>Fecha Creacion</Table.ColumnHeader>
                            <Table.ColumnHeader>Acciones</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {productos.map((producto) => (
                            <Table.Row key={producto.productoId}>
                                <Table.Cell>{producto.productoId}</Table.Cell>
                                <Table.Cell>{producto.nombre}</Table.Cell>
                                <Table.Cell>{producto.costo}</Table.Cell>
                                <Table.Cell>{producto.tipo_producto}</Table.Cell>
                                <Table.Cell>{producto.fechaCreacion}</Table.Cell>
                                <Table.Cell>
                                    <Button
                                        size="sm"
                                        colorPalette="blue"
                                        onClick={() => verDetalleProducto(producto)}
                                    >
                                        Ver Detalle
                                    </Button>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </Table.ScrollArea>

            {totalPages > 0 && (
                <BetterPagination
                    page={page}
                    size={size}
                    totalPages={totalPages}
                    loading={loading}
                    onPageChange={handlePageChange}
                    onSizeChange={handleSizeChange}
                />
            )}
        </Flex>
    );
}
