// src/pages/Usuarios/CreateUser.tsx
import { useState } from 'react';
import { Steps, Box, Button, Input, useToast, Heading, Grid, GridItem, Flex, Field } from '@chakra-ui/react';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';

type Props = {
    onUserCreated: () => void;
    onCancel: () => void;
};

export default function CreateUser({ onUserCreated, onCancel }: Props) {
    const [cedula, setCedula] = useState('');
    const [username, setUsername] = useState('');
    const [nombreCompleto, setNombreCompleto] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [cel, setCel] = useState('');
    const [direccion, setDireccion] = useState('');
    const [fechaNacimiento, setFechaNacimiento] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const toast = useToast();

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleCreate = async () => {
        // Validate email
        if (!email) {
            setEmailError('El correo electrónico es requerido');
            return;
        } else if (!validateEmail(email)) {
            setEmailError('Por favor ingrese un correo electrónico válido');
            return;
        } else {
            setEmailError('');
        }

        setIsLoading(true);
        try {
            await axios.post(`${EndPointsURL.getDomain()}/usuarios`, {
                cedula: Number(cedula),
                username,
                nombreCompleto,
                password,
                email,
                cel,
                direccion,
                fechaNacimiento,
                estado: '1' // Always 1 (active) for new users
            });

            toast({
                title: "Usuario creado",
                description: "El usuario ha sido creado exitosamente.",
                status: "success",
                duration: 5000,
                isClosable: true,
            });
            onUserCreated(); // vuelve al modo UserViewer
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo crear el usuario.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box borderWidth="1px" borderRadius="lg" p={6} >
            <Heading size="md" mb={4}>Crear Nuevo Usuario</Heading>
            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <GridItem>
                    <Field.Root required>
                        <Field.Label>Cédula</Field.Label>
                        <Input autoComplete={"off"}
                               type="number"
                               value={cedula}
                               onValueChange={(e) => setCedula(e.target.value)}
                        />
                    </Field.Root>
                </GridItem>
                <GridItem>
                    <Field.Root required>
                        <Field.Label>Nombre Completo</Field.Label>
                        <Input autoComplete={"off"}
                               value={nombreCompleto}
                               onValueChange={(e) => setNombreCompleto(e.target.value)}
                        />
                    </Field.Root>
                </GridItem>

                <GridItem>
                    <Field.Root required>
                        <Field.Label>Nombre de Usuario</Field.Label>
                        <Input autoComplete={"new-username"}
                               value={username}
                               onValueChange={(e) => setUsername(e.target.value)}
                        />
                    </Field.Root>
                </GridItem>
                <GridItem>
                    <Field.Root required>
                        <Field.Label>Contraseña</Field.Label>
                        <Input autoComplete={"new-password"}
                               type="password"
                               value={password}
                               onValueChange={(e) => setPassword(e.target.value)}
                        />
                    </Field.Root>
                </GridItem>

                <GridItem>
                    <Field.Root required invalid={!!emailError}>
                        <Field.Label>Correo Electrónico</Field.Label>
                        <Input
                            autoComplete={"off"}
                            type="email" 
                            value={email} 
                            onValueChange={(e) => {
                                setEmail(e.target.value);
                                if (emailError) setEmailError('');
                            }} 
                        />
                        {emailError && <Field.ErrorText>{emailError}</Field.ErrorText>}
                    </Field.Root>
                </GridItem>

                <GridItem>
                    <Field.Root>
                        <Field.Label>Celular</Field.Label>
                        <Input autoComplete={"off"}
                               value={cel}
                               onValueChange={(e) => setCel(e.target.value)}
                        />
                    </Field.Root>
                </GridItem>
                <GridItem>
                    <Field.Root>
                        <Field.Label>Dirección</Field.Label>
                        <Input autoComplete={"off"}
                               value={direccion}
                               onValueChange={(e) => setDireccion(e.target.value)}
                        />
                    </Field.Root>
                </GridItem>

                <GridItem>
                    <Field.Root>
                        <Field.Label>Fecha de Nacimiento</Field.Label>
                        <Input autoComplete={"off"}
                               type="date"
                               value={fechaNacimiento}
                               onValueChange={(e) => setFechaNacimiento(e.target.value)}
                        />
                    </Field.Root>
                </GridItem>
            </Grid>

            <Flex gap={4} mt={6}>
                <Button
                    colorPalette="blue"
                    onClick={handleCreate}
                    loading={isLoading}
                    loadingText="Creando..."
                >
                    Crear Usuario
                </Button>
                <Button onClick={onCancel} disabled={isLoading}>Cancelar</Button>
            </Flex>
        </Box>
    );
}
