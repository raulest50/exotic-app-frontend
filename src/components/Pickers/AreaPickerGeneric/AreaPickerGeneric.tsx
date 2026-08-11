// src/components/AreaPickerGeneric/AreaPickerGeneric.tsx

import React, { useState } from 'react';
import {
    Steps,
    Box,
    Button,
    Input,
    VStack,
    HStack,
    Text,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Flex,
    Field,
    Dialog,
    Portal,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from 'axios';
import EndPointsURL from "../../../api/EndPointsURL.tsx";

const endPoints = new EndPointsURL();

// Interface for AreaProduccion based on the backend model
interface AreaProduccion {
    areaId: number;
    nombre: string;
    descripcion: string;
    responsableArea?: any; // We don't need the full User type here
}

// DTO for searching AreaProduccion
interface SearchAreaProduccionDTO {
    nombre: string;
}

interface AreaPickerGenericProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectArea: (area: AreaProduccion) => void;
}

const AreaPickerGeneric: React.FC<AreaPickerGenericProps> = ({
    isOpen,
    onClose,
    onSelectArea,
}) => {
    const [searchText, setSearchText] = useState('');
    const [areas, setAreas] = useState<AreaProduccion[]>([]);
    const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const resultsPerPage = 10;
    const toast = useAppToast();

    const handleSearch = async () => {
        setIsLoading(true);
        try {
            const searchDTO: SearchAreaProduccionDTO = {
                nombre: searchText
            };

            const response = await axios.post(endPoints.area_prod_search_by_name, searchDTO, {
                params: {
                    page: 0,
                    size: 100
                }
            });
            setAreas(response.data);
            setSelectedAreaId(null); // Reset selection on new search
            setCurrentPage(1); // Reset to first page on new search
        } catch (error) {
            console.error('Error searching Areas:', error);
            toast({
                title: 'Error',
                description: 'Error al buscar áreas de producción.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = () => {
        if (selectedAreaId !== null) {
            const area = areas.find((a) => a.areaId === selectedAreaId);
            if (area) {
                onSelectArea(area);
            }
        }
        onClose();
    };

    const handleCancel = () => {
        onClose();
    };

    const onKeyPress_InputBuscar = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && !isLoading) {
            handleSearch();
        }
    };

    // Calculate pagination
    const totalPages = Math.ceil(areas.length / resultsPerPage);
    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    const currentAreas = areas.slice(startIndex, endIndex);

    // Handle pagination
    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <Dialog.Root open={isOpen} size='lg' onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>Seleccionar Área de Producción</Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body>
                            <VStack gap={4}>
                                <Field.Root>
                                    <Field.Label>Buscar Área</Field.Label>
                                    <HStack>
                                        <Input
                                            value={searchText}
                                            onValueChange={(e) => setSearchText(e.target.value)}
                                            onKeyDown={onKeyPress_InputBuscar}
                                            placeholder="Ingrese nombre del área"
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
                                    {areas.length > 0 ? (
                                        <>
                                            <Table.Root variant="simple" size="sm">
                                                <Table.Header>
                                                    <Table.Row>
                                                        <Table.ColumnHeader>ID</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Descripción</Table.ColumnHeader>
                                                    </Table.Row>
                                                </Table.Header>
                                                <Table.Body>
                                                    {currentAreas.map((area) => (
                                                        <Table.Row 
                                                            key={area.areaId} 
                                                            onClick={() => setSelectedAreaId(area.areaId)}
                                                            bg={selectedAreaId === area.areaId ? "teal.100" : "transparent"}
                                                            _hover={{ bg: "gray.100", cursor: "pointer" }}
                                                        >
                                                            <Table.Cell>{area.areaId}</Table.Cell>
                                                            <Table.Cell>{area.nombre}</Table.Cell>
                                                            <Table.Cell>{area.descripcion}</Table.Cell>
                                                        </Table.Row>
                                                    ))}
                                                </Table.Body>
                                            </Table.Root>

                                            {/* Pagination controls */}
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
                                        <Text textAlign="center">No hay áreas para mostrar</Text>
                                    )}
                                </Box>
                            </VStack>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button 
                                colorPalette="teal" 
                                mr={3} 
                                onClick={handleConfirm}
                                disabled={selectedAreaId === null}
                            >
                                Aceptar
                            </Button>
                            <Button variant="ghost" onClick={handleCancel}>
                                Cancelar
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
};

export default AreaPickerGeneric;
