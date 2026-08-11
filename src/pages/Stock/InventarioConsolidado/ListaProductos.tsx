import {
    Steps,
    Box,
    Spinner,
    Text,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Flex,
    Menu,
    Button,
    useDisclosure,
    Portal,
} from "@chakra-ui/react";
import { useState } from 'react';
import axios from 'axios';
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import { ProductStockDTO } from '../types.tsx';
import BetterPagination from '../../../components/BetterPagination/BetterPagination.tsx';
import MovimientosExcelModal from './MovimientosExcelModal.tsx';

const endPoints = new EndPointsURL();

interface ListaProductosProps {
    productos: ProductStockDTO[];
    loadingProductos: boolean;
    pageProductos: number;
    totalPagesProductos: number;
    handlePageChangeProductos: (page: number) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
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
    handlePageChangeProductos,
    pageSize,
    onPageSizeChange,
}: ListaProductosProps) {
    const { open, onOpen, onClose } = useDisclosure();
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
                    <Box w={"full"}>
                        <Table.Root variant="striped" colorPalette="gray" size="sm" width="100%">
                            <Table.Header position="sticky" top={0} bg="app.tableHeaderSticky" zIndex={1}>
                                <Table.Row>
                                    <Table.ColumnHeader>ID</Table.ColumnHeader>
                                    <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                    <Table.ColumnHeader>Stock</Table.ColumnHeader>
                                    <Table.ColumnHeader>Unidades</Table.ColumnHeader>
                                    <Table.ColumnHeader>Menu</Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {productos.length === 0 ? (
                                    <Table.Row>
                                        <Table.Cell colSpan={5} textAlign="center">
                                            <Text py={2}>No se encontraron productos.</Text>
                                        </Table.Cell>
                                    </Table.Row>
                                ) : (
                                    productos.map((item) => (
                                        <Table.Row key={item.producto.productoId}>
                                            <Table.Cell>{item.producto.productoId}</Table.Cell>
                                            <Table.Cell>{item.producto.nombre}</Table.Cell>
                                            <Table.Cell>{item.stock}</Table.Cell>
                                            <Table.Cell>{item.producto.tipoUnidades}</Table.Cell>
                                            <Table.Cell>
                                                <Menu.Root>
                                                    <Menu.Trigger size="sm" colorPalette="teal" asChild><Button>Menu</Button></Menu.Trigger>
                                                    <Portal><Menu.Positioner><Menu.Content>
                                                                <Menu.Item
                                                                    onSelect={() => {
                                                                        setSelectedProductId(item.producto.productoId);
                                                                        onOpen();
                                                                    }}
                                                                    value='item-0'>
                                                                    Descargar Excel de movimientos
                                                                </Menu.Item>
                                                            </Menu.Content></Menu.Positioner></Portal>
                                                </Menu.Root>
                                            </Table.Cell>
                                        </Table.Row>
                                    ))
                                )}
                            </Table.Body>
                        </Table.Root>
                    </Box>
                )}
                <Box w="full" mt={6}>
                    <BetterPagination
                        page={pageProductos}
                        size={pageSize}
                        totalPages={totalPagesProductos}
                        loading={loadingProductos}
                        onPageChange={handlePageChangeProductos}
                        onSizeChange={onPageSizeChange}
                    />
                </Box>
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
