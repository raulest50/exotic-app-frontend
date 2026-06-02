import { type KeyboardEvent, useEffect, useState } from 'react';
import {
    Badge,
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    HStack,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    useToast,
    VStack,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import {
    EstadoIntegrante,
    getEstadoIntegranteText,
    IntegrantePersonal,
} from '../../../pages/Personal/types.tsx';

interface IntegrantePersonalPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectIntegrante: (integrante: IntegrantePersonal) => void;
    initialSelectedId?: number;
}

interface IntegrantesPersonalPage {
    content: IntegrantePersonal[];
}

const endPoints = new EndPointsURL();

const IntegrantePersonalPicker = ({
    isOpen,
    onClose,
    onSelectIntegrante,
    initialSelectedId,
}: IntegrantePersonalPickerProps) => {
    const [searchText, setSearchText] = useState('');
    const [integrantes, setIntegrantes] = useState<IntegrantePersonal[]>([]);
    const [selectedIntegranteId, setSelectedIntegranteId] = useState<number | null>(initialSelectedId ?? null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const resultsPerPage = 10;
    const toast = useToast();

    useEffect(() => {
        if (isOpen) {
            setSelectedIntegranteId(initialSelectedId ?? null);
        }
    }, [initialSelectedId, isOpen]);

    const handleSearch = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get<IntegrantesPersonalPage | IntegrantePersonal[]>(
                endPoints.search_integrantes_personal,
                {
                    params: {
                        q: searchText,
                        page: 0,
                        size: 50,
                    },
                }
            );
            const data = response.data;
            const results = Array.isArray(data) ? data : data.content ?? [];
            const activeResults = results.filter((integrante) => integrante.estado === EstadoIntegrante.ACTIVO);
            setIntegrantes(activeResults);
            setSelectedIntegranteId(initialSelectedId ?? null);
            setCurrentPage(1);
        } catch (error) {
            console.error('Error searching integrantes de personal:', error);
            toast({
                title: 'Error',
                description: 'Error al buscar integrantes de personal.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = () => {
        const integrante = integrantes.find((item) => item.id === selectedIntegranteId);
        if (integrante) {
            onSelectIntegrante(integrante);
            onClose();
        }
    };

    const handleCancel = () => {
        onClose();
    };

    const onKeyPressInputBuscar = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && !isLoading) {
            handleSearch();
        }
    };

    const totalPages = Math.ceil(integrantes.length / resultsPerPage);
    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    const currentIntegrantes = integrantes.slice(startIndex, endIndex);
    const selectedIntegrante = integrantes.find((item) => item.id === selectedIntegranteId);

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="5xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Seleccionar integrante</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={4}>
                        <FormControl>
                            <FormLabel>Buscar integrante</FormLabel>
                            <HStack>
                                <Input
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    onKeyDown={onKeyPressInputBuscar}
                                    placeholder="Ingrese cédula, nombre o apellido"
                                    isDisabled={isLoading}
                                />
                                <Button
                                    leftIcon={<SearchIcon />}
                                    colorScheme="blue"
                                    onClick={handleSearch}
                                    isLoading={isLoading}
                                    loadingText="Buscando"
                                >
                                    Buscar
                                </Button>
                            </HStack>
                        </FormControl>
                        <Box w="full" overflowX="auto">
                            {integrantes.length > 0 ? (
                                <>
                                    <Table variant="simple" size="sm">
                                        <Thead>
                                            <Tr>
                                                <Th>Cédula</Th>
                                                <Th>Nombres</Th>
                                                <Th>Apellidos</Th>
                                                <Th>Cargo</Th>
                                                <Th>Departamento</Th>
                                                <Th>Estado</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {currentIntegrantes.map((integrante) => (
                                                <Tr
                                                    key={integrante.id}
                                                    onClick={() => setSelectedIntegranteId(integrante.id)}
                                                    bg={selectedIntegranteId === integrante.id ? 'teal.100' : 'transparent'}
                                                    _hover={{ bg: 'gray.100', cursor: 'pointer' }}
                                                >
                                                    <Td>{integrante.id}</Td>
                                                    <Td>{integrante.nombres}</Td>
                                                    <Td>{integrante.apellidos}</Td>
                                                    <Td>{integrante.cargo ?? '-'}</Td>
                                                    <Td>{integrante.departamento ?? '-'}</Td>
                                                    <Td>
                                                        <Badge colorScheme="green">
                                                            {getEstadoIntegranteText(integrante.estado)}
                                                        </Badge>
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </Tbody>
                                    </Table>

                                    {totalPages > 1 && (
                                        <Flex justifyContent="center" mt={4}>
                                            <Button
                                                size="sm"
                                                onClick={() => goToPage(currentPage - 1)}
                                                isDisabled={currentPage === 1}
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
                                                isDisabled={currentPage === totalPages}
                                                ml={2}
                                            >
                                                Siguiente
                                            </Button>
                                        </Flex>
                                    )}
                                </>
                            ) : (
                                <Text textAlign="center">No hay integrantes activos para mostrar</Text>
                            )}
                        </Box>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button
                        colorScheme="teal"
                        mr={3}
                        onClick={handleConfirm}
                        isDisabled={!selectedIntegrante}
                    >
                        Confirmar
                    </Button>
                    <Button variant="ghost" onClick={handleCancel}>
                        Cancelar
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default IntegrantePersonalPicker;
