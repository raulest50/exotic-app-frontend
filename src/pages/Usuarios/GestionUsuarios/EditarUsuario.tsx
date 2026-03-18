import { useState, useMemo } from 'react';
import {
    Box,
    Button,
    FormControl,
    FormLabel,
    FormErrorMessage,
    Input,
    useToast,
    Heading,
    Grid,
    GridItem,
    Flex,
} from '@chakra-ui/react';
import axios from 'axios';
import { User } from './types.tsx';
import EndPointsURL from '../../../api/EndPointsURL.tsx';

type Props = {
    user: User;
    onBack: () => void;
};

interface FormState {
    cedula: string;
    username: string;
    nombreCompleto: string;
    email: string;
    cel: string;
    direccion: string;
    fechaNacimiento: string;
}

function toFormState(user: User): FormState {
    return {
        cedula: user.cedula?.toString() ?? '',
        username: user.username ?? '',
        nombreCompleto: user.nombreCompleto ?? '',
        email: user.email ?? '',
        cel: user.cel ?? '',
        direccion: user.direccion ?? '',
        fechaNacimiento: user.fechaNacimiento ?? '',
    };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EditarUsuario({ user, onBack }: Props) {
    const [form, setForm] = useState<FormState>(toFormState(user));
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();
    const endPoints = new EndPointsURL();

    const original = useMemo(() => toFormState(user), [user]);

    const isDirty = useMemo(() => {
        return (Object.keys(form) as (keyof FormState)[]).some(
            (key) => form[key] !== original[key]
        );
    }, [form, original]);

    const errors = useMemo(() => {
        const e: Partial<Record<keyof FormState, string>> = {};
        if (!form.username.trim()) e.username = 'El nombre de usuario es requerido';
        if (!form.nombreCompleto.trim()) e.nombreCompleto = 'El nombre completo es requerido';
        if (!form.email.trim()) {
            e.email = 'El correo electrónico es requerido';
        } else if (!EMAIL_REGEX.test(form.email)) {
            e.email = 'Por favor ingrese un correo electrónico válido';
        }
        const cedulaNum = Number(form.cedula);
        if (!form.cedula.trim() || isNaN(cedulaNum) || cedulaNum <= 0) {
            e.cedula = 'La cédula debe ser un número mayor a 0';
        }
        return e;
    }, [form]);

    const hasErrors = Object.keys(errors).length > 0;
    const canSave = isDirty && !hasErrors;

    function handleChange(field: keyof FormState, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    async function handleSave() {
        if (!canSave) return;
        setIsLoading(true);
        try {
            const url = endPoints.update_user_info.replace('{userId}', user.id.toString());
            await axios.patch(url, {
                cedula: Number(form.cedula),
                username: form.username,
                nombreCompleto: form.nombreCompleto,
                email: form.email,
                cel: form.cel,
                direccion: form.direccion,
                fechaNacimiento: form.fechaNacimiento || null,
            });
            toast({
                title: 'Usuario actualizado',
                description: 'Los datos del usuario han sido actualizados exitosamente.',
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
            onBack();
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: string } };
            toast({
                title: 'Error',
                description: axiosError.response?.data || 'No se pudo actualizar el usuario.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Box borderWidth="1px" borderRadius="lg" p={6}>
            <Heading size="md" mb={4}>Editar Usuario — {user.username}</Heading>
            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <GridItem>
                    <FormControl isRequired isInvalid={!!errors.cedula}>
                        <FormLabel>Cédula</FormLabel>
                        <Input
                            autoComplete="off"
                            type="number"
                            value={form.cedula}
                            onChange={(e) => handleChange('cedula', e.target.value)}
                            isDisabled={isLoading}
                        />
                        {errors.cedula && <FormErrorMessage>{errors.cedula}</FormErrorMessage>}
                    </FormControl>
                </GridItem>
                <GridItem>
                    <FormControl isRequired isInvalid={!!errors.nombreCompleto}>
                        <FormLabel>Nombre Completo</FormLabel>
                        <Input
                            autoComplete="off"
                            value={form.nombreCompleto}
                            onChange={(e) => handleChange('nombreCompleto', e.target.value)}
                            isDisabled={isLoading}
                        />
                        {errors.nombreCompleto && <FormErrorMessage>{errors.nombreCompleto}</FormErrorMessage>}
                    </FormControl>
                </GridItem>
                <GridItem>
                    <FormControl isRequired isInvalid={!!errors.username}>
                        <FormLabel>Nombre de Usuario</FormLabel>
                        <Input
                            autoComplete="off"
                            value={form.username}
                            onChange={(e) => handleChange('username', e.target.value)}
                            isDisabled={isLoading}
                        />
                        {errors.username && <FormErrorMessage>{errors.username}</FormErrorMessage>}
                    </FormControl>
                </GridItem>
                <GridItem>
                    <FormControl isRequired isInvalid={!!errors.email}>
                        <FormLabel>Correo Electrónico</FormLabel>
                        <Input
                            autoComplete="off"
                            type="email"
                            value={form.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            isDisabled={isLoading}
                        />
                        {errors.email && <FormErrorMessage>{errors.email}</FormErrorMessage>}
                    </FormControl>
                </GridItem>
                <GridItem>
                    <FormControl>
                        <FormLabel>Celular</FormLabel>
                        <Input
                            autoComplete="off"
                            value={form.cel}
                            onChange={(e) => handleChange('cel', e.target.value)}
                            isDisabled={isLoading}
                        />
                    </FormControl>
                </GridItem>
                <GridItem>
                    <FormControl>
                        <FormLabel>Dirección</FormLabel>
                        <Input
                            autoComplete="off"
                            value={form.direccion}
                            onChange={(e) => handleChange('direccion', e.target.value)}
                            isDisabled={isLoading}
                        />
                    </FormControl>
                </GridItem>
                <GridItem>
                    <FormControl>
                        <FormLabel>Fecha de Nacimiento</FormLabel>
                        <Input
                            autoComplete="off"
                            type="date"
                            value={form.fechaNacimiento}
                            onChange={(e) => handleChange('fechaNacimiento', e.target.value)}
                            isDisabled={isLoading}
                        />
                    </FormControl>
                </GridItem>
            </Grid>
            <Flex gap={4} mt={6}>
                <Button
                    colorScheme="blue"
                    onClick={handleSave}
                    isLoading={isLoading}
                    loadingText="Guardando..."
                    isDisabled={!canSave}
                >
                    Guardar cambios
                </Button>
                <Button onClick={onBack} isDisabled={isLoading}>
                    Ir atrás
                </Button>
            </Flex>
        </Box>
    );
}
