import {
    Box,
    Button,
    Checkbox,
    CheckboxGroup,
    Flex,
    FormControl,
    FormLabel,
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
} from "@chakra-ui/react";
import { AddIcon, DeleteIcon } from "@chakra-ui/icons";
import MyPagination from "../../../components/MyPagination.tsx";
import { Producto } from "../../Productos/types.tsx";

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
                        <FormControl flex={1}>
                            <FormLabel>Buscar:</FormLabel>
                            <Input
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                placeholder={"Ingresa el nombre del producto"}
                                isDisabled={chkbox.length === 0}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleSearch();
                                    }
                                }}
                            />
                        </FormControl>

                        <FormControl flex={1}>
                            <FormLabel>Categorías:</FormLabel>
                            <CheckboxGroup
                                colorScheme={"green"}
                                value={chkbox}
                                onChange={(values) => setChkbox(values as string[])}
                            >
                                <Stack
                                    spacing={[2, 3]}
                                    direction={"column"}
                                    border={"1px solid gray"}
                                    borderRadius={"10px"}
                                    p={"1em"}
                                    w={"full"}
                                >
                                    <Checkbox value={"material empaque"}>
                                        Material de empaque
                                    </Checkbox>
                                    <Checkbox value={"materia prima"}>Materia Prima</Checkbox>
                                    <Checkbox value={"semiterminado"}>SemiTerminado</Checkbox>
                                    <Checkbox value={"terminado"}>Producto Terminado</Checkbox>
                                </Stack>
                            </CheckboxGroup>
                        </FormControl>
                    </Flex>

                    <Flex justifyContent={{ base: "stretch", xl: "flex-start" }}>
                        <Button
                            onClick={handleSearch}
                            colorScheme={"blue"}
                            isLoading={loading}
                            w={{ base: "full", xl: "auto" }}
                        >
                            Buscar
                        </Button>
                    </Flex>

                    <Box>
                        {loading ? (
                            <Text color={"gray.500"}>Cargando productos...</Text>
                        ) : productos.length > 0 ? (
                            <Table size={"sm"} variant={"simple"}>
                                <Thead>
                                    <Tr>
                                        <Th>ID</Th>
                                        <Th>Nombre</Th>
                                        <Th>Tipo</Th>
                                        <Th textAlign={"center"}>Acciones</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {productos.map((producto) => (
                                        <Tr key={producto.productoId}>
                                            <Td>{producto.productoId}</Td>
                                            <Td>{producto.nombre}</Td>
                                            <Td textTransform={"capitalize"}>{producto.tipo_producto}</Td>
                                            <Td textAlign={"center"}>
                                                <IconButton
                                                    aria-label={"Agregar producto"}
                                                    icon={<AddIcon />}
                                                    size={"sm"}
                                                    variant={"outline"}
                                                    onClick={() => handleAddProduct(producto)}
                                                />
                                            </Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        ) : (
                            <Text color={"gray.500"}>No hay productos para mostrar.</Text>
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
                    <Table size={"sm"} variant={"simple"}>
                        <Thead>
                            <Tr>
                                <Th>ID</Th>
                                <Th>Nombre</Th>
                                <Th>Tipo</Th>
                                <Th textAlign={"center"}>Acciones</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {selectedProducts.map((producto) => (
                                <Tr key={producto.productoId}>
                                    <Td>{producto.productoId}</Td>
                                    <Td>{producto.nombre}</Td>
                                    <Td textTransform={"capitalize"}>{producto.tipo_producto}</Td>
                                    <Td textAlign={"center"}>
                                        <IconButton
                                            aria-label={"Remover producto"}
                                            icon={<DeleteIcon />}
                                            colorScheme={"red"}
                                            size={"sm"}
                                            variant={"ghost"}
                                            onClick={() => handleRemoveProduct(producto.productoId)}
                                        />
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                ) : (
                    <Text color={"gray.500"}>Añade productos para verlos aquí.</Text>
                )}
            </Box>
        </Flex>
    );
}
