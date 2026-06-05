import {
    Alert,
    AlertDescription,
    AlertIcon,
    Box,
    Button,
    FormControl,
    FormLabel,
    Input,
    SimpleGrid,
    Text,
    VStack,
    useToast,
} from "@chakra-ui/react";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import EndPointsURL from "../../../api/EndPointsURL";

interface PasswordResetResponse {
    sanitizedUsers: number;
    privilegedUsersSkipped: number;
    invalidUsersSkipped: number;
    message: string;
}

function createConfirmationToken(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

function resolveErrorMessage(error: unknown): string {
    if (!axios.isAxiosError(error)) {
        return "No fue posible ejecutar el reset de contrasenas.";
    }

    const data = error.response?.data;
    if (typeof data === "string" && data.trim()) {
        return data;
    }
    if (data && typeof data === "object" && "message" in data && typeof data.message === "string") {
        return data.message;
    }
    return error.message || "No fue posible ejecutar el reset de contrasenas.";
}

export default function ResetPasswordsNoProductivoTab() {
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const toast = useToast();
    const [randomToken, setRandomToken] = useState("");
    const [inputToken, setInputToken] = useState("");
    const [isExecuting, setIsExecuting] = useState(false);
    const [result, setResult] = useState<PasswordResetResponse | null>(null);

    const regenerateToken = () => {
        setRandomToken(createConfirmationToken());
        setInputToken("");
    };

    useEffect(() => {
        setRandomToken(createConfirmationToken());
        setInputToken("");
    }, []);

    const handleExecute = async () => {
        setIsExecuting(true);
        setResult(null);
        try {
            const response = await axios.post<PasswordResetResponse>(endpoints.reset_non_production_passwords, {});
            setResult(response.data);
            toast({
                title: "Reset ejecutado",
                description: response.data.message,
                status: "success",
                duration: 6000,
                isClosable: true,
            });
            regenerateToken();
        } catch (error) {
            toast({
                title: "Reset no ejecutado",
                description: resolveErrorMessage(error),
                status: "error",
                duration: 7000,
                isClosable: true,
            });
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <VStack align="stretch" spacing={6}>
            <Alert status="warning">
                <AlertIcon />
                <AlertDescription>
                    Esta operacion asigna staging1234 a todos los usuarios no privilegiados. Master y super_master se conservan sin cambios.
                </AlertDescription>
            </Alert>

            <Box>
                <Text fontWeight="bold" mb={2}>
                    Token de confirmacion: <strong>{randomToken}</strong>
                </Text>

                <FormControl>
                    <FormLabel>Ingrese el token de 4 digitos</FormLabel>
                    <Input
                        placeholder="Ingrese el token de 4 digitos"
                        value={inputToken}
                        onChange={(event) => setInputToken(event.target.value)}
                        maxLength={4}
                    />
                </FormControl>
            </Box>

            <Button
                colorScheme="red"
                onClick={handleExecute}
                isLoading={isExecuting}
                isDisabled={!randomToken || inputToken !== randomToken}
            >
                Ejecutar reset
            </Button>

            {result && (
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                    <Box borderWidth="1px" borderRadius="md" p={4}>
                        <Text color="app.textSubtle" fontSize="sm">Usuarios saneados</Text>
                        <Text fontSize="2xl" fontWeight="bold">{result.sanitizedUsers}</Text>
                    </Box>
                    <Box borderWidth="1px" borderRadius="md" p={4}>
                        <Text color="app.textSubtle" fontSize="sm">Privilegiados omitidos</Text>
                        <Text fontSize="2xl" fontWeight="bold">{result.privilegedUsersSkipped}</Text>
                    </Box>
                    <Box borderWidth="1px" borderRadius="md" p={4}>
                        <Text color="app.textSubtle" fontSize="sm">Invalidos omitidos</Text>
                        <Text fontSize="2xl" fontWeight="bold">{result.invalidUsersSkipped}</Text>
                    </Box>
                </SimpleGrid>
            )}
        </VStack>
    );
}
