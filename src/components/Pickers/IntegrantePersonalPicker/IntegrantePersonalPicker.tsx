import { type KeyboardEvent, useEffect, useState } from 'react';
import {
    Steps,
    Badge,
    Box,
    Button,
    Flex,
    HStack,
    Input,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    useToast,
    VStack,
    Field,
    Dialog,
    Portal,
} from '@chakra-ui/react';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import {
    EstadoIntegrante,
    getEstadoIntegranteText,
    IntegrantePersonal,
} from '../../../pages/Personal/types.tsx';
import { LuSearch } from 'react-icons/lu';

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
        <Dialog.Root open={isOpen} size='xl' onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>Seleccionar integrante</Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body>
                            <VStack gap={4}>
                                <Field.Root>
                                    <Field.Label>Buscar integrante</Field.Label>
                                    <HStack>
                                        <Input
                                            value={searchText}
                                            onValueChange={(e) => setSearchText(e.target.value)}
                                            onKeyDown={onKeyPressInputBuscar}
                                            placeholder="Ingrese cédula, nombre o apellido"
                                            disabled={isLoading}
                                        />
                                        <Button
                                            colorPalette="blue"
                                            onClick={handleSearch}
                                            loading={isLoading}
                                            loadingText="Buscando"><LuSearch />Buscar
                                                                            </Button>
                                    </HStack>
                                </Field.Root>
                                <Box w="full" overflowX="auto">
                                    {integrantes.length > 0 ? (
                                        <>
                                            <Table.Root variant="simple" size="sm">
                                                <Table.Header>
                                                    <Table.Row>
                                                        <Table.ColumnHeader>Cédula</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Nombres</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Apellidos</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Cargo</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Departamento</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Estado</Table.ColumnHeader>
                                                    </Table.Row>
                                                </Table.Header>
                                                <Table.Body>
                                                    {currentIntegrantes.map((integrante) => (
                                                        <Table.Row
                                                            key={integrante.id}
                                                            onClick={() => setSelectedIntegranteId(integrante.id)}
                                                            bg={selectedIntegranteId === integrante.id ? 'teal.100' : 'transparent'}
                                                            _hover={{ bg: 'gray.100', cursor: 'pointer' }}
                                                        >
                                                            <Table.Cell>{integrante.id}</Table.Cell>
                                                            <Table.Cell>{integrante.nombres}</Table.Cell>
                                                            <Table.Cell>{integrante.apellidos}</Table.Cell>
                                                            <Table.Cell>{integrante.cargo ?? '-'}</Table.Cell>
                                                            <Table.Cell>{integrante.departamento ?? '-'}</Table.Cell>
                                                            <Table.Cell>
                                                                <Badge colorPalette="green">
                                                                    {getEstadoIntegranteText(integrante.estado)}
                                                                </Badge>
                                                            </Table.Cell>
                                                        </Table.Row>
                                                    ))}
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
                                        <Text textAlign="center">No hay integrantes activos para mostrar</Text>
                                    )}
                                </Box>
                            </VStack>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button
                                colorPalette="teal"
                                mr={3}
                                onClick={handleConfirm}
                                disabled={!selectedIntegrante}
                            >
                                Confirmar
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

export default IntegrantePersonalPicker;
