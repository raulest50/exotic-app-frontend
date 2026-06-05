import React, { useState } from 'react';
import {
    Flex,
    VStack,
    HStack,
    Input,
    Select,
    List,
    ListItem,
    Text,
    Heading,
    Button,
    Box,
    useToast,
    useDisclosure,
} from '@chakra-ui/react';
import axios from 'axios';
import DateRangePicker from '../../components/DateRangePicker';
import CompraItemsDialog from './components/CompraItemsDialog.tsx';
import MyPagination from '../../components/MyPagination';
import EndPointsURL from "../../api/EndPointsURL.tsx";

interface Proveedor {
    id: number; // NIT
    nombre: string;
    // Add other fields as needed
}

interface Compra {
    compraId: number;
    fechaCompra: string;
    estado: number;
    // other fields...
}

const endPoints = new EndPointsURL();

function HistorialCompras() {
    // State variables for Proveedores
    const [searchType, setSearchType] = useState('nombre');
    const [searchText, setSearchText] = useState('');
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null);
    const [provPage, setProvPage] = useState(0);
    const [provTotalPages, setProvTotalPages] = useState(0);
    const [provLoading, setProvLoading] = useState(false);

    // State variables for compras
    const [date1, setDate1] = useState('');
    const [date2, setDate2] = useState('');
    const [compras, setCompras] = useState<Compra[]>([]);
    const [compraPage, setCompraPage] = useState(0);
    const [compraTotalPages, setCompraTotalPages] = useState(0);
    const [compraLoading, setCompraLoading] = useState(false);

    const [selectedCompra, setSelectedCompra] = useState<Compra | null>(null);
    const [itemsCompra, setItemsCompra] = useState([]);
    const { isOpen, onOpen, onClose } = useDisclosure();

    const toast = useToast();

    // Function to search Proveedores with pagination
    const searchProveedores = async (pageNumber = 0) => {
        setProvLoading(true);
        try {
            const response = await axios.get(endPoints.search_proveedores_pag, {
                params: {
                    q: searchText,
                    searchType: searchType,
                    page: pageNumber,
                    size: 10, // You can adjust the page size as needed
                },
            });
            setProveedores(response.data.content);
            setProvTotalPages(response.data.totalPages);
            setProvPage(response.data.number);
        } catch (error) {
            console.error('Error fetching Proveedores:', error);
            toast({
                title: 'Error',
                description: 'No se pudieron obtener los Proveedores.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setProvLoading(false);
        }
    };

    // Handle Enter key press in search input
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            searchProveedores();
        }
    };

    // Function to fetch compras for selected proveedor and date range with pagination
    const fetchCompras = async (pageNumber = 0) => {
        if (!selectedProveedor) {
            toast({
                title: 'Proveedor no seleccionado',
                description: 'Por favor, seleccione un proveedor.',
                status: 'warning',
                duration: 5000,
                isClosable: true,
            });
            return;
        }
        setCompraLoading(true);
        try {
            const response = await axios.get(endPoints.byProveedorAndDate, {
                params: {
                    proveedorId: selectedProveedor.id,
                    date1,
                    date2,
                    page: pageNumber,
                    size: 10, // Adjust as needed
                },
            });
            setCompras(response.data.content);
            setCompraTotalPages(response.data.totalPages);
            setCompraPage(response.data.number);
        } catch (error) {
            console.error('Error fetching compras:', error);
            toast({
                title: 'Error',
                description: 'No se pudieron obtener las compras.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setCompraLoading(false);
        }
    };

    // Function to fetch itemsCompra for selected compra
    const fetchItemsCompra = async (compraId: number) => {
        try {
            const response = await axios.get(endPoints.get_compra_items_by_compra_id.replace("{compraId}", compraId.toString()));
            setItemsCompra(response.data);
            onOpen();
        } catch (error) {
            console.error('Error fetching items de compra:', error);
            toast({
                title: 'Error',
                description: 'No se pudieron obtener los items de la compra.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    // Handle double-click on a compra
    const handleCompraDoubleClick = (compra: Compra) => {
        setSelectedCompra(compra);
        fetchItemsCompra(compra.compraId);
    };

    // Handle page change for Proveedores
    const handleProvPageChange = (newPage: number) => {
        searchProveedores(newPage);
    };

    // Handle page change for compras
    const handleCompraPageChange = (newPage: number) => {
        fetchCompras(newPage);
    };

    return (
        <Flex w="full" h="full">
            {/* Left Panel */}
            <VStack w="50%" p={4} align="start">
                <Heading size="md">Buscar Proveedor</Heading>
                <HStack w="full">
                    <Select value={searchType} onChange={(e) => setSearchType(e.target.value)}>
                        <option value="nombre">Nombre</option>
                        <option value="nit">NIT</option>
                    </Select>
                    <Input
                        placeholder="Buscar..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onKeyDown={handleKeyPress}
                    />
                </HStack>
                <Box w="full" h="full" overflowY="auto">
                    <List spacing={3}>
                        {proveedores.map((proveedor) => (
                            <ListItem
                                key={proveedor.id}
                                cursor="pointer"
                                onClick={() => setSelectedProveedor(proveedor)}
                                bg={selectedProveedor?.id === proveedor.id ? 'teal.100' : 'white'}
                                p={2}
                                borderRadius="md"
                                _hover={{ bg: 'app.rowSelectedTeal' }}
                            >
                                <Text>
                                    <strong>{proveedor.nombre}</strong> (NIT: {proveedor.id})
                                </Text>
                            </ListItem>
                        ))}
                    </List>
                    {/* Pagination for Proveedores */}
                    <MyPagination
                        page={provPage}
                        totalPages={provTotalPages}
                        loading={provLoading}
                        handlePageChange={handleProvPageChange}
                    />
                </Box>
            </VStack>

            {/* Right Panel */}
            <VStack w="50%" p={4} align="start">
                <Heading size="md">Compras</Heading>
                <HStack w="full" align="center">
                    <DateRangePicker
                        date1={date1}
                        setDate1={setDate1}
                        date2={date2}
                        setDate2={setDate2}
                        flex_direction="row"
                    />
                    <Button colorScheme="teal" onClick={() => fetchCompras(0)}>
                        Filtrar
                    </Button>
                </HStack>
                <Box w="full" h="full" overflowY="auto">
                    <List spacing={3}>
                        {compras.map((compra) => (
                            <ListItem
                                key={compra.compraId}
                                p={2}
                                borderRadius="md"
                                bg="app.surfaceSubtle"
                                _hover={{ bg: 'app.rowHoverStrong' }}
                                cursor="pointer"
                                onDoubleClick={() => handleCompraDoubleClick(compra)}
                            >
                                <Text>
                                    <strong>Compra ID:</strong> {compra.compraId}
                                </Text>
                                <Text>
                                    <strong>Fecha:</strong> {new Date(compra.fechaCompra).toLocaleDateString()}
                                </Text>
                                <Text>
                                    <strong>Estado:</strong> {compra.estado === 0 ? 'Abierta' : 'Cerrada'}
                                </Text>
                            </ListItem>
                        ))}
                    </List>
                    {/* Pagination for Compras */}
                    <MyPagination
                        page={compraPage}
                        totalPages={compraTotalPages}
                        loading={compraLoading}
                        handlePageChange={handleCompraPageChange}
                    />
                </Box>
            </VStack>

            {/* Dialog to show itemsCompra */}
            {selectedCompra && (
                <CompraItemsDialog isOpen={isOpen} onClose={onClose} itemsCompra={itemsCompra} />
            )}
        </Flex>
    );
}

export default HistorialCompras;
