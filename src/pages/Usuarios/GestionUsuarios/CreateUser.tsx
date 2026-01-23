// src/pages/Usuarios/CreateUser.tsx
import { useState } from 'react';
import {
    Box,
    Button,
    FormControl,
    FormLabel,
    Input,
    useToast,
    Heading,
    Grid,
    GridItem,
    Flex,
    FormErrorMessage
} from '@chakra-ui/react';
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
        }
    };

    return (
        <Box borderWidth="1px" borderRadius="lg" p={6} >
            <Heading size="md" mb={4}>Crear Nuevo Usuario</Heading>
            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <GridItem>
                    <FormControl isRequired>
                        <FormLabel>Cédula</FormLabel>
                        <Input autoComplete={"off"}
                               type="number"
                               value={cedula}
                               onChange={(e) => setCedula(e.target.value)}
                        />
                    </FormControl>
                </GridItem>
                <GridItem>
                    <FormControl isRequired>
                        <FormLabel>Nombre Completo</FormLabel>
                        <Input autoComplete={"off"}
                               value={nombreCompleto}
                               onChange={(e) => setNombreCompleto(e.target.value)}
                        />
                    </FormControl>
                </GridItem>

                <GridItem>
                    <FormControl isRequired>
                        <FormLabel>Nombre de Usuario</FormLabel>
                        <Input autoComplete={"new-username"}
                               value={username}
                               onChange={(e) => setUsername(e.target.value)}
                        />
                    </FormControl>
                </GridItem>
                <GridItem>
                    <FormControl isRequired>
                        <FormLabel>Contraseña</FormLabel>
                        <Input autoComplete={"new-password"}
                               type="password"
                               value={password}
                               onChange={(e) => setPassword(e.target.value)}
                        />
                    </FormControl>
                </GridItem>

                <GridItem>
                    <FormControl isRequired isInvalid={!!emailError}>
                        <FormLabel>Correo Electrónico</FormLabel>
                        <Input
                            autoComplete={"off"}
                            type="email" 
                            value={email} 
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (emailError) setEmailError('');
                            }} 
                        />
                        {emailError && <FormErrorMessage>{emailError}</FormErrorMessage>}
                    </FormControl>
                </GridItem>

                <GridItem>
                    <FormControl>
                        <FormLabel>Celular</FormLabel>
                        <Input autoComplete={"off"}
                               value={cel}
                               onChange={(e) => setCel(e.target.value)}
                        />
                    </FormControl>
                </GridItem>
                <GridItem>
                    <FormControl>
                        <FormLabel>Dirección</FormLabel>
                        <Input autoComplete={"off"}
                               value={direccion}
                               onChange={(e) => setDireccion(e.target.value)}
                        />
                    </FormControl>
                </GridItem>

                <GridItem>
                    <FormControl>
                        <FormLabel>Fecha de Nacimiento</FormLabel>
                        <Input autoComplete={"off"}
                               type="date"
                               value={fechaNacimiento}
                               onChange={(e) => setFechaNacimiento(e.target.value)}
                        />
                    </FormControl>
                </GridItem>
            </Grid>

            <Flex gap={4} mt={6}>
                <Button colorScheme="blue" onClick={handleCreate}>Crear Usuario</Button>
                <Button onClick={onCancel}>Cancelar</Button>
            </Flex>
        </Box>
    );
}
