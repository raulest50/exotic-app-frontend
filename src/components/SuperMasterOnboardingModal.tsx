import { useState, useEffect } from "react";
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    FormControl,
    FormLabel,
    Input,
    Text,
    Progress,
    useToast,
} from "@chakra-ui/react";
import axios from "axios";
import EndPointsURL from "../api/EndPointsURL";
import { clearUserCache } from "../api/UserApi";

function calculatePasswordStrength(password: string): { strength: number; color: string; text: string } {
    if (!password) return { strength: 0, color: "gray.200", text: "" };
    if (password.length < 8) {
        return { strength: 20, color: "red.500", text: "Débil - Mínimo 8 caracteres" };
    }
    let strength = 0;
    strength += Math.min(password.length * 4, 25);
    if (/[A-Z]/.test(password)) strength += 15;
    if (/[a-z]/.test(password)) strength += 10;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^A-Za-z0-9]/.test(password)) strength += 15;
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
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SuperMasterOnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function SuperMasterOnboardingModal({ isOpen, onClose, onSuccess }: SuperMasterOnboardingModalProps) {
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [codeSent, setCodeSent] = useState(false);
    const [sendCodeLoading, setSendCodeLoading] = useState(false);
    const [sendCodeCooldown, setSendCodeCooldown] = useState(0);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordStrength, setPasswordStrength] = useState({ strength: 0, color: "gray.200", text: "" });
    const [submitLoading, setSubmitLoading] = useState(false);
    const toast = useToast();
    const endPoints = new EndPointsURL();

    useEffect(() => {
        setPasswordStrength(calculatePasswordStrength(password));
    }, [password]);

    useEffect(() => {
        if (sendCodeCooldown <= 0) return;
        const t = setInterval(() => setSendCodeCooldown((c) => c - 1), 1000);
        return () => clearInterval(t);
    }, [sendCodeCooldown]);

    const emailValid = EMAIL_REGEX.test(email.trim());
    const codeValid = /^\d{6}$/.test(code.trim());
    const passwordValid = password.length >= 8 && passwordStrength.strength >= 40;
    const passwordsMatch = password === confirmPassword && password.length >= 8;
    const canSubmit = emailValid && codeValid && passwordValid && passwordsMatch;

    const handleSendCode = async () => {
        if (!emailValid || sendCodeLoading || sendCodeCooldown > 0) return;
        setSendCodeLoading(true);
        try {
            await axios.post(endPoints.send_super_master_verification_code, { email: email.trim() });
            setCodeSent(true);
            setSendCodeCooldown(60);
            toast({
                title: "Código enviado",
                description: "Revisa tu correo para el código de 6 dígitos.",
                status: "success",
                duration: 5000,
                isClosable: true,
            });
        } catch (err: unknown) {
            const msg = err && typeof err === "object" && "response" in err && (err.response as { data?: { message?: string } })?.data?.message;
            toast({
                title: "Error al enviar código",
                description: msg ?? "No se pudo enviar el código.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSendCodeLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!canSubmit || submitLoading) return;
        setSubmitLoading(true);
        try {
            await axios.post(endPoints.complete_super_master_profile, {
                email: email.trim(),
                code: code.trim(),
                newPassword: password,
            });
            clearUserCache();
            toast({
                title: "Perfil completado",
                description: "Email y contraseña guardados correctamente.",
                status: "success",
                duration: 5000,
                isClosable: true,
            });
            onSuccess();
            onClose();
        } catch (err: unknown) {
            const msg = err && typeof err === "object" && "response" in err && (err.response as { data?: { message?: string } })?.data?.message;
            toast({
                title: "Error",
                description: msg ?? "No se pudo completar el perfil.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSubmitLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Completar perfil de Super Master</ModalHeader>
                <ModalBody>
                    <FormControl isRequired mb={4}>
                        <FormLabel>Correo electrónico</FormLabel>
                        <Input
                            type="email"
                            placeholder="correo@ejemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            isDisabled={codeSent}
                        />
                    </FormControl>
                    <Button
                        mb={4}
                        colorScheme="blue"
                        onClick={handleSendCode}
                        isDisabled={!emailValid || sendCodeLoading || sendCodeCooldown > 0}
                        isLoading={sendCodeLoading}
                    >
                        {sendCodeCooldown > 0 ? `Reenviar en ${sendCodeCooldown}s` : "Enviar código de verificación"}
                    </Button>

                    {codeSent && (
                        <>
                            <FormControl isRequired mb={4}>
                                <FormLabel>Código de 6 dígitos</FormLabel>
                                <Input
                                    type="text"
                                    placeholder="000000"
                                    maxLength={6}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                                />
                            </FormControl>
                            <FormControl isRequired mb={2}>
                                <FormLabel>Contraseña</FormLabel>
                                <Input
                                    type="password"
                                    placeholder="Mínimo 8 caracteres"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <Progress
                                    value={passwordStrength.strength}
                                    colorScheme={passwordStrength.color.split(".")[0]}
                                    size="sm"
                                    mt={2}
                                />
                                <Text fontSize="sm" color={passwordStrength.color} mt={1}>
                                    {passwordStrength.text}
                                </Text>
                            </FormControl>
                            <FormControl isRequired mb={4}>
                                <FormLabel>Repetir contraseña</FormLabel>
                                <Input
                                    type="password"
                                    placeholder="Repetir contraseña"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                                {confirmPassword && !passwordsMatch && (
                                    <Text fontSize="sm" color="red.500" mt={1}>
                                        Las contraseñas no coinciden
                                    </Text>
                                )}
                            </FormControl>
                        </>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={onClose}>
                        Cerrar
                    </Button>
                    <Button
                        colorScheme="blue"
                        onClick={handleSubmit}
                        isDisabled={!canSubmit || submitLoading}
                        isLoading={submitLoading}
                    >
                        Aceptar
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
