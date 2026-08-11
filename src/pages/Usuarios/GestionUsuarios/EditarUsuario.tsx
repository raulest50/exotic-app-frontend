import { useState, useMemo } from 'react';
import { Box, Button, Input, Heading, Grid, GridItem, Flex, Field } from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
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
    const toast = useAppToast();
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
                    <Field.Root required invalid={!!errors.cedula}>
                        <Field.Label>Cédula</Field.Label>
                        <Input
                            autoComplete="off"
                            type="number"
                            value={form.cedula}
                            onChange={(e) => handleChange('cedula', e.target.value)}
                            disabled={isLoading}
                        />
                        {errors.cedula && <Field.ErrorText>{errors.cedula}</Field.ErrorText>}
                    </Field.Root>
                </GridItem>
                <GridItem>
                    <Field.Root required invalid={!!errors.nombreCompleto}>
                        <Field.Label>Nombre Completo</Field.Label>
                        <Input
                            autoComplete="off"
                            value={form.nombreCompleto}
                            onChange={(e) => handleChange('nombreCompleto', e.target.value)}
                            disabled={isLoading}
                        />
                        {errors.nombreCompleto && <Field.ErrorText>{errors.nombreCompleto}</Field.ErrorText>}
                    </Field.Root>
                </GridItem>
                <GridItem>
                    <Field.Root required invalid={!!errors.username}>
                        <Field.Label>Nombre de Usuario</Field.Label>
                        <Input
                            autoComplete="off"
                            value={form.username}
                            onChange={(e) => handleChange('username', e.target.value)}
                            disabled={isLoading}
                        />
                        {errors.username && <Field.ErrorText>{errors.username}</Field.ErrorText>}
                    </Field.Root>
                </GridItem>
                <GridItem>
                    <Field.Root required invalid={!!errors.email}>
                        <Field.Label>Correo Electrónico</Field.Label>
                        <Input
                            autoComplete="off"
                            type="email"
                            value={form.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            disabled={isLoading}
                        />
                        {errors.email && <Field.ErrorText>{errors.email}</Field.ErrorText>}
                    </Field.Root>
                </GridItem>
                <GridItem>
                    <Field.Root>
                        <Field.Label>Celular</Field.Label>
                        <Input
                            autoComplete="off"
                            value={form.cel}
                            onChange={(e) => handleChange('cel', e.target.value)}
                            disabled={isLoading}
                        />
                    </Field.Root>
                </GridItem>
                <GridItem>
                    <Field.Root>
                        <Field.Label>Dirección</Field.Label>
                        <Input
                            autoComplete="off"
                            value={form.direccion}
                            onChange={(e) => handleChange('direccion', e.target.value)}
                            disabled={isLoading}
                        />
                    </Field.Root>
                </GridItem>
                <GridItem>
                    <Field.Root>
                        <Field.Label>Fecha de Nacimiento</Field.Label>
                        <Input
                            autoComplete="off"
                            type="date"
                            value={form.fechaNacimiento}
                            onChange={(e) => handleChange('fechaNacimiento', e.target.value)}
                            disabled={isLoading}
                        />
                    </Field.Root>
                </GridItem>
            </Grid>
            <Flex gap={4} mt={6}>
                <Button
                    colorPalette="blue"
                    onClick={handleSave}
                    loading={isLoading}
                    loadingText="Guardando..."
                    disabled={!canSave}
                >
                    Guardar cambios
                </Button>
                <Button onClick={onBack} disabled={isLoading}>
                    Ir atrás
                </Button>
            </Flex>
        </Box>
    );
}
