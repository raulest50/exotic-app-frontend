import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Button,
    Container,
    Flex,
    FormControl,
    FormLabel,
    Heading,
    Input,
    Image,
    Box,
    Text,
    Progress,
    useToast
} from "@chakra-ui/react";
import axios from 'axios';
import EndPointsURL from '../../api/EndPointsURL.tsx';

// Function to calculate password strength
const calculatePasswordStrength = (password: string): { strength: number, color: string, text: string } => {
    if (!password) return { strength: 0, color: "gray.200", text: "" };

    // Basic length check
    if (password.length < 8) {
        return { strength: 20, color: "red.500", text: "Débil - Mínimo 8 caracteres" };
    }

    let strength = 0;

    // Length bonus
    strength += Math.min(password.length * 4, 25);

    // Check for various character types
    if (/[A-Z]/.test(password)) strength += 15; // Uppercase
    if (/[a-z]/.test(password)) strength += 10; // Lowercase
    if (/[0-9]/.test(password)) strength += 15; // Numbers
    if (/[^A-Za-z0-9]/.test(password)) strength += 15; // Special characters

    // Determine color and text based on strength
    let color = "red.500";
    let text = "Débil";

    if (strength >= 60) {
        color = "green.500";
        text = "Fuerte";
    } else if (strength >= 40) {
        color = "yellow.500";
        text = "Moderado";
    }

    return { strength, color, text };
};

export default function ResetPasswordPage() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [token, setToken] = useState('');
    const [passwordsMatch, setPasswordsMatch] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState({ strength: 0, color: "gray.200", text: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();
    const toast = useToast();
    const endpoints = new EndPointsURL();

    // Extract token from URL on component mount
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const tokenParam = queryParams.get('token');

        if (tokenParam) {
            setToken(tokenParam);
        } else {
            // No token provided, redirect to login
            toast({
                title: "Error",
                description: "No se proporcionó un token válido para restablecer la contraseña.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            navigate('/login');
        }
    }, [location, navigate, toast]);

    // Update password strength when password changes
    useEffect(() => {
        setPasswordStrength(calculatePasswordStrength(newPassword));
    }, [newPassword]);

    // Check if passwords match
    useEffect(() => {
        setPasswordsMatch(newPassword === confirmPassword && newPassword.length >= 8);
    }, [newPassword, confirmPassword]);

    // Handle form submission
    const handleOnclickSend = async () => {
        if (!passwordsMatch || isSubmitting) return;

        setIsSubmitting(true);

        try {
            // Call the API to set new password
            await axios.post(endpoints.set_new_passw, {
                token,
                newPassword
            });

            // Show success toast notification
            toast({
                title: "Contraseña actualizada",
                description: "Su contraseña ha sido actualizada correctamente.",
                status: "success",
                duration: 5000,
                isClosable: true,
            });

            // Redirect to login page after successful password reset
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (error) {
            console.error("Error setting new password:", error);

            // Show error toast notification
            toast({
                title: "Error",
                description: "No se pudo actualizar la contraseña. El enlace puede haber expirado o ser inválido.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Container
            w="full"
            maxW={{ base: "100%", md: "container.md" }}
            px={{ base: 4, md: 6 }}
            py={{ base: 6, md: 8 }}
            minH="100vh"
        >
            <Flex
                direction="column"
                gap={{ base: 5, md: 7 }}
                border="0.5px solid gray"
                borderRadius={{ base: "xl", md: "2em" }}
                p={{ base: 6, sm: 8, md: "4em" }}
                alignItems="center"
                w="full"
            >
                <Box boxSize={{ base: "8rem", sm: "10rem", md: "3xs" }}>
                    <Image src={'/logo_exotic.svg'} />
                </Box>
                <Heading fontSize={{ base: "2xl", md: "3xl" }} textAlign="center">
                    Restablecer Contraseña
                </Heading>

                <FormControl isRequired w="full">
                    <FormLabel>Nueva Contraseña</FormLabel>
                    <Input
                        placeholder="Nueva contraseña"
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                    />
                    <Progress 
                        value={passwordStrength.strength} 
                        colorScheme={passwordStrength.color.split('.')[0]} 
                        size="sm" 
                        mt={2} 
                    />
                    <Text fontSize="sm" color={passwordStrength.color} mt={1}>
                        {passwordStrength.text}
                    </Text>
                </FormControl>

                <FormControl isRequired w="full">
                    <FormLabel>Confirmar Contraseña</FormLabel>
                    <Input
                        placeholder="Confirmar contraseña"
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                    />
                    {confirmPassword && !passwordsMatch && (
                        <Text fontSize="sm" color="red.500" mt={1}>
                            Las contraseñas no coinciden
                        </Text>
                    )}
                </FormControl>

                <Button
                    variant="solid"
                    colorScheme={"blue"}
                    onClick={handleOnclickSend}
                    isDisabled={!passwordsMatch || isSubmitting}
                    isLoading={isSubmitting}
                    loadingText="Procesando..."
                    w={{ base: "full", sm: "auto" }}
                >
                    Cambiar Contraseña
                </Button>
            </Flex>
        </Container>
    );
}
