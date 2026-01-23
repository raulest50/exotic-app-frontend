/**
 * Componente: InformeProductosTab
 * 
 * Ubicación en la navegación:
 * 1. Productos > Basic > Consulta (pestaña)
 * 2. Productos > Definir Terminado/Semiterminado > Consulta (pestaña)
 * 
 * Descripción:
 * Componente de búsqueda de productos que permite filtrar por categorías y texto.
 * Este componente se reutiliza en dos secciones diferentes de la aplicación.
 * 
 * Cuando se hace clic en "Ver Detalle" en la tabla de resultados, se abre el
 * componente DetalleProducto.tsx con la información detallada del producto.
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
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableContainer,
} from "@chakra-ui/react";
import { useState } from "react";
import axios from "axios";
import MyPagination from "../../../components/MyPagination.tsx";
import { Producto } from "../types.tsx";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import DetalleProducto from "./componentes/DetalleProducto.tsx";

const endpoints = new EndPointsURL();

export default function InformeProductosTab() {
    const [chkbox, setChkbox] = useState<string[]>(["material empaque"]);
    const [searchText, setSearchText] = useState("");
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 10; // adjust as needed

    // Estados para manejar la visualización del detalle
    const [estado, setEstado] = useState(0);
    const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);

    // Fetch products given a page number
    const fetchProductos = async (pageNumber: number) => {
        setLoading(true);
        try {
            const response = await axios.post(endpoints.consulta_productos, {
                search: searchText,
                categories: chkbox,
                page: pageNumber,
                size: pageSize,
            });
            // Expecting a Page<Producto> response
            setProductos(response.data.content);
            setTotalPages(response.data.totalPages);
            setPage(response.data.number);
        } catch (error) {
            console.error("Error searching productos:", error);
        } finally {
            setLoading(false);
        }
    };

    // Initiate a new search, resetting to page 0
    const handleSearch = () => {
        fetchProductos(0);
    };

    // Handle page changes from the pagination component
    const handlePageChange = (newPage: number) => {
        fetchProductos(newPage);
    };

    // Función para ver el detalle de un producto
    const verDetalleProducto = (producto: Producto) => {
        setProductoSeleccionado(producto);
        setEstado(1);
    };

    // Renderizado condicional basado en el estado
    if (estado === 1 && productoSeleccionado) {
        return (
            <DetalleProducto 
                producto={productoSeleccionado} 
                setEstado={setEstado}
                setProductoSeleccionado={setProductoSeleccionado}
                refreshSearch={handleSearch}
            />
        );
    }

    return (
        <Flex direction="column" p={4}>
            <Flex direction="row" align="center" gap={10} w="full" mb={4}>
                <FormControl>
                    <FormLabel>Buscar:</FormLabel>
                    <Input
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="Ingrese nombre del producto"
                        isDisabled={chkbox.length === 0}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleSearch();
                            }
                        }}
                    />
                </FormControl>

                <FormControl>
                    <FormLabel>Categorías:</FormLabel>
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
                            <Th>Fecha Creación</Th>
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

            <MyPagination
                page={page}
                totalPages={totalPages}
                loading={loading}
                handlePageChange={handlePageChange}
            />
        </Flex>
    );
}
