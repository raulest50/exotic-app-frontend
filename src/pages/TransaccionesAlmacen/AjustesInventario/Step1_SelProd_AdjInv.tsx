import {
    Box,
    Button,
    Checkbox,
    CheckboxGroup,
    Flex,
    IconButton,
    Input,
    Stack,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    Field,
} from "@chakra-ui/react";
import MyPagination from "../../../components/MyPagination.tsx";
import { Producto } from "../../Productos/types.tsx";
import { LuPlus, LuTrash2 } from 'react-icons/lu';

interface Step1SelProdProps {
    searchText: string;
    setSearchText: (value: string) => void;
    chkbox: string[];
    setChkbox: (values: string[]) => void;
    productos: Producto[];
    loading: boolean;
    page: number;
    totalPages: number;
    handleSearch: () => void;
    handlePageChange: (newPage: number) => void;
    handleAddProduct: (producto: Producto) => void;
    handleRemoveProduct: (productoId: string) => void;
    selectedProducts: Producto[];
}

export default function AjustesInventarioStep0SelectProducts({
    searchText,
    setSearchText,
    chkbox,
    setChkbox,
    productos,
    loading,
    page,
    totalPages,
    handleSearch,
    handlePageChange,
    handleAddProduct,
    handleRemoveProduct,
    selectedProducts,
}: Step1SelProdProps) {
    return (
        <Flex direction={{ base: "column", lg: "row" }} gap={4} w={"full"}>
            <Box
                flex={1}
                p={4}
                borderWidth={"1px"}
                borderRadius={"md"}
                borderColor={"gray.200"}
                w={"full"}
            >
                <Text fontSize={"lg"} fontWeight={"semibold"} mb={3}>
                    Resultados de búsqueda
                </Text>
                <Flex direction={"column"} gap={4}>
                    <Flex
                        direction={{ base: "column", xl: "row" }}
                        align={{ xl: "flex-end" }}
                        gap={4}
                        w={"full"}
                    >
                        <Field.Root flex={1}>
                            <Field.Label>Buscar:</Field.Label>
                            <Input
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                placeholder={"Ingresa el nombre del producto"}
                                disabled={chkbox.length === 0}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleSearch();
                                    }
                                }}
                            />
                        </Field.Root>

                        <Field.Root flex={1}>
                            <Field.Label>Categorías:</Field.Label>
                            <CheckboxGroup
                                colorPalette={"green"}
                                value={chkbox}
                                onValueChange={(values) => setChkbox(values as string[])}
                            >
                                <Stack
                                    gap={[2, 3]}
                                    direction={"column"}
                                    border={"1px solid gray"}
                                    borderRadius={"10px"}
                                    p={"1em"}
                                    w={"full"}
                                >
                                    <Checkbox.Root value={"material empaque"}><Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Label>Material de empaque
                                                                                </Checkbox.Label></Checkbox.Root>
                                    <Checkbox.Root value={"materia prima"}><Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Label>Materia Prima</Checkbox.Label></Checkbox.Root>
                                    <Checkbox.Root value={"semiterminado"}><Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Label>SemiTerminado</Checkbox.Label></Checkbox.Root>
                                    <Checkbox.Root value={"terminado"}><Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Label>Producto Terminado</Checkbox.Label></Checkbox.Root>
                                </Stack>
                            </CheckboxGroup>
                        </Field.Root>
                    </Flex>

                    <Flex justifyContent={{ base: "stretch", xl: "flex-start" }}>
                        <Button
                            onClick={handleSearch}
                            colorPalette={"blue"}
                            loading={loading}
                            w={{ base: "full", xl: "auto" }}
                        >
                            Buscar
                        </Button>
                    </Flex>

                    <Box>
                        {loading ? (
                            <Text color={"app.textSubtle"}>Cargando productos...</Text>
                        ) : productos.length > 0 ? (
                            <Table.Root size={"sm"} variant={"simple"}>
                                <Table.Header>
                                    <Table.Row>
                                        <Table.ColumnHeader>ID</Table.ColumnHeader>
                                        <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                        <Table.ColumnHeader>Tipo</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign={"center"}>Acciones</Table.ColumnHeader>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {productos.map((producto) => (
                                        <Table.Row key={producto.productoId}>
                                            <Table.Cell>{producto.productoId}</Table.Cell>
                                            <Table.Cell>{producto.nombre}</Table.Cell>
                                            <Table.Cell textTransform={"capitalize"}>{producto.tipo_producto}</Table.Cell>
                                            <Table.Cell textAlign={"center"}>
                                                <IconButton
                                                    aria-label={"Agregar producto"}
                                                    size={"sm"}
                                                    variant={"outline"}
                                                    onClick={() => handleAddProduct(producto)}><LuPlus /></IconButton>
                                            </Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table.Root>
                        ) : (
                            <Text color={"app.textSubtle"}>No hay productos para mostrar.</Text>
                        )}
                    </Box>

                    <MyPagination
                        page={page}
                        totalPages={totalPages}
                        loading={loading}
                        handlePageChange={handlePageChange}
                    />
                </Flex>
            </Box>

            <Box
                flex={1}
                p={4}
                borderWidth={"1px"}
                borderRadius={"md"}
                borderColor={"gray.200"}
                w={"full"}
            >
                <Text fontSize={"lg"} fontWeight={"semibold"} mb={3}>
                    Items seleccionados
                </Text>
                {selectedProducts.length > 0 ? (
                    <Table.Root size={"sm"} variant={"simple"}>
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>ID</Table.ColumnHeader>
                                <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                <Table.ColumnHeader>Tipo</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign={"center"}>Acciones</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {selectedProducts.map((producto) => (
                                <Table.Row key={producto.productoId}>
                                    <Table.Cell>{producto.productoId}</Table.Cell>
                                    <Table.Cell>{producto.nombre}</Table.Cell>
                                    <Table.Cell textTransform={"capitalize"}>{producto.tipo_producto}</Table.Cell>
                                    <Table.Cell textAlign={"center"}>
                                        <IconButton
                                            aria-label={"Remover producto"}
                                            colorPalette={"red"}
                                            size={"sm"}
                                            variant={"ghost"}
                                            onClick={() => handleRemoveProduct(producto.productoId)}><LuTrash2 /></IconButton>
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                ) : (
                    <Text color={"app.textSubtle"}>Añade productos para verlos aquí.</Text>
                )}
            </Box>
        </Flex>
    );
}
