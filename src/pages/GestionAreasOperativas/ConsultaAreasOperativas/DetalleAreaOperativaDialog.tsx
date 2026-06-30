import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    AlertIcon,
    Box,
    Button,
    FormControl,
    FormErrorMessage,
    FormLabel,
    IconButton,
    Input,
    InputGroup,
    InputRightElement,
    Tab,
    TabList,
    TabPanel,
    TabPanels,
    Tabs,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    SimpleGrid,
    Tag,
    TagLabel,
    Text,
    VStack,
    Wrap,
    WrapItem,
    useToast,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { FiEdit, FiSave } from 'react-icons/fi';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import UserGenericPicker from '../../../components/Pickers/UserPickerGeneric/UserPickerGeneric.tsx';
import { fetchUserAssignmentStatus } from '../../../api/userAssignmentStatus.ts';
import { User } from '../../Usuarios/GestionUsuarios/types';
import CategoriaHabilitadaPickerModal from '../components/CategoriaHabilitadaPickerModal.tsx';
import AreaOperativaCapacityConfig from './AreaOperativaCapacityConfig.tsx';
import {
    AreaOperativa,
    AreaOperativaMutationDTO,
    CategoriaHabilitada,
    UnidadMedidaAreaOperativa,
    isAlmacenGeneralArea,
} from './types';

const endpoints = new EndPointsURL();

interface DetalleAreaOperativaDialogProps {
    isOpen: boolean;
    onClose: () => void;
    area: AreaOperativa | null;
    onAreaUpdated: (updatedArea: AreaOperativa) => void;
}

function sameCategoriaSelection(current: CategoriaHabilitada[], original: CategoriaHabilitada[]): boolean {
    const normalize = (categorias: CategoriaHabilitada[]) => [...categorias]
        .map((categoria) => ({
            categoriaId: categoria.categoriaId,
            unidadMedidaId: categoria.unidadMedidaId ?? null,
            factorLote: categoria.factorLote ?? null,
        }))
        .sort((a, b) => a.categoriaId - b.categoriaId);

    const currentNormalized = normalize(current);
    const originalNormalized = normalize(original);

    if (currentNormalized.length !== originalNormalized.length) {
        return false;
    }

    return currentNormalized.every((categoria, index) => {
        const originalCategoria = originalNormalized[index];
        return categoria.categoriaId === originalCategoria.categoriaId
            && categoria.unidadMedidaId === originalCategoria.unidadMedidaId
            && categoria.factorLote === originalCategoria.factorLote;
    });
}

function cloneCategorias(categorias: CategoriaHabilitada[]): CategoriaHabilitada[] {
    return categorias.map((categoria) => ({
        ...categoria,
        unidadMedidaId: categoria.unidadMedidaId ?? null,
        factorLote: categoria.factorLote ?? null,
    }));
}

export default function DetalleAreaOperativaDialog({
    isOpen,
    onClose,
    area,
    onAreaUpdated,
}: DetalleAreaOperativaDialogProps) {
    const toast = useToast();

    const [isEditing, setIsEditing] = useState(false);
    const [editNombre, setEditNombre] = useState('');
    const [editDescripcion, setEditDescripcion] = useState('');
    const [editResponsable, setEditResponsable] = useState<User | null>(null);
    const [editCategoriasHabilitadas, setEditCategoriasHabilitadas] = useState<CategoriaHabilitada[]>([]);
    const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);
    const [isCategoriaPickerOpen, setIsCategoriaPickerOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isValidatingResponsable, setIsValidatingResponsable] = useState(false);
    const [responsableError, setResponsableError] = useState<string | null>(null);
    const [areaUnidades, setAreaUnidades] = useState<UnidadMedidaAreaOperativa[]>([]);

    useEffect(() => {
        if (!isOpen) {
            setIsEditing(false);
        }
    }, [isOpen]);

    const loadAreaUnidades = useCallback(async () => {
        if (!area) {
            setAreaUnidades([]);
            return;
        }

        try {
            const url = endpoints.area_operativa_unidades.replace('{areaId}', String(area.areaId));
            const response = await axios.get<UnidadMedidaAreaOperativa[]>(url, { withCredentials: true });
            setAreaUnidades(response.data);
        } catch {
            setAreaUnidades([]);
        }
    }, [area]);

    useEffect(() => {
        if (isOpen && area) {
            void loadAreaUnidades();
        }
    }, [area, isOpen, loadAreaUnidades]);

    const handleUnidadesLoaded = useCallback((unidades: UnidadMedidaAreaOperativa[]) => {
        setAreaUnidades(unidades);
    }, []);

    const unidadById = useMemo(
        () => new Map(areaUnidades.map((unidad) => [unidad.id, unidad])),
        [areaUnidades],
    );

    if (!area) return null;
    const isSpecialSystemArea = isAlmacenGeneralArea(area);
    const unidadesDisponibles = areaUnidades;

    const enterEditMode = () => {
        if (isSpecialSystemArea) {
            return;
        }

        setEditNombre(area.nombre);
        setEditDescripcion(area.descripcion || '');
        setEditResponsable(
            area.responsableArea
                ? {
                    id: area.responsableArea.id,
                    cedula: area.responsableArea.cedula,
                    username: area.responsableArea.username,
                    nombreCompleto: area.responsableArea.nombreCompleto,
                } as User
                : null,
        );
        setEditCategoriasHabilitadas(cloneCategorias(area.categoriasHabilitadas ?? []));
        setResponsableError(null);
        setIsEditing(true);
    };

    const cancelEdit = () => {
        setResponsableError(null);
        setIsEditing(false);
    };

    const hasChanges =
        editNombre !== area.nombre ||
        editDescripcion !== (area.descripcion || '') ||
        editResponsable?.id !== area.responsableArea?.id ||
        !sameCategoriaSelection(editCategoriasHabilitadas, area.categoriasHabilitadas ?? []);

    const isFormValid = editNombre.trim() !== '' && editResponsable !== null;
    const canSave = isFormValid && hasChanges && !isSaving && !isValidatingResponsable && !responsableError;

    const handleSelectUser = async (user: User) => {
        setIsValidatingResponsable(true);
        try {
            const status = await fetchUserAssignmentStatus(user.id, area.areaId);
            if (!status.canBeAreaResponsable) {
                const message = status.hasModuloAccesos
                    ? 'El usuario ya tiene accesos a modulos y no puede ser responsable de un area operativa.'
                    : `El usuario ya es responsable del area ${status.areaResponsableNombre ?? ''}.`;
                setResponsableError(message);
                toast({
                    title: 'Usuario no compatible',
                    description: message,
                    status: 'warning',
                    duration: 4000,
                    isClosable: true,
                });
                return;
            }

            setEditResponsable(user);
            setResponsableError(null);
        } catch {
            toast({
                title: 'Error',
                description: 'No se pudo validar la compatibilidad del usuario seleccionado.',
                status: 'error',
                duration: 4000,
                isClosable: true,
            });
        } finally {
            setIsValidatingResponsable(false);
        }
    };

    const handleSave = async () => {
        if (isSpecialSystemArea || !canSave || !editResponsable) {
            return;
        }

        setIsSaving(true);

        const dto: AreaOperativaMutationDTO = {
            nombre: editNombre.trim(),
            descripcion: editDescripcion.trim(),
            responsableId: editResponsable.id,
            categoriaIds: editCategoriasHabilitadas.map((categoria) => categoria.categoriaId),
            categoriasHabilitadas: editCategoriasHabilitadas.map((categoria) => ({
                categoriaId: categoria.categoriaId,
                unidadMedidaId: categoria.unidadMedidaId ?? null,
                factorLote: categoria.unidadMedidaId ? categoria.factorLote ?? 1 : null,
            })),
        };

        try {
            const url = endpoints.update_area_operativa.replace('{areaId}', String(area.areaId));
            const response = await axios.put<AreaOperativa>(url, dto, { withCredentials: true });

            toast({
                title: 'Área actualizada',
                description: `El área "${dto.nombre}" ha sido actualizada exitosamente`,
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            onAreaUpdated(response.data);
            setIsEditing(false);
        } catch (error) {
            const errorMessage = axios.isAxiosError(error)
                ? error.response?.data?.message || 'Error en la solicitud'
                : 'Error desconocido';
            toast({
                title: 'Error al actualizar área',
                description: errorMessage,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const categoriasLectura = area.categoriasHabilitadas ?? [];
    const categoriasEdicion = editCategoriasHabilitadas;

    const renderCategoriasConUnidades = (categorias: CategoriaHabilitada[]) => {
        if (categorias.length === 0) {
            return <Text color="app.textSubtle">Sin categorías configuradas.</Text>;
        }

        return (
            <VStack align="stretch" spacing={3}>
                {categorias.map((categoria) => {
                    const unidadCategoria = categoria.unidadMedidaId ? unidadById.get(categoria.unidadMedidaId) : null;

                    return (
                        <Box key={categoria.categoriaId} borderWidth="1px" borderRadius="md" p={3}>
                            <Text fontWeight="semibold" mb={2}>{categoria.categoriaNombre}</Text>
                            {!unidadCategoria ? (
                                <Text color="app.textSubtle" fontSize="sm">Sin unidades asociadas.</Text>
                            ) : (
                                <Wrap>
                                    <WrapItem>
                                        <Tag colorScheme="blue" borderRadius="full">
                                            <TagLabel>
                                                {unidadCategoria.nombre}
                                                {categoria.factorLote ? ` · factor ${categoria.factorLote}` : ''}
                                            </TagLabel>
                                        </Tag>
                                    </WrapItem>
                                </Wrap>
                            )}
                        </Box>
                    );
                })}
            </VStack>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="5xl" isCentered closeOnOverlayClick={!isEditing}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader fontFamily="Comfortaa Variable">
                    Detalle del Área Operativa
                </ModalHeader>
                <ModalCloseButton isDisabled={isSaving} />
                <ModalBody>
                    <VStack align="stretch" spacing={4}>
                        {isSpecialSystemArea && (
                            <Alert status="info" borderRadius="md">
                                <AlertIcon />
                                Almacen General es un area especial del sistema y solo puede consultarse desde este modulo.
                            </Alert>
                        )}

                        <Tabs variant="enclosed" colorScheme="teal" isLazy>
                            <TabList flexWrap="wrap">
                                <Tab>Información</Tab>
                                <Tab>Categorías</Tab>
                                <Tab>Unidades de medida</Tab>
                                <Tab>Capacidades</Tab>
                            </TabList>
                            <TabPanels>
                                <TabPanel px={0}>
                                    <VStack align="stretch" spacing={5}>
                                        <Box>
                                            <Text fontWeight="bold" mb={2} fontSize="md">Información del Área</Text>

                                            {isEditing ? (
                                                <VStack spacing={3} align="stretch">
                                                    <SimpleGrid columns={2} spacing={2} alignItems="center">
                                                        <Text fontWeight="semibold">ID:</Text>
                                                        <Text>{area.areaId}</Text>
                                                    </SimpleGrid>

                                                    <FormControl isRequired>
                                                        <FormLabel>Nombre</FormLabel>
                                                        <Input
                                                            value={editNombre}
                                                            onChange={(event) => setEditNombre(event.target.value)}
                                                            placeholder="Nombre del área"
                                                        />
                                                    </FormControl>

                                                    <FormControl>
                                                        <FormLabel>Descripción</FormLabel>
                                                        <Input
                                                            value={editDescripcion}
                                                            onChange={(event) => setEditDescripcion(event.target.value)}
                                                            placeholder="Descripción del área"
                                                        />
                                                    </FormControl>
                                                </VStack>
                                            ) : (
                                                <SimpleGrid columns={2} spacing={2}>
                                                    <Text fontWeight="semibold">ID:</Text>
                                                    <Text>{area.areaId}</Text>
                                                    <Text fontWeight="semibold">Nombre:</Text>
                                                    <Text>{area.nombre}</Text>
                                                    <Text fontWeight="semibold">Descripción:</Text>
                                                    <Text>{area.descripcion || '—'}</Text>
                                                </SimpleGrid>
                                            )}
                                        </Box>

                                        <Box>
                                            <Text fontWeight="bold" mb={2} fontSize="md">Responsable</Text>

                                            {isEditing ? (
                                                <FormControl isRequired isInvalid={Boolean(responsableError)}>
                                                    <FormLabel>Responsable del Área</FormLabel>
                                                    <InputGroup>
                                                        <Input
                                                            value={editResponsable ? `${editResponsable.cedula} - ${editResponsable.nombreCompleto || editResponsable.username}` : ''}
                                                            placeholder="Seleccione un responsable"
                                                            isReadOnly
                                                            bg="app.inputReadonly"
                                                        />
                                                        <InputRightElement>
                                                            <IconButton
                                                                aria-label="Buscar usuario"
                                                                icon={<SearchIcon />}
                                                                size="sm"
                                                                onClick={() => setIsUserPickerOpen(true)}
                                                                isDisabled={isSaving || isValidatingResponsable}
                                                            />
                                                        </InputRightElement>
                                                    </InputGroup>
                                                    {responsableError && <FormErrorMessage>{responsableError}</FormErrorMessage>}
                                                </FormControl>
                                            ) : area.responsableArea ? (
                                                <SimpleGrid columns={2} spacing={2}>
                                                    <Text fontWeight="semibold">Cédula:</Text>
                                                    <Text>{area.responsableArea.cedula}</Text>
                                                    <Text fontWeight="semibold">Nombre:</Text>
                                                    <Text>{area.responsableArea.nombreCompleto || area.responsableArea.username}</Text>
                                                    <Text fontWeight="semibold">Correo:</Text>
                                                    <Text>{area.responsableArea.username}</Text>
                                                </SimpleGrid>
                                            ) : (
                                                <Text color="app.textSubtle">Sin responsable asignado</Text>
                                            )}
                                        </Box>
                                    </VStack>
                                </TabPanel>

                                <TabPanel px={0}>
                                    <VStack align="stretch" spacing={4}>
                                        {isEditing ? (
                                            <Button
                                                alignSelf="flex-start"
                                                variant="outline"
                                                onClick={() => setIsCategoriaPickerOpen(true)}
                                                isDisabled={isSaving || isValidatingResponsable}
                                            >
                                                Seleccionar categorías y unidades
                                            </Button>
                                        ) : null}
                                        {renderCategoriasConUnidades(isEditing ? categoriasEdicion : categoriasLectura)}
                                    </VStack>
                                </TabPanel>

                                <TabPanel px={0}>
                                    <AreaOperativaCapacityConfig
                                        areaId={area.areaId}
                                        isReadOnly={isSpecialSystemArea}
                                        visibleSections={['unidades']}
                                        onUnidadesLoaded={handleUnidadesLoaded}
                                    />
                                </TabPanel>

                                <TabPanel px={0}>
                                    <AreaOperativaCapacityConfig
                                        areaId={area.areaId}
                                        isReadOnly={isSpecialSystemArea}
                                        visibleSections={['capacidades']}
                                        onUnidadesLoaded={handleUnidadesLoaded}
                                    />
                                </TabPanel>
                            </TabPanels>
                        </Tabs>
                    </VStack>
                </ModalBody>
                <ModalFooter gap={2}>
                    {isEditing ? (
                        <>
                            <Button variant="ghost" onClick={cancelEdit} isDisabled={isSaving}>
                                Cancelar
                            </Button>
                            <Button
                                colorScheme="teal"
                                leftIcon={<FiSave />}
                                onClick={handleSave}
                                isLoading={isSaving || isValidatingResponsable}
                                loadingText="Guardando"
                                isDisabled={!canSave}
                            >
                                Guardar Cambios
                            </Button>
                        </>
                    ) : (
                        <>
                            {!isSpecialSystemArea && (
                                <Button colorScheme="yellow" leftIcon={<FiEdit />} onClick={enterEditMode}>
                                    Editar
                                </Button>
                            )}
                            <Button colorScheme="blue" onClick={onClose}>
                                Cerrar
                            </Button>
                        </>
                    )}
                </ModalFooter>
            </ModalContent>

            {!isSpecialSystemArea && (
                <>
                    <UserGenericPicker
                        isOpen={isUserPickerOpen}
                        onClose={() => setIsUserPickerOpen(false)}
                        onSelectUser={handleSelectUser}
                    />

                    <CategoriaHabilitadaPickerModal
                        isOpen={isCategoriaPickerOpen}
                        onClose={() => setIsCategoriaPickerOpen(false)}
                        initialSelected={editCategoriasHabilitadas}
                        onConfirm={setEditCategoriasHabilitadas}
                        unidadesDisponibles={unidadesDisponibles}
                        allowUnidadSelection
                    />
                </>
            )}
        </Modal>
    );
}
