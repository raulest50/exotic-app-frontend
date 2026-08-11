/**
 * Componente: InformeProductosTabAdvanced
 * 
 * Ubicación en la navegación:
 * Productos > Definir Terminado/Semiterminado > Modificaciones (pestaña)
 * 
 * Descripción:
 * Componente avanzado para la modificación y gestión de productos que ofrece funcionalidades
 * como ordenamiento, filtrado por fecha y visualización mejorada.
 * Este componente es exclusivo para la sección de Definir Terminado/Semiterminado
 * y solo es accesible para usuarios con nivel de acceso 3 o superior.
 * 
 * Cuando se hace clic en "Ver Detalle" en la tabla de resultados, se abre el
 * componente DetalleProductoAdvanced.tsx con la información detallada del producto.
 */

import {
    Steps,
    Flex,
    Stack,
    Checkbox,
    CheckboxGroup,
    Input,
    Button,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableContainer,
    Badge,
    NativeSelect,
    Field,
} from "@chakra-ui/react";
import { useState } from "react";
import axios from "axios";
import MyPagination from "../../../../components/MyPagination.tsx";
import { Producto } from "../../types.tsx";
import EndPointsURL from "../../../../api/EndPointsURL.tsx";
import DetalleProductoSemiTer from "./DetalleProductoSemiTer.tsx";
import ModSemiTerMFWizard from "./ModSemiTerMFWizard.tsx";

const endpoints = new EndPointsURL();

export default function InformeProductosTabAdvanced() {
    const [chkbox, setChkbox] = useState<string[]>(["semiterminado", "terminado"]);
    const [searchText, setSearchText] = useState("");
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 10;

    // Estados para manejar la visualización del detalle
    const [estado, setEstado] = useState(0);
    const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);

    // Estado adicional para características avanzadas
    const [sortBy, setSortBy] = useState<string>("nombre");
    const [filterByDate, setFilterByDate] = useState<string>("");

    // Fetch products given a page number
    const fetchProductos = async (pageNumber: number) => {
        setLoading(true);
        try {
            const response = await axios.post(endpoints.consulta_productos, {
                search: searchText,
                categories: chkbox,
                page: pageNumber,
                size: pageSize
                // Removed sortBy and filterByDate parameters as they're not supported by the backend
            });
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

    const handleReturnToList = () => {
        setEstado(0);
        setProductoSeleccionado(null);
        handleSearch();
    };

    // Renderizado condicional basado en el estado
    if (estado === 2 && productoSeleccionado) {
        return (
            <ModSemiTerMFWizard
                producto={productoSeleccionado}
                onClose={handleReturnToList}
                refreshSearch={handleSearch}
            />
        );
    }

    if (estado === 1 && productoSeleccionado) {
        return (
            <DetalleProductoSemiTer
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
                <Field.Root>
                    <Field.Label>Buscar:</Field.Label>
                    <Input
                        value={searchText}
                        onValueChange={(e) => setSearchText(e.target.value)}
                        placeholder="Nombre del producto"
                        disabled={chkbox.length === 0}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleSearch();
                            }
                        }}
                    />
                </Field.Root>

                <Field.Root>
                    <Field.Label>Categorías:</Field.Label>
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
                            <Checkbox.Root value="semiterminado"><Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Label>SemiTerminado</Checkbox.Label></Checkbox.Root>
                            <Checkbox.Root value="terminado"><Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Label>Producto Terminado</Checkbox.Label></Checkbox.Root>
                        </Stack>
                    </CheckboxGroup>
                </Field.Root>

                <Button onClick={handleSearch} colorPalette="blue" loading={loading}>
                    Buscar
                </Button>
            </Flex>

            {/* Opciones avanzadas - Nuevas características */}
            <Flex direction="row" align="center" gap={10} w="full" mb={4}>
                <Field.Root maxW="200px">
                    <Field.Label>Ordenar por:</Field.Label>
                    <NativeSelect.Root>
                        <NativeSelect.Field value={sortBy} onValueChange={(e) => setSortBy(e.target.value)}>
                            <option value="nombre">Nombre</option>
                            <option value="fechaCreacion">Fecha de creación</option>
                            <option value="costo">Costo</option>
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                </Field.Root>

                <Field.Root maxW="200px">
                    <Field.Label>Filtrar por fecha:</Field.Label>
                    <Input
                        type="date"
                        value={filterByDate}
                        onValueChange={(e) => setFilterByDate(e.target.value)}
                    />
                </Field.Root>
            </Flex>

            <Table.ScrollArea>
                <Table.Root variant="striped" colorPalette="blue">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader>ID</Table.ColumnHeader>
                            <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                            <Table.ColumnHeader>Costo</Table.ColumnHeader>
                            <Table.ColumnHeader>Tipo</Table.ColumnHeader>
                            <Table.ColumnHeader>Fecha Creación</Table.ColumnHeader>
                            <Table.ColumnHeader>Acciones</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {productos.map((producto) => (
                            <Table.Row key={producto.productoId}>
                                <Table.Cell>{producto.productoId}</Table.Cell>
                                <Table.Cell>{producto.nombre}</Table.Cell>
                                <Table.Cell>{producto.costo}</Table.Cell>
                                <Table.Cell>
                                    <Badge colorPalette={producto.tipo_producto === 'T' ? 'green' : 'purple'}>
                                        {producto.tipo_producto === 'T' ? 'Terminado' : 'Semiterminado'}
                                    </Badge>
                                </Table.Cell>
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

            <MyPagination
                page={page}
                totalPages={totalPages}
                loading={loading}
                handlePageChange={handlePageChange}
            />
        </Flex>
    );
}
