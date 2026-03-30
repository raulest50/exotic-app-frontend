import { useState, useEffect } from 'react';
import {
    Alert,
    AlertIcon,
    Box,
    Button,
    FormControl,
    FormLabel,
    FormErrorMessage,
    IconButton,
    Input,
    InputGroup,
    InputRightElement,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    SimpleGrid,
    Text,
    VStack,
    useToast,
} from '@chakra-ui/react';
import { FiEdit, FiSave } from 'react-icons/fi';
import { SearchIcon } from '@chakra-ui/icons';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import { fetchUserAssignmentStatus } from '../../../api/userAssignmentStatus.ts';
import UserGenericPicker from '../../../components/Pickers/UserPickerGeneric/UserPickerGeneric.tsx';
import { User } from '../../Usuarios/GestionUsuarios/types';
import { AreaOperativa, isAlmacenGeneralArea, UpdateAreaOperativaDTO } from './types';

const endpoints = new EndPointsURL();

interface DetalleAreaOperativaDialogProps {
    isOpen: boolean;
    onClose: () => void;
    area: AreaOperativa | null;
    onAreaUpdated: (updatedArea: AreaOperativa) => void;
}

export default function DetalleAreaOperativaDialog({ isOpen, onClose, area, onAreaUpdated }: DetalleAreaOperativaDialogProps) {
    const toast = useToast();

    const [isEditing, setIsEditing] = useState(false);
    const [editNombre, setEditNombre] = useState('');
    const [editDescripcion, setEditDescripcion] = useState('');
    const [editResponsable, setEditResponsable] = useState<User | null>(null);
    const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isValidatingResponsable, setIsValidatingResponsable] = useState(false);
    const [responsableError, setResponsableError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setIsEditing(false);
        }
    }, [isOpen]);

    if (!area) return null;
    const isSpecialSystemArea = isAlmacenGeneralArea(area);

    const enterEditMode = () => {
        if (isSpecialSystemArea) {
            return;
        }
        setEditNombre(area.nombre);
        setEditDescripcion(area.descripcion || '');
        setEditResponsable(
            area.responsableArea
                ? { id: area.responsableArea.id, cedula: area.responsableArea.cedula, username: area.responsableArea.username, nombreCompleto: area.responsableArea.nombreCompleto } as User
                : null,
        );
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
        editResponsable?.id !== area.responsableArea?.id;

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
        if (isSpecialSystemArea) return;
        if (!canSave || !editResponsable) return;

        setIsSaving(true);

        const dto: UpdateAreaOperativaDTO = {
            nombre: editNombre.trim(),
            descripcion: editDescripcion.trim(),
            responsableId: editResponsable.id,
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

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered closeOnOverlayClick={!isEditing}>
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
                                            onChange={(e) => setEditNombre(e.target.value)}
                                            placeholder="Nombre del área"
                                        />
                                    </FormControl>

                                    <FormControl>
                                        <FormLabel>Descripción</FormLabel>
                                        <Input
                                            value={editDescripcion}
                                            onChange={(e) => setEditDescripcion(e.target.value)}
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
                                            bg="gray.50"
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
                                <Text color="gray.500">Sin responsable asignado</Text>
                            )}
                        </Box>
                    </VStack>
                </ModalBody>
                <ModalFooter gap={2}>
                    {isEditing ? (
                        <>
                            <Button
                                variant="ghost"
                                onClick={cancelEdit}
                                isDisabled={isSaving}
                            >
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
                                <Button
                                    colorScheme="yellow"
                                    leftIcon={<FiEdit />}
                                    onClick={enterEditMode}
                                >
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
                <UserGenericPicker
                    isOpen={isUserPickerOpen}
                    onClose={() => setIsUserPickerOpen(false)}
                    onSelectUser={handleSelectUser}
                />
            )}
        </Modal>
    );
}
