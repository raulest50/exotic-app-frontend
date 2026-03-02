import React, { useState } from 'react';
import {
    Box,
    Button,
    FormControl,
    FormLabel,
    Heading,
    Input,
    VStack,
    useToast,
    InputGroup,
    InputRightElement,
    IconButton,
    Text,
    FormErrorMessage,
} from '@chakra-ui/react';
import axios from 'axios';
import { SearchIcon } from '@chakra-ui/icons';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import { input_style } from '../../../styles/styles_general.tsx';
import UserGenericPicker from '../../../components/Pickers/UserPickerGeneric/UserPickerGeneric.tsx';
import { User } from '../../Usuarios/GestionUsuarios/types';

interface AreaProduccion {
    areaId?: number;
    nombre: string;
    descripcion: string;
    responsableArea?: User;
}

interface AreaProduccionDTO {
    nombre: string;
    descripcion: string;
    responsableId?: number;
}

function CrearAreaProduccionTab() {
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [responsable, setResponsable] = useState<User | null>(null);
    const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);
    const [errors, setErrors] = useState<{ nombre?: string, responsable?: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toast = useToast();
    const endPoints = new EndPointsURL();

    const validateForm = () => {
        const newErrors: { nombre?: string, responsable?: string } = {};
        
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

        const areaProduccionDTO: AreaProduccionDTO = {
            nombre,
            descripcion,
            responsableId: responsable?.id,
        };

        try {
            const response = await axios.post(endPoints.crear_area_produccion, areaProduccionDTO);
            
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

    const handleOpenUserPicker = () => {
        setIsUserPickerOpen(true);
    };

    const handleCloseUserPicker = () => {
        setIsUserPickerOpen(false);
    };

    const handleSelectUser = (user: User) => {
        setResponsable(user);
        if (errors.responsable) {
            setErrors(prev => ({ ...prev, responsable: undefined }));
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
                        onChange={(e) => {
                            setNombre(e.target.value);
                            if (errors.nombre) {
                                setErrors(prev => ({ ...prev, nombre: undefined }));
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
                        onChange={(e) => setDescripcion(e.target.value)} 
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
                                onClick={handleOpenUserPicker}
                            />
                        </InputRightElement>
                    </InputGroup>
                    {errors.responsable && <FormErrorMessage>{errors.responsable}</FormErrorMessage>}
                </FormControl>
                
                <Button 
                    colorScheme="teal" 
                    onClick={handleSubmit} 
                    isLoading={isSubmitting}
                    isDisabled={!isFormValid || isSubmitting}
                >
                    Guardar
                </Button>
                
                <Button 
                    colorScheme="orange" 
                    onClick={clearFields}
                    isDisabled={isSubmitting}
                >
                    Limpiar
                </Button>
            </VStack>
            
            <UserGenericPicker
                isOpen={isUserPickerOpen}
                onClose={handleCloseUserPicker}
                onSelectUser={handleSelectUser}
            />
        </Box>
    );
}

export default CrearAreaProduccionTab;
