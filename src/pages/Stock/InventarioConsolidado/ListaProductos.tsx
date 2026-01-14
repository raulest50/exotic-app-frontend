import {
    Box, Spinner, Text,
    Table, Thead, Tbody, Tr, Th, Td, Flex,
    Menu, MenuButton, MenuList, MenuItem, Button,
    useDisclosure
} from "@chakra-ui/react";
import { useState } from 'react';
import axios from 'axios';
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import { ProductStockDTO } from '../types.tsx';
import MyPagination from '../../../components/MyPagination.tsx';
import MovimientosExcelModal from './MovimientosExcelModal.tsx';

const endPoints = new EndPointsURL();

interface ListaProductosProps {
    productos: ProductStockDTO[];
    loadingProductos: boolean;
    pageProductos: number;
    totalPagesProductos: number;
    handlePageChangeProductos: (page: number) => void;
}

/**
 * Displays the product stock table and allows exporting movement history to Excel.
 *
 * When the user chooses to export, a modal is presented to capture the desired
 * date range before generating the file.
 */
function ListaProductos({
    productos,
    loadingProductos,
    pageProductos,
    totalPagesProductos,
    handlePageChangeProductos
}: ListaProductosProps) {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

    /**
     * Requests the Excel file for a product within the provided date range.
     */
    const handleDownloadExcel = async (productoId: number, start: string, end: string) => {
        try {
            const response = await axios.post(
                endPoints.exportar_movimientos_excel,
                {
                    productoId: productoId.toString(),
                    startDate: start,
                    endDate: end,
                },
                { responseType: 'blob' }
            );
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'movimientos.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading Excel:', error);
        }
    };

    /**
     * Receives the date range selected in the modal and triggers the export.
     */
    const handleConfirmDownload = async (start: string, end: string) => {
        if (selectedProductId) {
            await handleDownloadExcel(selectedProductId, start, end);
        }
    };

    return (
        <>
            <Flex
                direction={"column"}
                flex={1}
                w={"full"}
                mr={{ base: 0, md: 4 }}
                mb={{ base: 4, md: 0 }}
            >
                {loadingProductos ? (
                    <Spinner />
                ) : (
                    <>
                        <Box w={"full"}>
                            <Table variant="striped" colorScheme="gray" size="sm" width="100%">
                                <Thead position="sticky" top={0} bg="white" zIndex={1}>
                                    <Tr>
                                        <Th>ID</Th>
                                        <Th>Nombre</Th>
                                        <Th>Stock</Th>
                                        <Th>Unidades</Th>
                                        <Th>Menu</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {productos.length === 0 ? (
                                        <Tr>
                                            <Td colSpan={5} textAlign="center">
                                                <Text py={2}>No se encontraron productos.</Text>
                                            </Td>
                                        </Tr>
                                    ) : (
                                        productos.map((item) => (
                                            <Tr key={item.producto.productoId}>
                                                <Td>{item.producto.productoId}</Td>
                                                <Td>{item.producto.nombre}</Td>
                                                <Td>{item.stock}</Td>
                                                <Td>{item.producto.tipoUnidades}</Td>
                                                <Td>
                                                    <Menu>
                                                        <MenuButton as={Button} size="sm" colorScheme="teal">Menu</MenuButton>
                                                        <MenuList>
                                                            <MenuItem onClick={() => {
                                                                setSelectedProductId(item.producto.productoId);
                                                                onOpen();
                                                            }}>
                                                                Descargar Excel de movimientos
                                                            </MenuItem>
                                                        </MenuList>
                                                    </Menu>
                                                </Td>
                                            </Tr>
                                        ))
                                    )}
                                </Tbody>
                            </Table>
                        </Box>
                        <MyPagination
                            page={pageProductos}
                            totalPages={totalPagesProductos}
                            loading={loadingProductos}
                            handlePageChange={handlePageChangeProductos}
                        />
                    </>
                )}
            </Flex>
            <MovimientosExcelModal
                isOpen={isOpen}
                onClose={onClose}
                onConfirm={handleConfirmDownload}
            />
        </>
    );
}

export default ListaProductos;
