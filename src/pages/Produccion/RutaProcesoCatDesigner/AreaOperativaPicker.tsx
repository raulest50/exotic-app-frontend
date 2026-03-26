import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalCloseButton,
    Button,
    Input,
    InputGroup,
    InputRightElement,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Spinner,
    Flex,
    Text,
    useToast,
    Box,
} from '@chakra-ui/react';
import MyPagination from '../../../components/MyPagination.tsx';
import { AreaOperativa } from './types.ts';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (area: AreaOperativa) => void;
}

const PAGE_SIZE = 5;

export default function AreaOperativaPicker({ isOpen, onClose, onSelect }: Props) {
    const [areas, setAreas] = useState<AreaOperativa[]>([]);
    const [searchNombre, setSearchNombre] = useState('');
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [selectedArea, setSelectedArea] = useState<AreaOperativa | null>(null);
    const endPoints = new EndPointsURL();
    const toast = useToast();

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
    }, [isOpen]);

    const handleSearch = () => {
        fetchAreas(0);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleConfirm = () => {
        if (selectedArea) {
            onSelect(selectedArea);
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Seleccionar Area Operativa</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <Box mb={4}>
                        <InputGroup>
                            <Input
                                value={searchNombre}
                                onChange={(e) => setSearchNombre(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Buscar por nombre..."
                            />
                            <InputRightElement width="auto" px={2}>
                                <Button
                                    colorScheme="blue"
                                    size="sm"
                                    onClick={handleSearch}
                                    isLoading={loading}
                                >
                                    Buscar
                                </Button>
                            </InputRightElement>
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
                                <Table variant="simple" size="sm">
                                    <Thead>
                                        <Tr>
                                            <Th>ID</Th>
                                            <Th>Nombre</Th>
                                            <Th>Descripcion</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {areas.map((area) => (
                                            <Tr
                                                key={area.areaId}
                                                cursor="pointer"
                                                bg={selectedArea?.areaId === area.areaId ? 'purple.100' : 'white'}
                                                _hover={{ bg: 'purple.50' }}
                                                onClick={() => setSelectedArea(area)}
                                            >
                                                <Td>{area.areaId}</Td>
                                                <Td fontWeight={selectedArea?.areaId === area.areaId ? 'bold' : 'normal'}>
                                                    {area.nombre}
                                                </Td>
                                                <Td>{area.descripcion || '-'}</Td>
                                            </Tr>
                                        ))}
                                    </Tbody>
                                </Table>
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
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        colorScheme="purple"
                        onClick={handleConfirm}
                        isDisabled={!selectedArea}
                    >
                        Confirmar
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
