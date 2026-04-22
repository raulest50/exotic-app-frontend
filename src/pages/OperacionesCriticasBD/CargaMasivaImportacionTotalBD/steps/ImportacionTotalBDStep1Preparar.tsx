import {
    Alert,
    AlertDescription,
    AlertIcon,
    Box,
    Button,
    FormControl,
    FormLabel,
    Input,
    Text,
    useToast,
    VStack,
} from "@chakra-ui/react";
import { useEffect, useState, type ChangeEvent } from "react";

interface ImportacionTotalBDStep1PrepararProps {
    setActiveStep: (step: number) => void;
    dumpFile: File | null;
    setDumpFile: (file: File | null) => void;
}

export default function ImportacionTotalBDStep1Preparar({
    setActiveStep,
    dumpFile,
    setDumpFile,
}: ImportacionTotalBDStep1PrepararProps) {
    const [randomToken, setRandomToken] = useState("");
    const [inputToken, setInputToken] = useState("");
    const toast = useToast();

    useEffect(() => {
        const token = Math.floor(1000 + Math.random() * 9000).toString();
        setRandomToken(token);
        setInputToken("");
    }, []);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        if (!file) {
            setDumpFile(null);
            return;
        }

        const lowerName = file.name.toLowerCase();
        if (!lowerName.endsWith(".dump")) {
            setDumpFile(null);
            event.target.value = "";
            toast({
                title: "Tipo de archivo no permitido",
                description: "Solo se permiten archivos PostgreSQL .dump para la importacion total.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        setDumpFile(file);
    };

    return (
        <VStack align="stretch" spacing={6}>
            <Alert status="warning">
                <AlertIcon />
                <AlertDescription>
                    Al avanzar al siguiente paso se iniciara una restauracion total que primero vaciara la base
                    actual. Verifique cuidadosamente el archivo antes de continuar.
                </AlertDescription>
            </Alert>

            <Box>
                <FormControl>
                    <FormLabel>Archivo de backup total (.dump)</FormLabel>
                    <Input
                        type="file"
                        accept=".dump"
                        onChange={handleFileChange}
                    />
                </FormControl>

                <Text mt={2} color="gray.600" fontSize="sm">
                    {dumpFile ? `Archivo seleccionado: ${dumpFile.name}` : "Aun no ha seleccionado un archivo .dump."}
                </Text>
            </Box>

            <Box>
                <Text fontWeight="bold" mb={2}>
                    Token de confirmacion: <strong>{randomToken}</strong>
                </Text>

                <FormControl>
                    <FormLabel>Ingrese el token de 4 digitos</FormLabel>
                    <Input
                        placeholder="Ingrese el token de 4 digitos"
                        value={inputToken}
                        onChange={(e) => setInputToken(e.target.value)}
                    />
                </FormControl>
            </Box>

            <Button variant="outline" onClick={() => setActiveStep(0)}>
                Atras
            </Button>
            <Button
                colorScheme="red"
                onClick={() => setActiveStep(2)}
                isDisabled={!dumpFile || inputToken !== randomToken}
            >
                Continuar a la ejecucion
            </Button>
        </VStack>
    );
}
