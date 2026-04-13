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
    FormControl,
    FormLabel,
    Input,
    Button,
    Select,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableContainer,
} from "@chakra-ui/react";
import { useRef, useState } from "react";
import axios from "axios";
import BetterPagination from "../../../components/BetterPagination/BetterPagination.tsx";
import { Producto } from "../types.tsx";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import DetalleProducto from "./componentes/DetalleProducto.tsx";
import { normalizeProductId } from "../productIdUtils.ts";

const endpoints = new EndPointsURL();

type SearchType = "NOMBRE" | "ID";

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
                searchType === "ID"
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
                <FormControl>
                    <FormLabel>{searchType === "ID" ? "Buscar por ID:" : "Buscar por nombre:"}</FormLabel>
                    <Input
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder={
                            searchType === "ID"
                                ? "Ingrese codigo o identificador unico"
                                : "Ingrese nombre del producto"
                        }
                        isDisabled={chkbox.length === 0}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleSearch();
                            }
                        }}
                    />
                </FormControl>

                <FormControl maxW="220px">
                    <FormLabel>Tipo de busqueda:</FormLabel>
                    <Select
                        value={searchType}
                        onChange={(e) => setSearchType(e.target.value as SearchType)}
                    >
                        <option value="NOMBRE">Nombre</option>
                        <option value="ID">ID</option>
                    </Select>
                </FormControl>

                <FormControl>
                    <FormLabel>Categorias:</FormLabel>
                    <CheckboxGroup
                        colorScheme="green"
                        value={chkbox}
                        onChange={(values) => setChkbox(values as string[])}
                    >
                        <Stack
                            spacing={[2, 5]}
                            direction="column"
                            border="1px solid gray"
                            borderRadius="10px"
                            p="1em"
                            w="fit-content"
                        >
                            <Checkbox value="material empaque">
                                Material de empaque
                            </Checkbox>
                            <Checkbox value="materia prima">Materia Prima</Checkbox>
                            <Checkbox value="semiterminado">SemiTerminado</Checkbox>
                            <Checkbox value="terminado">Producto Terminado</Checkbox>
                        </Stack>
                    </CheckboxGroup>
                </FormControl>

                <Button onClick={handleSearch} colorScheme="blue" isLoading={loading}>
                    Buscar
                </Button>
            </Flex>

            <TableContainer>
                <Table variant="striped" colorScheme="gray">
                    <Thead>
                        <Tr>
                            <Th>ID</Th>
                            <Th>Nombre</Th>
                            <Th>Costo</Th>
                            <Th>Tipo</Th>
                            <Th>Fecha Creacion</Th>
                            <Th>Acciones</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {productos.map((producto) => (
                            <Tr key={producto.productoId}>
                                <Td>{producto.productoId}</Td>
                                <Td>{producto.nombre}</Td>
                                <Td>{producto.costo}</Td>
                                <Td>{producto.tipo_producto}</Td>
                                <Td>{producto.fechaCreacion}</Td>
                                <Td>
                                    <Button
                                        size="sm"
                                        colorScheme="blue"
                                        onClick={() => verDetalleProducto(producto)}
                                    >
                                        Ver Detalle
                                    </Button>
                                </Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            </TableContainer>

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
