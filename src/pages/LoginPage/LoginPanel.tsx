// src/pages/LoginPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useColorModeValue } from "../../components/ui/color-mode";
import { useAuth } from '../../context/AuthContext.tsx';
import { useNavigate } from 'react-router-dom';
import {
    Button,
    Container,
    Flex,
    Heading,
    Input,
    Image,
    Box,
    Link,
    Spinner,
    Text,
    Field,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from 'axios';
import EndPointsURL from '../../api/EndPointsURL.tsx';
import BorderGlow from '../../components/BorderGlow/BorderGlow.tsx';
import FloatingLines from '../../components/FloatingLines/FloatingLines.tsx';
import { loginFloatingLinesPreset } from '../../components/FloatingLines/presets.ts';
import {
    consumeReturnTo,
    consumeSessionNotice,
    type SessionEndReason,
} from '../../auth/sessionLifecycle.ts';

// TypeScript interfaces for component props
interface FormularioLoginProps {
    username: string;
    setUsername: (username: string) => void;
    password: string;
    setPassword: (password: string) => void;
    handleLogin: (e: React.FormEvent) => void;
    setViewMode: (mode: string) => void;
    isLoading: boolean;
}

interface FormularioForgotProps {
    onHandleEnviarForgot: (email: string) => void;
    isRequestDisabled: boolean;
    isLoading: boolean;
    setViewMode: (mode: string) => void;
}

// Login form component
const FormularioLogin: React.FC<FormularioLoginProps> = ({
                                                             username,
                                                             setUsername,
                                                             password,
                                                             setPassword,
                                                             handleLogin,
                                                             setViewMode,
                                                             isLoading
                                                         }) => {
    return (
        <>
            <Heading fontSize={{ base: "2xl", md: "3xl" }} textAlign="center">
                Login Panel
            </Heading>
            <Field.Root required w="full">
                <Field.Label>Usuario</Field.Label>
                <Input
                    placeholder="username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    disabled={isLoading}
                />
            </Field.Root>
            <Field.Root required w="full">
                <Field.Label>Contraseña</Field.Label>
                <Input
                    placeholder="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                />
            </Field.Root>
            <Button
                variant="solid"
                colorPalette={"blue"}
                onClick={handleLogin}
                loading={isLoading}
                loadingText="Iniciando sesión"
                spinnerPlacement="start"
                w={{ base: "full", sm: "auto" }}
            >
                Login
            </Button>
            {isLoading && (
                <Flex align="center" justify="center" mt={2}>
                    <Spinner size="sm" color="blue.500" mr={2} />
                    <Text fontSize="sm" color="app.textMuted">Verificando credenciales...</Text>
                </Flex>
            )}
            <Link
                color="blue.500"
                onClick={() => setViewMode('forgot')}
                pointerEvents={isLoading ? "none" : "auto"}
                opacity={isLoading ? 0.6 : 1}
            >
                ¿Olvidó su contraseña?
            </Link>
        </>
    );
};

// Forgot password form component
const FormularioForgot: React.FC<FormularioForgotProps> = ({
                                                               onHandleEnviarForgot,
                                                               isRequestDisabled,
                                                               isLoading,
                                                               setViewMode
                                                           }) => {
    const [email, setEmail] = useState('');
    return (
        <>
            <Heading fontSize={{ base: "2xl", md: "3xl" }} textAlign="center">
                Recuperar Contraseña
            </Heading>
            <Field.Root required w="full">
                <Field.Label>Correo Electrónico</Field.Label>
                <Input
                    placeholder="correo@ejemplo.com"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={isLoading}
                />
            </Field.Root>
            <Button
                variant="solid"
                colorPalette={"blue"}
                onClick={() => onHandleEnviarForgot(email)}
                disabled={isRequestDisabled}
                loading={isLoading}
                loadingText="Enviando correo"
                spinnerPlacement="start"
                w={{ base: "full", sm: "auto" }}
            >
                Enviar
            </Button>
            {isLoading && (
                <Flex align="center" justify="center" mt={2}>
                    <Spinner size="sm" color="blue.500" mr={2} />
                    <Text fontSize="sm" color="app.textMuted">Enviando solicitud...</Text>
                </Flex>
            )}
            <Link
                color="blue.500"
                onClick={() => setViewMode('login')}
                pointerEvents={isLoading ? "none" : "auto"}
                opacity={isLoading ? 0.6 : 1}
            >
                Volver al login
            </Link>
        </>
    );
};

export default function LoginPanel() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const toast = useAppToast();
    const endpoints = new EndPointsURL();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [viewMode, setViewMode] = useState('login'); // 'login' or 'forgot'
    const [isRequestDisabled, setIsRequestDisabled] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isForgotLoading, setIsForgotLoading] = useState(false);
    const requestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pageBg = useColorModeValue("#f3f7fa", "gray.900");
    const pageBackgroundImage = useColorModeValue(
        `
                radial-gradient(circle at top left, rgba(36, 74, 115, 0.09), transparent 32%),
                radial-gradient(circle at top right, rgba(79, 140, 149, 0.08), transparent 28%),
                linear-gradient(180deg, #fbfcfd 0%, #f1f6f8 45%, #e7eff3 100%)
            `,
        `
                radial-gradient(circle at top left, rgba(56, 189, 248, 0.13), transparent 32%),
                radial-gradient(circle at top right, rgba(45, 212, 191, 0.10), transparent 28%),
                linear-gradient(180deg, #101826 0%, #111827 45%, #0b1220 100%)
            `
    );
    const panelBackgroundColor = useColorModeValue("rgb(255 255 255 / 75%)", "rgb(17 24 39 / 78%)");

    // Clean up timeout on component unmount
    useEffect(() => {
        return () => {
            if (requestTimeoutRef.current) {
                clearTimeout(requestTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const reason = consumeSessionNotice();
        if (!reason || reason === "MANUAL_LOGOUT") return;

        const descriptions: Record<Exclude<SessionEndReason, "MANUAL_LOGOUT">, string> = {
            TOKEN_EXPIRED: "Tu sesión expiró. Inicia sesión nuevamente.",
            INVALID_TOKEN: "Tu sesión ya no es válida. Inicia sesión nuevamente.",
            AUTHENTICATION_REQUIRED: "Debes iniciar sesión nuevamente para continuar.",
            SESSION_VALIDATION_FAILED: "No fue posible validar tu sesión. Inicia sesión nuevamente.",
        };

        toast({
            title: "Sesión finalizada",
            description: descriptions[reason],
            status: "warning",
            duration: 6000,
            isClosable: true,
        });
    }, [toast]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        // Activar estado de carga
        setIsLoading(true);
        try {
            await login(username, password);
            //console.log(response);
            const returnTo = consumeReturnTo();
            navigate(returnTo ?? '/', { replace: true });
            // after successful login, go to home or wherever you want
            // No necesitamos desactivar el estado de carga aquí porque la página se redirigirá
        } catch (error) {
            // Desactivar estado de carga en caso de error
            setIsLoading(false);
            // Mostrar mensaje de error con toast en lugar de alert
            toast({
                title: "Error de inicio de sesión",
                description: "No se pudo iniciar sesión. Verifique sus credenciales.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const onHandleEnviarForgot = async (email: string) => {
        // Implement rate limiting to prevent system overload
        setIsRequestDisabled(true);
        // Set loading state to true
        setIsForgotLoading(true);
        try {
            // Call the API to request password reset
            await axios.post(endpoints.request_reset_passw, { email });
            // Show success toast notification
            toast({
                title: "Solicitud enviada",
                description: "Se ha enviado un correo para recuperar su contraseña.",
                status: "success",
                duration: 5000,
                isClosable: true,
            });
        } catch (error) {
            console.error("Error requesting password reset:", error);
            // Show error toast notification, but with generic message for security
            toast({
                title: "Solicitud enviada",
                description: "Si el correo existe en nuestro sistema, recibirá un enlace para restablecer su contraseña.",
                status: "info",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            // Set loading state to false
            setIsForgotLoading(false);
        }
        // Enable the button after 60 seconds to prevent abuse
        requestTimeoutRef.current = setTimeout(() => {
            setIsRequestDisabled(false);
        }, 60000); // 60 seconds cooldown
    };

    return (
        <Box
            position="relative"
            w="100vw"
            mx="calc(50% - 50vw)"
            minH="100vh"
            overflowX="hidden"
            overflowY="auto"
            isolation="isolate"
            bg={pageBg}
            backgroundImage={pageBackgroundImage}
        >
            <Box position="absolute" inset={0} zIndex={0} pointerEvents="none" opacity={0.92}>
                <FloatingLines {...loginFloatingLinesPreset} />
            </Box>
            <Container
                position="relative"
                zIndex={1}
                w="full"
                maxW={{ base: "100%", md: "container.md" }}
                px={{ base: 4, md: 6 }}
                minH="100vh"
                bg="transparent"
            >
                <Flex align="flex-start" justify="center" minH="100%" pt={{ base: 8, md: 12 }} pb={8} w="full">
                    <Box
                        w="100%"
                        maxW="container.sm"
                        minH={{ base: "auto", md: "75vh", lg: "78vh" }}
                        display="flex"
                        flexDirection="column"
                    >
                        <BorderGlow
                            backgroundColor={panelBackgroundColor}
                            borderRadius={40}
                            borderWidth={3}
                            glowColor="40 92 72"
                            colors={['#c084fc', '#f472b6', '#38bdf8']}
                            glowIntensity={2}
                            fillOpacity={0.78}
                            glowRadius={88}
                            edgeSensitivity={7}
                            coneSpread={25}
                            style={{ flex: 1, width: '100%', minWidth: 0 }}
                        >
                            <Flex
                                direction="column"
                                gap={{ base: 5, md: 7 }}
                                p={{ base: 6, sm: 8, md: "4em" }}
                                alignItems="center"
                                justifyContent="flex-start"
                                flex={1}
                                minW={0}
                            >
                                <Box boxSize={{ base: "9rem", sm: "12rem", md: "16.8rem" }}>
                                    <Image src={'/logo_exotic.svg'} />
                                </Box>
                                {viewMode === 'login' ? (
                                    <FormularioLogin
                                        username={username}
                                        setUsername={setUsername}
                                        password={password}
                                        setPassword={setPassword}
                                        handleLogin={handleLogin}
                                        setViewMode={setViewMode}
                                        isLoading={isLoading}
                                    />
                                ) : (
                                    <FormularioForgot
                                        onHandleEnviarForgot={onHandleEnviarForgot}
                                        isRequestDisabled={isRequestDisabled}
                                        isLoading={isForgotLoading}
                                        setViewMode={setViewMode}
                                    />
                                )}
                            </Flex>
                        </BorderGlow>
                    </Box>
                </Flex>
            </Container>
        </Box>
    );
}
