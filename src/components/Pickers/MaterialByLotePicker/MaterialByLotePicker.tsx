import React, { useState } from 'react';
import {
    Steps,
    Box,
    Button,
    Flex,
    HStack,
    Input,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Text,
    VStack,
    Field,
    Dialog,
    Portal,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';

const endPoints = new EndPointsURL();

export interface MaterialByLoteItem {
    productoId: string;
    productoNombre: string;
    tipoUnidades: string;
    loteId: number;
    batchNumber: string;
    cantidadDisponible: number;
}

interface MaterialByLotePickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectItem: (item: MaterialByLoteItem) => void;
}

const MaterialByLotePicker: React.FC<MaterialByLotePickerProps> = ({
    isOpen,
    onClose,
    onSelectItem,
}) => {
    const [searchText, setSearchText] = useState('');
    const [results, setResults] = useState<MaterialByLoteItem[]>([]);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const resultsPerPage = 10;
    const toast = useAppToast();

    const itemKey = (item: MaterialByLoteItem) => `${item.productoId}|${item.loteId}`;

    const handleSearch = async () => {
        if (!searchText.trim()) return;
        setIsLoading(true);
        try {
            const response = await axios.get(endPoints.averias_almacen_search_material_by_lote, {
                params: { batchNumber: searchText.trim() },
            });
            setResults(response.data);
            setSelectedKey(null);
            setCurrentPage(1);
        } catch (error) {
            console.error('Error searching materiales by lote:', error);
            toast({
                title: 'Error',
                description: 'Error al buscar materiales por lote.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const onKeyDown_InputBuscar = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && !isLoading) {
            handleSearch();
        }
    };

    const handleConfirm = () => {
        if (selectedKey !== null) {
            const item = results.find((r) => itemKey(r) === selectedKey);
            if (item) {
                onSelectItem(item);
            }
        }
        onClose();
    };

    const totalPages = Math.ceil(results.length / resultsPerPage);
    const startIndex = (currentPage - 1) * resultsPerPage;
    const currentResults = results.slice(startIndex, startIndex + resultsPerPage);

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <Dialog.Root open={isOpen} size='xl' onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>Buscar Material por Lote</Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body>
                            <VStack gap={4}>
                                <Field.Root>
                                    <Field.Label>Buscar por Número de Lote</Field.Label>
                                    <HStack>
                                        <Input
                                            value={searchText}
                                            onValueChange={(e) => setSearchText(e.target.value)}
                                            onKeyDown={onKeyDown_InputBuscar}
                                            placeholder="Ingrese número de lote (parcial o completo)"
                                            disabled={isLoading}
                                        />
                                        <Button
                                            colorPalette="blue"
                                            onClick={handleSearch}
                                            loading={isLoading}
                                            loadingText="Buscando"
                                        >
                                            Buscar
                                        </Button>
                                    </HStack>
                                </Field.Root>
                                <Box w="full" overflowX="auto">
                                    {results.length > 0 ? (
                                        <>
                                            <Table.Root variant="simple" size="sm">
                                                <Table.Header>
                                                    <Table.Row>
                                                        <Table.ColumnHeader>Código</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Lote</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Unidades</Table.ColumnHeader>
                                                        <Table.ColumnHeader textAlign='end'>Cantidad Disponible</Table.ColumnHeader>
                                                    </Table.Row>
                                                </Table.Header>
                                                <Table.Body>
                                                    {currentResults.map((item) => {
                                                        const key = itemKey(item);
                                                        return (
                                                            <Table.Row
                                                                key={key}
                                                                onClick={() => setSelectedKey(key)}
                                                                bg={selectedKey === key ? 'blue.100' : 'transparent'}
                                                                _hover={{ bg: selectedKey === key ? 'blue.200' : 'gray.100', cursor: 'pointer' }}
                                                            >
                                                                <Table.Cell>{item.productoId}</Table.Cell>
                                                                <Table.Cell>{item.productoNombre}</Table.Cell>
                                                                <Table.Cell>{item.batchNumber}</Table.Cell>
                                                                <Table.Cell>{item.tipoUnidades}</Table.Cell>
                                                                <Table.Cell textAlign='end'>{item.cantidadDisponible.toFixed(2)}</Table.Cell>
                                                            </Table.Row>
                                                        );
                                                    })}
                                                </Table.Body>
                                            </Table.Root>

                                            {totalPages > 1 && (
                                                <Flex justifyContent="center" mt={4}>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => goToPage(currentPage - 1)}
                                                        disabled={currentPage === 1}
                                                        mr={2}
                                                    >
                                                        Anterior
                                                    </Button>
                                                    <Text alignSelf="center" mx={2}>
                                                        Página {currentPage} de {totalPages}
                                                    </Text>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => goToPage(currentPage + 1)}
                                                        disabled={currentPage === totalPages}
                                                        ml={2}
                                                    >
                                                        Siguiente
                                                    </Button>
                                                </Flex>
                                            )}
                                        </>
                                    ) : (
                                        <Text textAlign="center" color="gray.500">
                                            No hay resultados. Busque por número de lote.
                                        </Text>
                                    )}
                                </Box>
                            </VStack>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button
                                colorPalette="blue"
                                mr={3}
                                onClick={handleConfirm}
                                disabled={selectedKey === null}
                            >
                                Confirmar
                            </Button>
                            <Button variant="ghost" onClick={onClose}>
                                Cancelar
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
};

export default MaterialByLotePicker;
