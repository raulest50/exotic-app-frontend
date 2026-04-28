import { useState } from 'react';
import {
    Box,
    Button,
    FormControl,
    FormErrorMessage,
    FormLabel,
    Heading,
    IconButton,
    Input,
    InputGroup,
    InputRightElement,
    Tag,
    TagLabel,
    Text,
    VStack,
    Wrap,
    WrapItem,
    useToast,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import UserGenericPicker from '../../../components/Pickers/UserPickerGeneric/UserPickerGeneric.tsx';
import { fetchUserAssignmentStatus } from '../../../api/userAssignmentStatus.ts';
import { input_style } from '../../../styles/styles_general.tsx';
import { User } from '../../Usuarios/GestionUsuarios/types';
import CategoriaHabilitadaPickerModal from '../components/CategoriaHabilitadaPickerModal.tsx';
import { AreaOperativaMutationDTO, CategoriaHabilitada } from '../ConsultaAreasOperativas/types.ts';

function CrearAreaProduccionTab() {
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [responsable, setResponsable] = useState<User | null>(null);
    const [categoriasHabilitadas, setCategoriasHabilitadas] = useState<CategoriaHabilitada[]>([]);
    const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);
    const [isCategoriaPickerOpen, setIsCategoriaPickerOpen] = useState(false);
    const [errors, setErrors] = useState<{ nombre?: string; responsable?: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isValidatingResponsable, setIsValidatingResponsable] = useState(false);

    const toast = useToast();
    const endPoints = new EndPointsURL();

    const validateForm = () => {
        const newErrors: { nombre?: string; responsable?: string } = {};

        if (!nombre.trim()) {
            newErrors.nombre = 'El nombre es obligatorio';
        }

        if (!responsable) {
            newErrors.responsable = 'El responsable es obligatorio';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const clearFields = () => {
        setNombre('');
        setDescripcion('');
        setResponsable(null);
        setCategoriasHabilitadas([]);
        setIsValidatingResponsable(false);
        setErrors({});
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            toast({
                title: 'Error de validación',
                description: 'Por favor complete todos los campos requeridos',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setIsSubmitting(true);

        const areaProduccionDTO: AreaOperativaMutationDTO = {
            nombre: nombre.trim(),
            descripcion: descripcion.trim(),
            responsableId: responsable!.id,
            categoriaIds: categoriasHabilitadas.map((categoria) => categoria.categoriaId),
        };

        try {
            await axios.post(endPoints.crear_area_produccion, areaProduccionDTO);

            toast({
                title: 'Área de producción creada',
                description: `El área "${nombre}" ha sido creada exitosamente`,
                status: 'success',
                duration: 3000,
                isClosable: true,
            });

            clearFields();
        } catch (error) {
            console.error('Error al crear área de producción:', error);

            toast({
                title: 'Error al crear área de producción',
                description: axios.isAxiosError(error)
                    ? error.response?.data?.message || 'Error en la solicitud'
                    : 'Error desconocido',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSelectUser = async (user: User) => {
        setIsValidatingResponsable(true);
        try {
            const status = await fetchUserAssignmentStatus(user.id);
            if (!status.canBeAreaResponsable) {
                const description = status.hasModuloAccesos
                    ? 'El usuario ya tiene accesos a modulos y no puede ser responsable de un area operativa.'
                    : `El usuario ya es responsable del area ${status.areaResponsableNombre ?? ''}.`;
                setErrors((prev) => ({ ...prev, responsable: description }));
                setResponsable(null);
                toast({
                    title: 'Usuario no compatible',
                    description,
                    status: 'warning',
                    duration: 4000,
                    isClosable: true,
                });
                return;
            }

            setResponsable(user);
            if (errors.responsable) {
                setErrors((prev) => ({ ...prev, responsable: undefined }));
            }
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

    const isFormValid = nombre.trim() !== '' && responsable !== null;

    return (
        <Box p={4}>
            <Heading size="md" mb={4}>Crear Área de Producción</Heading>
            <VStack spacing={4} align="stretch">
                <FormControl isRequired isInvalid={!!errors.nombre}>
                    <FormLabel>Nombre</FormLabel>
                    <Input
                        value={nombre}
                        onChange={(event) => {
                            setNombre(event.target.value);
                            if (errors.nombre) {
                                setErrors((prev) => ({ ...prev, nombre: undefined }));
                            }
                        }}
                        sx={input_style}
                        placeholder="Nombre del área de producción"
                    />
                    {errors.nombre && <FormErrorMessage>{errors.nombre}</FormErrorMessage>}
                </FormControl>

                <FormControl>
                    <FormLabel>Descripción</FormLabel>
                    <Input
                        value={descripcion}
                        onChange={(event) => setDescripcion(event.target.value)}
                        sx={input_style}
                        placeholder="Descripción del área de producción"
                    />
                </FormControl>

                <FormControl isRequired isInvalid={!!errors.responsable}>
                    <FormLabel>Responsable del Área</FormLabel>
                    <InputGroup>
                        <Input
                            value={responsable ? `${responsable.cedula} - ${responsable.nombreCompleto || responsable.username}` : ''}
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
                                isDisabled={isSubmitting || isValidatingResponsable}
                            />
                        </InputRightElement>
                    </InputGroup>
                    {errors.responsable && <FormErrorMessage>{errors.responsable}</FormErrorMessage>}
                </FormControl>

                <FormControl>
                    <FormLabel>Categorías que puede procesar</FormLabel>
                    <Button
                        variant="outline"
                        onClick={() => setIsCategoriaPickerOpen(true)}
                        isDisabled={isSubmitting || isValidatingResponsable}
                    >
                        Seleccionar categorías
                    </Button>

                    {categoriasHabilitadas.length === 0 ? (
                        <Text mt={2} color="gray.500" fontSize="sm">
                            Sin categorías configuradas.
                        </Text>
                    ) : (
                        <Wrap mt={3}>
                            {categoriasHabilitadas.map((categoria) => (
                                <WrapItem key={categoria.categoriaId}>
                                    <Tag colorScheme="teal" borderRadius="full">
                                        <TagLabel>{categoria.categoriaNombre}</TagLabel>
                                    </Tag>
                                </WrapItem>
                            ))}
                        </Wrap>
                    )}
                </FormControl>

                <Button
                    colorScheme="teal"
                    onClick={handleSubmit}
                    isLoading={isSubmitting || isValidatingResponsable}
                    isDisabled={!isFormValid || isSubmitting || isValidatingResponsable}
                >
                    Guardar
                </Button>

                <Button
                    colorScheme="orange"
                    onClick={clearFields}
                    isDisabled={isSubmitting || isValidatingResponsable}
                >
                    Limpiar
                </Button>
            </VStack>

            <UserGenericPicker
                isOpen={isUserPickerOpen}
                onClose={() => setIsUserPickerOpen(false)}
                onSelectUser={handleSelectUser}
            />

            <CategoriaHabilitadaPickerModal
                isOpen={isCategoriaPickerOpen}
                onClose={() => setIsCategoriaPickerOpen(false)}
                initialSelected={categoriasHabilitadas}
                onConfirm={setCategoriasHabilitadas}
            />
        </Box>
    );
}

export default CrearAreaProduccionTab;
