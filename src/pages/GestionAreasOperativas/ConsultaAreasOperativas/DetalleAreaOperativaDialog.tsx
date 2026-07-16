import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    AlertIcon,
    Avatar,
    Badge,
    Box,
    Button,
    Flex,
    FormControl,
    FormErrorMessage,
    FormLabel,
    Heading,
    HStack,
    Icon,
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
    Text,
    Textarea,
    VStack,
    useToast,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { FiEdit, FiLayers, FiSave } from 'react-icons/fi';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import UserGenericPicker from '../../../components/Pickers/UserPickerGeneric/UserPickerGeneric.tsx';
import { fetchUserAssignmentStatus } from '../../../api/userAssignmentStatus.ts';
import { User } from '../../Usuarios/GestionUsuarios/types';
import CategoriaHabilitadaPickerModal from '../components/CategoriaHabilitadaPickerModal.tsx';
import AreaOperativaUnidadMedidaConfig from './AreaOperativaUnidadMedidaConfig.tsx';
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

interface DetailValueProps {
    label: string;
    children: ReactNode;
}

function DetailValue({ label, children }: DetailValueProps) {
    return (
        <Box>
            <Text
                color="app.textSubtle"
                fontSize="xs"
                fontWeight="semibold"
                letterSpacing="wide"
                textTransform="uppercase"
                mb={1}
            >
                {label}
            </Text>
            <Box fontSize="sm" fontWeight="medium">
                {children}
            </Box>
        </Box>
    );
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
            return (
                <Flex
                    minH="220px"
                    borderWidth="1px"
                    borderStyle="dashed"
                    borderColor="app.border"
                    borderRadius="xl"
                    bg="app.surface"
                    align="center"
                    justify="center"
                    direction="column"
                    textAlign="center"
                    px={6}
                    py={10}
                >
                    <Flex
                        w={12}
                        h={12}
                        align="center"
                        justify="center"
                        borderRadius="full"
                        bg="app.surfaceMuted"
                        color="app.textMuted"
                        mb={3}
                    >
                        <Icon as={FiLayers} boxSize={6} />
                    </Flex>
                    <Text fontWeight="semibold">Sin categorías configuradas</Text>
                    <Text color="app.textSubtle" fontSize="sm" maxW="360px" mt={1}>
                        Esta área todavía no tiene categorías de producción habilitadas.
                    </Text>
                </Flex>
            );
        }

        return (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {categorias.map((categoria) => {
                    const unidadCategoria = categoria.unidadMedidaId ? unidadById.get(categoria.unidadMedidaId) : null;

                    return (
                        <Box
                            key={categoria.categoriaId}
                            borderWidth="1px"
                            borderColor="app.border"
                            borderRadius="xl"
                            bg="app.surface"
                            p={4}
                        >
                            <HStack justify="space-between" align="flex-start" spacing={3}>
                                <Box minW={0}>
                                    <Text fontWeight="semibold" noOfLines={2}>
                                        {categoria.categoriaNombre}
                                    </Text>
                                    <Text color="app.textSubtle" fontSize="xs" mt={1}>
                                        Categoría #{categoria.categoriaId}
                                    </Text>
                                </Box>
                                <Badge colorScheme={unidadCategoria ? 'blue' : 'gray'} flexShrink={0}>
                                    {unidadCategoria ? 'Configurada' : 'Sin unidad'}
                                </Badge>
                            </HStack>

                            <Box borderTopWidth="1px" borderColor="app.border" mt={4} pt={3}>
                                {unidadCategoria ? (
                                    <SimpleGrid columns={2} spacing={3}>
                                        <DetailValue label="Unidad">
                                            <Text>{unidadCategoria.nombre}</Text>
                                        </DetailValue>
                                        <DetailValue label="Factor de lote">
                                            <Text>{categoria.factorLote ?? '—'}</Text>
                                        </DetailValue>
                                    </SimpleGrid>
                                ) : (
                                    <Text color="app.textSubtle" fontSize="sm">
                                        Sin unidad de medida asociada.
                                    </Text>
                                )}
                            </Box>
                        </Box>
                    );
                })}
            </SimpleGrid>
        );
    };

    const categoriasVisibles = isEditing ? categoriasEdicion : categoriasLectura;
    const responsableVisible = isEditing
        ? editResponsable
        : area.responsableArea
            ? {
                id: area.responsableArea.id,
                cedula: area.responsableArea.cedula,
                username: area.responsableArea.username,
                nombreCompleto: area.responsableArea.nombreCompleto,
            } as User
            : null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="5xl"
            isCentered
            closeOnOverlayClick={!isEditing}
            scrollBehavior="inside"
        >
            <ModalOverlay />
            <ModalContent
                w="calc(100% - 24px)"
                h={{ base: 'calc(100dvh - 24px)', md: 'min(780px, calc(100dvh - 48px))' }}
                maxH={{ base: 'calc(100dvh - 24px)', md: 'calc(100dvh - 48px)' }}
                my={3}
                mx={3}
                overflow="hidden"
                borderRadius={{ base: 'xl', md: '2xl' }}
                bg="app.surface"
            >
                <ModalHeader px={{ base: 4, md: 6 }} py={4} borderBottomWidth="1px" borderColor="app.border">
                    <Flex align="flex-start" justify="space-between" gap={4} pr={10}>
                        <Box minW={0}>
                            <Text
                                color="app.textSubtle"
                                fontSize="xs"
                                fontWeight="semibold"
                                letterSpacing="wide"
                                textTransform="uppercase"
                                mb={1}
                            >
                                Área operativa #{area.areaId}
                            </Text>
                            <Heading
                                as="h2"
                                size="md"
                                fontFamily="Comfortaa Variable"
                                noOfLines={1}
                            >
                                {area.nombre}
                            </Heading>
                        </Box>
                        <HStack spacing={2} flexWrap="wrap" justify="flex-end">
                            {isEditing && <Badge colorScheme="teal">Editando</Badge>}
                            {isSpecialSystemArea && <Badge colorScheme="blue">Área del sistema</Badge>}
                        </HStack>
                    </Flex>
                </ModalHeader>
                <ModalCloseButton isDisabled={isSaving} top={4} right={4} />
                <ModalBody p={0} overflow="hidden" display="flex" flexDirection="column" minH={0}>
                    {isSpecialSystemArea && (
                        <Alert
                            status="info"
                            variant="left-accent"
                            flexShrink={0}
                            px={{ base: 4, md: 6 }}
                            py={3}
                            borderRadius={0}
                        >
                            <AlertIcon />
                            <Text fontSize="sm">
                                Almacen General es un area especial del sistema y solo puede consultarse desde este modulo.
                            </Text>
                        </Alert>
                    )}

                    <Tabs
                        variant="line"
                        colorScheme="teal"
                        isLazy
                        display="flex"
                        flexDirection="column"
                        flex="1"
                        minH={0}
                    >
                        <TabList px={{ base: 2, md: 6 }} flexShrink={0} bg="app.surface">
                            <Tab flex="1" whiteSpace="nowrap" py={3}>Información</Tab>
                            <Tab flex="1" whiteSpace="nowrap" py={3}>Categorías</Tab>
                            <Tab flex="1" whiteSpace="nowrap" py={3}>Unidades</Tab>
                        </TabList>
                        <TabPanels flex="1" minH={0} overflowY="auto" bg="app.surfaceSubtle">
                                <TabPanel px={{ base: 4, md: 6 }} py={5} minH="100%">
                                    <VStack align="stretch" spacing={4}>
                                        <Box>
                                            <Heading as="h3" size="sm">Información del área</Heading>
                                            <Text color="app.textSubtle" fontSize="sm" mt={1}>
                                                Consulte los datos generales y la persona responsable de esta área.
                                            </Text>
                                        </Box>

                                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5} alignItems="stretch">
                                            <Box
                                                borderWidth="1px"
                                                borderColor="app.border"
                                                borderRadius="xl"
                                                bg="app.surface"
                                                p={{ base: 4, md: 5 }}
                                                minH={{ md: '310px' }}
                                            >
                                                <HStack justify="space-between" mb={5}>
                                                    <Heading as="h4" size="sm">Datos básicos</Heading>
                                                    <Badge colorScheme="gray">ID {area.areaId}</Badge>
                                                </HStack>
                                                {isEditing ? (
                                                    <VStack spacing={4} align="stretch">
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
                                                            <Textarea
                                                                value={editDescripcion}
                                                                onChange={(event) => setEditDescripcion(event.target.value)}
                                                                placeholder="Descripción del área"
                                                                resize="vertical"
                                                                minH="120px"
                                                            />
                                                        </FormControl>
                                                    </VStack>
                                                ) : (
                                                    <VStack align="stretch" spacing={5}>
                                                        <DetailValue label="Nombre">
                                                            <Text>{area.nombre}</Text>
                                                        </DetailValue>
                                                        <DetailValue label="Descripción">
                                                            <Text
                                                                color={area.descripcion ? undefined : 'app.textSubtle'}
                                                                whiteSpace="pre-wrap"
                                                            >
                                                                {area.descripcion || 'Sin descripción registrada.'}
                                                            </Text>
                                                        </DetailValue>
                                                    </VStack>
                                                )}
                                            </Box>

                                            <Box
                                                borderWidth="1px"
                                                borderColor="app.border"
                                                borderRadius="xl"
                                                bg="app.surface"
                                                p={{ base: 4, md: 5 }}
                                                minH={{ md: '310px' }}
                                            >
                                                <Heading as="h4" size="sm" mb={5}>Responsable del área</Heading>

                                                {responsableVisible ? (
                                                    <Box
                                                        borderWidth="1px"
                                                        borderColor="app.border"
                                                        borderRadius="lg"
                                                        bg="app.surfaceSubtle"
                                                        p={4}
                                                        mb={isEditing ? 5 : 0}
                                                    >
                                                        <HStack align="flex-start" spacing={3}>
                                                            <Avatar
                                                                size="md"
                                                                name={responsableVisible.nombreCompleto || responsableVisible.username}
                                                                bg="app.rowSelectedTeal"
                                                            />
                                                            <Box minW={0}>
                                                                <Text fontWeight="semibold" noOfLines={2}>
                                                                    {responsableVisible.nombreCompleto || responsableVisible.username}
                                                                </Text>
                                                                <Text color="app.textMuted" fontSize="sm">
                                                                    Cédula {responsableVisible.cedula}
                                                                </Text>
                                                                <Text color="app.textSubtle" fontSize="sm" noOfLines={1}>
                                                                    {responsableVisible.username}
                                                                </Text>
                                                            </Box>
                                                        </HStack>
                                                    </Box>
                                                ) : (
                                                    <Flex
                                                        borderWidth="1px"
                                                        borderStyle="dashed"
                                                        borderColor="app.border"
                                                        borderRadius="lg"
                                                        bg="app.surfaceSubtle"
                                                        align="center"
                                                        justify="center"
                                                        minH="120px"
                                                        mb={isEditing ? 5 : 0}
                                                    >
                                                        <Text color="app.textSubtle" fontSize="sm">
                                                            Sin responsable asignado
                                                        </Text>
                                                    </Flex>
                                                )}

                                                {isEditing && (
                                                    <FormControl isRequired isInvalid={Boolean(responsableError)}>
                                                        <FormLabel>Seleccionar responsable</FormLabel>
                                                        <InputGroup>
                                                            <Input
                                                                value={editResponsable ? `${editResponsable.cedula} - ${editResponsable.nombreCompleto || editResponsable.username}` : ''}
                                                                placeholder="Seleccione un responsable"
                                                                isReadOnly
                                                                bg="app.inputReadonly"
                                                                pr={12}
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
                                                )}
                                            </Box>
                                        </SimpleGrid>
                                    </VStack>
                                </TabPanel>

                                <TabPanel px={{ base: 4, md: 6 }} py={5} minH="100%">
                                    <VStack align="stretch" spacing={4}>
                                        <Flex
                                            direction={{ base: 'column', sm: 'row' }}
                                            justify="space-between"
                                            align={{ base: 'stretch', sm: 'center' }}
                                            gap={3}
                                        >
                                            <Box>
                                                <HStack>
                                                    <Heading as="h3" size="sm">Categorías habilitadas</Heading>
                                                    <Badge colorScheme="teal">{categoriasVisibles.length}</Badge>
                                                </HStack>
                                                <Text color="app.textSubtle" fontSize="sm" mt={1}>
                                                    Categorías, unidades y factores de lote disponibles para el área.
                                                </Text>
                                            </Box>
                                            {isEditing && (
                                                <Button
                                                    alignSelf={{ base: 'stretch', sm: 'center' }}
                                                    variant="outline"
                                                    colorScheme="teal"
                                                    onClick={() => setIsCategoriaPickerOpen(true)}
                                                    isDisabled={isSaving || isValidatingResponsable}
                                                >
                                                    Gestionar categorías
                                                </Button>
                                            )}
                                        </Flex>
                                        {renderCategoriasConUnidades(categoriasVisibles)}
                                    </VStack>
                                </TabPanel>

                                <TabPanel px={{ base: 4, md: 6 }} py={5} minH="100%">
                                    <AreaOperativaUnidadMedidaConfig
                                        areaId={area.areaId}
                                        isReadOnly={isSpecialSystemArea}
                                        onUnidadesLoaded={handleUnidadesLoaded}
                                    />
                                </TabPanel>
                        </TabPanels>
                    </Tabs>
                </ModalBody>
                <ModalFooter
                    px={{ base: 4, md: 6 }}
                    py={4}
                    borderTopWidth="1px"
                    borderColor="app.border"
                    bg="app.surface"
                    flexShrink={0}
                >
                    {isEditing ? (
                        <Flex
                            w="full"
                            direction={{ base: 'column', sm: 'row' }}
                            align={{ base: 'stretch', sm: 'center' }}
                            justify="space-between"
                            gap={3}
                        >
                            <Box minH="24px">
                                {hasChanges && <Badge colorScheme="orange">Cambios sin guardar</Badge>}
                            </Box>
                            <HStack justify="flex-end">
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
                                    Guardar datos del área
                                </Button>
                            </HStack>
                        </Flex>
                    ) : (
                        <HStack w="full" justify="flex-end">
                            {!isSpecialSystemArea && (
                                <Button colorScheme="teal" leftIcon={<FiEdit />} onClick={enterEditMode}>
                                    Editar área
                                </Button>
                            )}
                            <Button variant="outline" onClick={onClose}>
                                Cerrar
                            </Button>
                        </HStack>
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
