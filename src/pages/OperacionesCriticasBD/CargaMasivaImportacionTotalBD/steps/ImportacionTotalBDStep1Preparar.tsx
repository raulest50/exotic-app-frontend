import { Alert, Box, Button, Input, Text, VStack, Field } from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
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
    const toast = useAppToast();

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
        <VStack align="stretch" gap={6}>
            <Alert.Root status="warning">
                <Alert.Indicator />
                <Alert.Description>
                    Al avanzar al siguiente paso se iniciara una restauracion total que primero vaciara la base
                    actual. Verifique cuidadosamente el archivo antes de continuar.
                </Alert.Description>
            </Alert.Root>

            <Box>
                <Field.Root>
                    <Field.Label>Archivo de backup total (.dump)</Field.Label>
                    <Input
                        type="file"
                        accept=".dump"
                        onChange={handleFileChange}
                    />
                </Field.Root>

                <Text mt={2} color="app.textMuted" fontSize="sm">
                    {dumpFile ? `Archivo seleccionado: ${dumpFile.name}` : "Aun no ha seleccionado un archivo .dump."}
                </Text>
            </Box>

            <Box>
                <Text fontWeight="bold" mb={2}>
                    Token de confirmacion: <strong>{randomToken}</strong>
                </Text>

                <Field.Root>
                    <Field.Label>Ingrese el token de 4 digitos</Field.Label>
                    <Input
                        placeholder="Ingrese el token de 4 digitos"
                        value={inputToken}
                        onChange={(e) => setInputToken(e.target.value)}
                    />
                </Field.Root>
            </Box>

            <Button variant="outline" onClick={() => setActiveStep(0)}>
                Atras
            </Button>
            <Button
                colorPalette="red"
                onClick={() => setActiveStep(2)}
                disabled={!dumpFile || inputToken !== randomToken}
            >
                Continuar a la ejecucion
            </Button>
        </VStack>
    );
}
