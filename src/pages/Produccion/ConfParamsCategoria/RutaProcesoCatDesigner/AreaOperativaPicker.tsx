import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import EndPointsURL from '../../../../api/EndPointsURL.tsx';
import {
    CloseButton,
    Button,
    Input,
    InputGroup,
    Table,
    Spinner,
    Flex,
    Text,
    Box,
    Dialog,
    Portal,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import MyPagination from '../../../../components/MyPagination.tsx';
import { AreaOperativa } from './types.ts';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (area: AreaOperativa) => void;
    disabledAreaIds?: number[];
}

const PAGE_SIZE = 5;

export default function AreaOperativaPicker({
    isOpen,
    onClose,
    onSelect,
    disabledAreaIds = [],
}: Props) {
    const [areas, setAreas] = useState<AreaOperativa[]>([]);
    const [searchNombre, setSearchNombre] = useState('');
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [selectedArea, setSelectedArea] = useState<AreaOperativa | null>(null);
    const endPoints = new EndPointsURL();
    const toast = useAppToast();

    const fetchAreas = useCallback(
        async (pageNumber: number) => {
            setLoading(true);
            try {
                const response = await axios.post(
                    endPoints.search_areas_operativas,
                    {
                        searchType: 'NOMBRE',
                        nombre: searchNombre.trim() || null
                    },
                    { params: { page: pageNumber, size: PAGE_SIZE } }
                );
                setAreas(response.data.content);
                setTotalPages(response.data.totalPages);
                setPage(pageNumber);
            } catch (err) {
                console.error('Error fetching areas operativas:', err);
                toast({
                    title: 'Error',
                    description: 'No se pudieron cargar las áreas operativas',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
            } finally {
                setLoading(false);
            }
        },
        [searchNombre, endPoints.search_areas_operativas, toast]
    );

    useEffect(() => {
        if (isOpen) {
            fetchAreas(0);
            setSelectedArea(null);
        }
    }, [fetchAreas, isOpen]);

    const handleSearch = () => {
        fetchAreas(0);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleConfirm = () => {
        if (selectedArea && !disabledAreaIds.includes(selectedArea.areaId)) {
            onSelect(selectedArea);
            onClose();
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
                    <Dialog.Content maxW="xl">
                        <Dialog.Header><Dialog.Title>Seleccionar Area Operativa</Dialog.Title></Dialog.Header>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton aria-label="Cerrar" size="sm" />
                        </Dialog.CloseTrigger>
                        <Dialog.Body>
                            <Box mb={4}>
                                <InputGroup
                                    endElement={(
                                        <Button
                                            colorPalette="blue"
                                            size="sm"
                                            onClick={handleSearch}
                                            loading={loading}
                                        >
                                            Buscar
                                        </Button>
                                    )}
                                    endElementProps={{ width: "auto", px: 2 }}
                                >
                                    <Input
                                        value={searchNombre}
                                        onChange={(e) => setSearchNombre(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Buscar por nombre..."
                                        pe="5rem"
                                    />
                                </InputGroup>
                            </Box>

                            {loading ? (
                                <Flex justify="center" py={8}>
                                    <Spinner size="lg" />
                                </Flex>
                            ) : areas.length === 0 ? (
                                <Text textAlign="center" py={4} color="gray.500">
                                    No se encontraron áreas operativas
                                </Text>
                            ) : (
                                <>
                                    <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
                                        <Table.Root variant="line" size="sm">
                                            <Table.Header>
                                                <Table.Row>
                                                    <Table.ColumnHeader>ID</Table.ColumnHeader>
                                                    <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                                    <Table.ColumnHeader>Descripcion</Table.ColumnHeader>
                                                </Table.Row>
                                            </Table.Header>
                                            <Table.Body>
                                                {areas.map((area) => {
                                                    const isDisabled = disabledAreaIds.includes(area.areaId);
                                                    return (
                                                        <Table.Row
                                                            key={area.areaId}
                                                            cursor={isDisabled ? 'not-allowed' : 'pointer'}
                                                            bg={selectedArea?.areaId === area.areaId ? 'purple.100' : 'white'}
                                                            _hover={isDisabled ? undefined : { bg: 'purple.50' }}
                                                            opacity={isDisabled ? 0.5 : 1}
                                                            onClick={() => {
                                                                if (!isDisabled) {
                                                                    setSelectedArea(area);
                                                                }
                                                            }}
                                                        >
                                                            <Table.Cell>{area.areaId}</Table.Cell>
                                                            <Table.Cell fontWeight={selectedArea?.areaId === area.areaId ? 'bold' : 'normal'}>
                                                                {area.nombre}
                                                            </Table.Cell>
                                                            <Table.Cell>{isDisabled ? 'Ya está en la ruta' : area.descripcion || '-'}</Table.Cell>
                                                        </Table.Row>
                                                    );
                                                })}
                                            </Table.Body>
                                        </Table.Root>
                                    </Box>
                                    {totalPages > 1 && (
                                        <Box mt={4}>
                                            <MyPagination
                                                page={page}
                                                totalPages={totalPages}
                                                loading={loading}
                                                handlePageChange={fetchAreas}
                                            />
                                        </Box>
                                    )}
                                </>
                            )}
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button variant="ghost" mr={3} onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button
                                colorPalette="purple"
                                onClick={handleConfirm}
                                disabled={!selectedArea || disabledAreaIds.includes(selectedArea.areaId)}
                            >
                                Confirmar
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
}
