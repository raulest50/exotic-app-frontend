import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
    Input,
    Textarea,
    Button,
    SimpleGrid,
    VStack,
    Alert,
    Text,
    InputGroup,
    IconButton,
    Field,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL';
import UserGenericPicker from '../../../components/Pickers/UserPickerGeneric/UserPickerGeneric.tsx';
import { User } from '../../../pages/Usuarios/GestionUsuarios/types';
import { LuSearch } from 'react-icons/lu';

interface VendorFormData {
    cedula: string;
    nombres: string;
    apellidos: string;
    fechaNacimiento: string;
    email: string;
    telefono: string;
    direccion: string;
    userId: string;
}

type VendorFormErrors = Partial<Record<keyof VendorFormData, string>>;

const initialVendorFormState: VendorFormData = {
    cedula: '',
    nombres: '',
    apellidos: '',
    fechaNacimiento: '',
    email: '',
    telefono: '',
    direccion: '',
    userId: '',
};

const requiredVendorFields: (keyof VendorFormData)[] = [
    'cedula',
    'nombres',
    'apellidos',
    'fechaNacimiento',
    'email',
    'userId',
];

interface CrearVendedorProps {
    onVendorCreated?: () => void;
}

const CrearVendedor: React.FC<CrearVendedorProps> = ({ onVendorCreated }) => {
    const endPoints = new EndPointsURL();
    const toast = useAppToast();

    const [formData, setFormData] = useState<VendorFormData>(initialVendorFormState);
    const [formErrors, setFormErrors] = useState<VendorFormErrors>({});
    const [touchedFields, setTouchedFields] = useState<Record<keyof VendorFormData, boolean>>({
        cedula: false,
        nombres: false,
        apellidos: false,
        fechaNacimiento: false,
        email: false,
        telefono: false,
        direccion: false,
        userId: false,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const validateField = (name: keyof VendorFormData, value: string): string => {
        const trimmed = value.trim();

        switch (name) {
            case 'cedula':
                if (!trimmed) {
                    return 'La cédula es obligatoria.';
                }
                if (!/^\d{6,}$/.test(trimmed)) {
                    return 'La cédula debe contener al menos 6 dígitos.';
                }
                return '';
            case 'nombres':
                if (!trimmed) {
                    return 'El nombre es obligatorio.';
                }
                return '';
            case 'apellidos':
                if (!trimmed) {
                    return 'El apellido es obligatorio.';
                }
                return '';
            case 'fechaNacimiento':
                if (!trimmed) {
                    return 'La fecha de nacimiento es obligatoria.';
                }
                if (Number.isNaN(Date.parse(trimmed))) {
                    return 'Ingrese una fecha válida.';
                }
                if (new Date(trimmed) > new Date()) {
                    return 'La fecha de nacimiento no puede estar en el futuro.';
                }
                return '';
            case 'email':
                if (!trimmed) {
                    return 'El correo electrónico es obligatorio.';
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                    return 'Ingrese un correo electrónico válido.';
                }
                return '';
            case 'telefono':
                if (!trimmed) {
                    return '';
                }
                if (!/^[+\d][\d\s-]{6,}$/.test(trimmed)) {
                    return 'Ingrese un teléfono válido.';
                }
                return '';
            case 'direccion':
                return '';
            case 'userId':
                if (!trimmed) {
                    return 'El identificador de usuario es obligatorio.';
                }
                if (!/^\d+$/.test(trimmed)) {
                    return 'El identificador de usuario debe ser numérico.';
                }
                return '';
            default:
                return '';
        }
    };

    const validateForm = (data: VendorFormData): VendorFormErrors => {
        const nextErrors: VendorFormErrors = {};
        (Object.keys(data) as (keyof VendorFormData)[]).forEach((field) => {
            const errorMessage = validateField(field, data[field]);
            if (errorMessage) {
                nextErrors[field] = errorMessage;
            }
        });
        return nextErrors;
    };

    useEffect(() => {
        setFormErrors(validateForm(formData));
    }, [formData]);

    const hasErrors = useMemo(() => Object.values(formErrors).some(Boolean), [formErrors]);
    const requiredFieldsCompleted = useMemo(
        () => requiredVendorFields.every((field) => formData[field].trim() !== ''),
        [formData]
    );

    const isSubmitDisabled = isSubmitting || hasErrors || !requiredFieldsCompleted;

    const handleBlur = (field: keyof VendorFormData) => {
        setTouchedFields((prev) => ({
            ...prev,
            [field]: true,
        }));
    };

    const handleChange = (field: keyof VendorFormData, value: string) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleOpenUserPicker = () => {
        setIsUserPickerOpen(true);
    };

    const handleCloseUserPicker = () => {
        setIsUserPickerOpen(false);
    };

    const handleSelectUser = (user: User) => {
        setSelectedUser(user);
        handleChange('userId', user.id.toString());
        setTouchedFields((prev) => ({
            ...prev,
            userId: true,
        }));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const currentErrors = validateForm(formData);
        setFormErrors(currentErrors);
        setTouchedFields((prev) => {
            const updated: Record<keyof VendorFormData, boolean> = { ...prev };
            (Object.keys(prev) as (keyof VendorFormData)[]).forEach((field) => {
                updated[field] = true;
            });
            return updated;
        });

        if (Object.values(currentErrors).some(Boolean)) {
            toast({
                title: 'Revisa la información ingresada.',
                description: 'Hay errores en el formulario que debes corregir antes de continuar.',
                status: 'warning',
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        setIsSubmitting(true);
        setApiError(null);

        const payload = {
            cedula: formData.cedula.trim(),
            nombres: formData.nombres.trim(),
            apellidos: formData.apellidos.trim(),
            fechaNacimiento: formData.fechaNacimiento,
            email: formData.email.trim(),
            telefono: formData.telefono.trim() || undefined,
            direccion: formData.direccion.trim() || undefined,
            userId: formData.userId.trim(),
        };

        try {
            const response = await axios.post(endPoints.create_vendedor, payload);

            if (response.status === 201) {
                toast({
                    title: 'Vendedor registrado.',
                    description: 'El vendedor se creó correctamente.',
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                });
                setFormData(initialVendorFormState);
                setTouchedFields({
                    cedula: false,
                    nombres: false,
                    apellidos: false,
                    fechaNacimiento: false,
                    email: false,
                    telefono: false,
                    direccion: false,
                    userId: false,
                });
                setSelectedUser(null);

                if (onVendorCreated) {
                    onVendorCreated();
                }
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const message = (error.response?.data as { error?: string } | undefined)?.error ??
                    'Ocurrió un error inesperado al registrar el vendedor.';

                if (status === 400 || status === 404) {
                    toast({
                        title: 'No fue posible registrar al vendedor.',
                        description: message,
                        status: 'error',
                        duration: 6000,
                        isClosable: true,
                    });
                    setApiError(message);
                } else {
                    toast({
                        title: 'Error del servidor.',
                        description: message,
                        status: 'error',
                        duration: 6000,
                        isClosable: true,
                    });
                    setApiError(message);
                }
            } else {
                toast({
                    title: 'Error desconocido.',
                    description: 'Ocurrió un error inesperado, intenta nuevamente más tarde.',
                    status: 'error',
                    duration: 6000,
                    isClosable: true,
                });
                setApiError('Ocurrió un error inesperado, intenta nuevamente más tarde.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <VStack align="stretch" gap={6} asChild><form onSubmit={handleSubmit}>
                                            <Text fontWeight="semibold" fontSize="lg">
                                                Completa los datos del nuevo vendedor
                                            </Text>

                                            {apiError && (
                                                <Alert.Root status="error" borderRadius="md">
                                                    <Alert.Indicator />
                                                    <VStack align="start" gap={0}>
                                                        <Alert.Title>Se produjo un error.</Alert.Title>
                                                        <Alert.Description>{apiError}</Alert.Description>
                                                    </VStack>
                                                </Alert.Root>
                                            )}

                                            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                                                <Field.Root required invalid={touchedFields.cedula && !!formErrors.cedula}>
                                                    <Field.Label>Cédula</Field.Label>
                                                    <Input
                                                        name="cedula"
                                                        value={formData.cedula}
                                                        onChange={(event) => handleChange('cedula', event.target.value)}
                                                        onBlur={() => handleBlur('cedula')}
                                                        placeholder="Número de cédula"
                                                    />
                                                    <Field.ErrorText>{formErrors.cedula}</Field.ErrorText>
                                                </Field.Root>

                                                <Field.Root required invalid={touchedFields.nombres && !!formErrors.nombres}>
                                                    <Field.Label>Nombres</Field.Label>
                                                    <Input
                                                        name="nombres"
                                                        value={formData.nombres}
                                                        onChange={(event) => handleChange('nombres', event.target.value)}
                                                        onBlur={() => handleBlur('nombres')}
                                                        placeholder="Nombres completos"
                                                    />
                                                    <Field.ErrorText>{formErrors.nombres}</Field.ErrorText>
                                                </Field.Root>

                                                <Field.Root required invalid={touchedFields.apellidos && !!formErrors.apellidos}>
                                                    <Field.Label>Apellidos</Field.Label>
                                                    <Input
                                                        name="apellidos"
                                                        value={formData.apellidos}
                                                        onChange={(event) => handleChange('apellidos', event.target.value)}
                                                        onBlur={() => handleBlur('apellidos')}
                                                        placeholder="Apellidos completos"
                                                    />
                                                    <Field.ErrorText>{formErrors.apellidos}</Field.ErrorText>
                                                </Field.Root>

                                                <Field.Root
                                                    required
                                                    invalid={touchedFields.fechaNacimiento && !!formErrors.fechaNacimiento}
                                                >
                                                    <Field.Label>Fecha de nacimiento</Field.Label>
                                                    <Input
                                                        type="date"
                                                        name="fechaNacimiento"
                                                        value={formData.fechaNacimiento}
                                                        max={new Date().toISOString().split('T')[0]}
                                                        onChange={(event) => handleChange('fechaNacimiento', event.target.value)}
                                                        onBlur={() => handleBlur('fechaNacimiento')}
                                                    />
                                                    <Field.ErrorText>{formErrors.fechaNacimiento}</Field.ErrorText>
                                                </Field.Root>

                                                <Field.Root required invalid={touchedFields.email && !!formErrors.email}>
                                                    <Field.Label>Correo electrónico</Field.Label>
                                                    <Input
                                                        type="email"
                                                        name="email"
                                                        value={formData.email}
                                                        onChange={(event) => handleChange('email', event.target.value)}
                                                        onBlur={() => handleBlur('email')}
                                                        placeholder="correo@dominio.com"
                                                    />
                                                    <Field.ErrorText>{formErrors.email}</Field.ErrorText>
                                                </Field.Root>

                                                <Field.Root invalid={touchedFields.telefono && !!formErrors.telefono}>
                                                    <Field.Label>Teléfono (opcional)</Field.Label>
                                                    <Input
                                                        name="telefono"
                                                        value={formData.telefono}
                                                        onChange={(event) => handleChange('telefono', event.target.value)}
                                                        onBlur={() => handleBlur('telefono')}
                                                        placeholder="Ej. +58 555-1234567"
                                                    />
                                                    <Field.ErrorText>{formErrors.telefono}</Field.ErrorText>
                                                </Field.Root>

                                                <Field.Root invalid={touchedFields.direccion && !!formErrors.direccion}>
                                                    <Field.Label>Dirección (opcional)</Field.Label>
                                                    <Textarea
                                                        name="direccion"
                                                        value={formData.direccion}
                                                        onChange={(event) => handleChange('direccion', event.target.value)}
                                                        onBlur={() => handleBlur('direccion')}
                                                        placeholder="Dirección de residencia"
                                                        rows={3}
                                                    />
                                                    <Field.ErrorText>{formErrors.direccion}</Field.ErrorText>
                                                </Field.Root>

                                                <Field.Root required invalid={touchedFields.userId && !!formErrors.userId}>
                                                    <Field.Label>ID de usuario</Field.Label>
                                                    <InputGroup
                                                        endElement={(
                                                            <IconButton
                                                                aria-label="Buscar usuario"
                                                                size="sm"
                                                                onClick={handleOpenUserPicker}
                                                            >
                                                                <LuSearch />
                                                            </IconButton>
                                                        )}
                                                    >
                                                        <Input
                                                            name="userId"
                                                            value={formData.userId}
                                                            readOnly
                                                            placeholder="Seleccione un usuario"
                                                            bg="app.inputReadonly"
                                                        />
                                                    </InputGroup>
                                                    <Field.ErrorText>{formErrors.userId}</Field.ErrorText>
                                                </Field.Root>
                                            </SimpleGrid>

                                            <Button
                                                type="submit"
                                                colorPalette="blue"
                                                alignSelf={{ base: 'stretch', md: 'flex-end' }}
                                                loading={isSubmitting}
                                                disabled={isSubmitDisabled}
                                            >
                                                Registrar vendedor
                                            </Button>

                                            <UserGenericPicker
                                                isOpen={isUserPickerOpen}
                                                onClose={handleCloseUserPicker}
                                                onSelectUser={handleSelectUser}
                                            />
                                        </form></VStack>
    );
};

export default CrearVendedor;
