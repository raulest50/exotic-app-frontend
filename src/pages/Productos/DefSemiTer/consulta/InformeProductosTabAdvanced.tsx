/**
 * Componente: InformeProductosTabAdvanced
 * 
 * Ubicación en la navegación:
 * Productos > Básicos > Modificaciones (pestaña)
 * 
 * Descripción:
 * Catálogo de terminados y semiterminados para consultar su detalle, gestionar sus
 * datos básicos y abrir la modificación de manufactura en Process Designer v2.
 * Requiere Modificaciones nivel 3; abrir el diseñador exige además su permiso nivel 2.
 * 
 * Cuando se hace clic en "Ver Detalle" en la tabla de resultados, se abre el
 * componente DetalleProductoSemiTer.tsx con la información detallada del producto.
 */

import {
    Flex,
    Stack,
    Checkbox,
    CheckboxGroup,
    Input,
    Button,
    Table,
    Badge,
    NativeSelect,
    Field,
    Fieldset,
    Text,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import axios from "axios";
import MyPagination from "../../../../components/MyPagination.tsx";
import { Producto } from "../../types.tsx";
import EndPointsURL from "../../../../api/EndPointsURL.tsx";
import DetalleProductoSemiTer from "./DetalleProductoSemiTer.tsx";

const endpoints = new EndPointsURL();

type ProductQuery = { search: string; categories: string[]; page: number; size: number };

export default function InformeProductosTabAdvanced({ onEditInDesigner, refreshRevision = 0, returnRevision = 0 }: {
    onEditInDesigner: (producto: Producto) => void;
    refreshRevision?: number;
    returnRevision?: number;
}) {
    const [chkbox, setChkbox] = useState<string[]>(["semiterminado", "terminado"]);
    const [searchText, setSearchText] = useState("");
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [query, setQuery] = useState<ProductQuery | null>(null);
    const [searchError, setSearchError] = useState("");
    const pageSize = 10;

    // Estados para manejar la visualización del detalle
    const [estado, setEstado] = useState(0);
    const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);

    useEffect(() => {
        if (returnRevision === 0) return;
        setEstado(0);
        setProductoSeleccionado(null);
    }, [returnRevision]);

    // Estado adicional para características avanzadas
    const [sortBy, setSortBy] = useState<string>("nombre");
    const [filterByDate, setFilterByDate] = useState<string>("");

    // The submitted query is separate from the inputs, so returning from the designer
    // refreshes the same result page even if an unsubmitted search was being written.
    useEffect(() => {
        if (!query) return;
        const controller = new AbortController();
        setLoading(true);
        setSearchError("");
        axios.post(endpoints.consulta_productos, query, { signal: controller.signal }).then(({ data }) => {
            if (!controller.signal.aborted) {
                setProductos(data.content);
                setTotalPages(data.totalPages);
                setPage(data.number);
            }
        }).catch(() => {
            if (!controller.signal.aborted) setSearchError("No se pudo actualizar el listado. La búsqueda y la página se conservan; intenta nuevamente.");
        }).finally(() => {
            if (!controller.signal.aborted) setLoading(false);
        });
        return () => controller.abort();
    }, [query, refreshRevision]);

    // Initiate a new search, resetting to page 0
    const handleSearch = () => {
        setQuery({ search: searchText, categories: [...chkbox], page: 0, size: pageSize });
    };

    // Handle page changes from the pagination component
    const handlePageChange = (newPage: number) => {
        setQuery(current => current ? { ...current, page: newPage } : null);
    };

    // Función para ver el detalle de un producto
    const verDetalleProducto = (producto: Producto) => {
        setProductoSeleccionado(producto);
        setEstado(1);
    };

    const refreshCurrentPage = () => {
        setQuery(current => current ? { ...current } : null);
    };
    const searchFeedback = searchError && <Flex role="alert" gap={3} align="center" mb={3} flexWrap="wrap">
        <Text color="fg.error">{searchError}</Text>
        <Button size="sm" variant="outline" onClick={refreshCurrentPage} loading={loading}>Reintentar actualización</Button>
    </Flex>;

    // Renderizado condicional basado en el estado
    if (estado === 1 && productoSeleccionado) {
        return <>
            {searchFeedback}
            <DetalleProductoSemiTer
                producto={productoSeleccionado}
                setEstado={setEstado}
                setProductoSeleccionado={setProductoSeleccionado}
                refreshSearch={refreshCurrentPage}
                onEditInDesigner={onEditInDesigner}
                refreshRevision={refreshRevision}
            />
        </>;
    }

    return (
        <Flex direction="column" p={4}>
            {searchFeedback}
            <Flex direction="row" align="center" gap={10} w="full" mb={4}>
                <Field.Root>
                    <Field.Label>Buscar:</Field.Label>
                    <Input
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="Nombre del producto"
                        disabled={chkbox.length === 0}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleSearch();
                            }
                        }}
                    />
                </Field.Root>

                <Fieldset.Root>
                    <CheckboxGroup
                        name="categories"
                        colorPalette="green"
                        value={chkbox}
                        onValueChange={(values) => setChkbox(values as string[])}
                    >
                        <Fieldset.Legend>Categorías:</Fieldset.Legend>
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
                </Fieldset.Root>

                <Button onClick={handleSearch} colorPalette="blue" loading={loading}>
                    Buscar
                </Button>
            </Flex>

            {/* Opciones avanzadas - Nuevas características */}
            <Flex direction="row" align="center" gap={10} w="full" mb={4}>
                <Field.Root maxW="200px">
                    <Field.Label>Ordenar por:</Field.Label>
                    <NativeSelect.Root>
                        <NativeSelect.Field value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
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
                        onChange={(e) => setFilterByDate(e.target.value)}
                    />
                </Field.Root>
            </Flex>

            <Table.ScrollArea>
                <Table.Root variant="line" striped colorPalette="blue">
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
