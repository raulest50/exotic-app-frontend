import { useState } from 'react';
import {
    Steps,
    Box,
    Button,
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
    Field,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import UserGenericPicker from '../../../components/Pickers/UserPickerGeneric/UserPickerGeneric.tsx';
import { fetchUserAssignmentStatus } from '../../../api/userAssignmentStatus.ts';
import { input_style } from '../../../styles/styles_general.tsx';
import { User } from '../../Usuarios/GestionUsuarios/types';
import CategoriaHabilitadaPickerModal from '../components/CategoriaHabilitadaPickerModal.tsx';
import { AreaOperativaMutationDTO, CategoriaHabilitada } from '../ConsultaAreasOperativas/types.ts';
import { LuSearch } from 'react-icons/lu';

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

    const toast = useAppToast();
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
            <VStack gap={4} align="stretch">
                <Field.Root required invalid={!!errors.nombre}>
                    <Field.Label>Nombre</Field.Label>
                    <Input
                        value={nombre}
                        onValueChange={(event) => {
                            setNombre(event.target.value);
                            if (errors.nombre) {
                                setErrors((prev) => ({ ...prev, nombre: undefined }));
                            }
                        }}
                        sx={input_style}
                        placeholder="Nombre del área de producción"
                    />
                    {errors.nombre && <Field.ErrorText>{errors.nombre}</Field.ErrorText>}
                </Field.Root>

                <Field.Root>
                    <Field.Label>Descripción</Field.Label>
                    <Input
                        value={descripcion}
                        onValueChange={(event) => setDescripcion(event.target.value)}
                        sx={input_style}
                        placeholder="Descripción del área de producción"
                    />
                </Field.Root>

                <Field.Root required invalid={!!errors.responsable}>
                    <Field.Label>Responsable del Área</Field.Label>
                    <InputGroup>
                        <Input
                            value={responsable ? `${responsable.cedula} - ${responsable.nombreCompleto || responsable.username}` : ''}
                            placeholder="Seleccione un responsable"
                            readOnly
                            bg="app.inputReadonly"
                        />
                        <InputRightElement>
                            <IconButton
                                aria-label="Buscar usuario"
                                size="sm"
                                onClick={() => setIsUserPickerOpen(true)}
                                disabled={isSubmitting || isValidatingResponsable}><LuSearch /></IconButton>
                        </InputRightElement>
                    </InputGroup>
                    {errors.responsable && <Field.ErrorText>{errors.responsable}</Field.ErrorText>}
                </Field.Root>

                <Field.Root>
                    <Field.Label>Categorías que puede procesar</Field.Label>
                    <Button
                        variant="outline"
                        onClick={() => setIsCategoriaPickerOpen(true)}
                        disabled={isSubmitting || isValidatingResponsable}
                    >
                        Seleccionar categorías
                    </Button>

                    {categoriasHabilitadas.length === 0 ? (
                        <Text mt={2} color="app.textSubtle" fontSize="sm">
                            Sin categorías configuradas.
                        </Text>
                    ) : (
                        <Wrap mt={3}>
                            {categoriasHabilitadas.map((categoria) => (
                                <WrapItem key={categoria.categoriaId}>
                                    <Tag.Root colorPalette="teal" borderRadius="full">
                                        <Tag.Label>{categoria.categoriaNombre}</Tag.Label>
                                    </Tag.Root>
                                </WrapItem>
                            ))}
                        </Wrap>
                    )}
                </Field.Root>

                <Button
                    colorPalette="teal"
                    onClick={handleSubmit}
                    loading={isSubmitting || isValidatingResponsable}
                    disabled={!isFormValid || isSubmitting || isValidatingResponsable}
                >
                    Guardar
                </Button>

                <Button
                    colorPalette="orange"
                    onClick={clearFields}
                    disabled={isSubmitting || isValidatingResponsable}
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
