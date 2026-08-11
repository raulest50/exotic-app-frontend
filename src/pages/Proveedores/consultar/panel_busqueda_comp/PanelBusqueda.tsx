import { useState, useEffect } from "react";
import { Proveedor, DTO_SearchProveedor, TIPO_BUSQUEDA } from "../../types.tsx";
import {
    Steps,
    Flex,
    Input,
    Stack,
    CheckboxGroup,
    Checkbox,
    Button,
    Box,
    NativeSelect,
    useToast,
    Field,
} from "@chakra-ui/react";

import MyPagination from "../../../../components/MyPagination.tsx";
import { ListaSearchProveedores } from "./ListaSearchProveedores.tsx";
import axios from "axios";
import EndPointsURL from "../../../../api/EndPointsURL.tsx";

type Props = {
    setEstado: (estado: number) => void;
    setProveedorSeleccionado: (proveedor: Proveedor) => void;
}


export default function PanelBusqueda({setEstado, setProveedorSeleccionado}: Props) {
    const toast = useToast();
    const endpoints = new EndPointsURL();

    // Search states
    const [searchType, setSearchType] = useState(TIPO_BUSQUEDA.ID);
    const [searchText, setSearchText] = useState("");
    const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);

    // Pagination states
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 10;

    // Category definitions
    const categoryOptions = [
        { id: 0, name: 'Servicios Operativos' },
        { id: 1, name: 'Materias Primas' },
        { id: 2, name: 'Materiales de empaque' },
        { id: 3, name: 'Servicios administrativos' },
        { id: 4, name: 'Equipos y otros servicios' }
    ];

    // Fetch providers on initial load
    useEffect(() => {
        if (searchText.trim()) {
            fetchProveedores(0);
        }
    }, []);

    const verDetalleProveedor = (proveedor: Proveedor) => {
        setProveedorSeleccionado(proveedor);
        setEstado(1);
    }

    const fetchProveedores = async (pageNumber: number) => {

        setLoading(true);
        setPage(pageNumber);

        try {
            const searchDTO: DTO_SearchProveedor = {
                id: searchType === TIPO_BUSQUEDA.ID ? searchText : '',
                nombre: searchType === TIPO_BUSQUEDA.ID ? '' : searchText,
                categorias: selectedCategories,
                searchType: searchType
            };

            const response = await axios.post(
                endpoints.search_proveedores_pag,
                searchDTO,
                {
                    params:{
                        page: pageNumber,
                        size: pageSize,
                    }
                }
            );

            setProveedores(response.data.content);
            setTotalPages(response.data.totalPages);
        } catch (error) {
            console.error("Error fetching providers:", error);
            toast({
                title: "Error al buscar proveedores",
                description: "Ocurrió un error al buscar proveedores. Por favor, intente nuevamente.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            setProveedores([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    // Handle page changes from the pagination component
    const handlePageChange = (newPage: number) => {
        fetchProveedores(newPage);
    };

    // Handle category selection
    const handleCategoryChange = (values: string[]) => {
        setSelectedCategories(values.map(Number));
    };

    // Handle search button click
    const handleSearch = () => {
        fetchProveedores(0);
    };

    return (
        <Flex direction={"column"} p={4}>
            <Box p={4} borderWidth="1px" borderRadius="lg" mb={4}>

                <Flex direction={"row"} gap={5}>

                    <Flex direction={"column"} flex={2} mb={4} gap={2}>

                        <Field.Root mb={4} >
                            <Field.Label>{searchType === 'ID' ? 'ID del Proveedor' : 'Nombre del Proveedor'}</Field.Label>
                            <Input
                                placeholder={searchType === 'ID' ? "Ingrese el ID del proveedor" : "Ingrese el nombre del proveedor"}
                                value={searchText}
                                onValueChange={(e) => setSearchText(e.target.value)}
                            />
                        </Field.Root>

                        <Flex direction={"row"} gap={5} alignItems="center">

                            <Field.Root mb={4} flex={1} >
                                <Field.Label>Tipo de Búsqueda</Field.Label>
                                <NativeSelect.Root>
                                    <NativeSelect.Field value={searchType} onValueChange={(e) => setSearchType(e.target.value)}>
                                        <option value={TIPO_BUSQUEDA.ID}>ID</option>
                                        <option value={TIPO_BUSQUEDA.NOMBRE_Y_CATEGORIA}>Nombre y Categorías</option>
                                    </NativeSelect.Field>
                                    <NativeSelect.Indicator />
                                </NativeSelect.Root>
                            </Field.Root>

                            <Button
                                colorPalette="blue"
                                onClick={handleSearch}
                                loading={loading}
                                mt={2}
                                flex={1}
                            >
                                Buscar
                            </Button>
                        </Flex>

                    </Flex>

                    <Field.Root mb={4} flex={1} disabled={searchType === TIPO_BUSQUEDA.ID} >
                        <Field.Label>Categorías</Field.Label>
                        <CheckboxGroup
                            colorPalette="green"
                            value={selectedCategories.map(String)}
                            onValueChange={handleCategoryChange}
                        >
                            <Stack gap={2}>
                                {categoryOptions.map(category => (
                                    <Checkbox.Root key={category.id} value={category.id.toString()}><Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Label>
                                        {category.name}
                                    </Checkbox.Label></Checkbox.Root>
                                ))}
                            </Stack>
                        </CheckboxGroup>
                    </Field.Root>

                </Flex>

            </Box>

            <Box mb={4}>
                <ListaSearchProveedores 
                    proveedores={proveedores} 
                    onVerDetalle={verDetalleProveedor}
                />
            </Box>

            {totalPages > 1 && (
                <MyPagination
                    page={page}
                    totalPages={totalPages}
                    loading={loading}
                    handlePageChange={handlePageChange}
                />
            )}
        </Flex>
    );
}
