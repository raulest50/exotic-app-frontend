import { useState, useRef } from "react";
import {
    Alert,
    AlertDescription,
    AlertIcon,
    AlertTitle,
    Box,
    Button,
    Flex,
    Icon,
    Text,
    VStack,
    Divider,
    useToast,
} from "@chakra-ui/react";
import { FaFileCircleQuestion, FaFileCircleCheck } from "react-icons/fa6";
import { FaQuestion, FaCheck, FaTimes } from "react-icons/fa";

type ValidationStatus = "pending" | "passed" | "failed";

export type ValidationResult = { valid: boolean; errors?: string[] };

interface FileChooserWithValidationProps {
    /** Extensions to accept, e.g. [".xls", ".xlsx", ".xlsm", ".xlsb"] */
    allowedExtensions: string[];
    /** Async or sync validation function. Receives the File, returns boolean or ValidationResult. */
    validateFile: (file: File) => ValidationResult | boolean | Promise<ValidationResult | boolean>;
    /** Called when validation passes with the validated file */
    onValidationSuccess?: (file: File) => void;
    /** Called when user clicks "Siguiente", receives the validated file */
    onNext?: (file: File) => void;
    /** Explanatory text shown at the top */
    instructionText?: string;
    /** Label for the load button */
    loadButtonLabel?: string;
    /** Label for the validate button */
    validateButtonLabel?: string;
    /** Label for the next button */
    nextButtonLabel?: string;
    /** Whether to show the "Siguiente" button (default: true) */
    showNextButton?: boolean;
    /** Show a specific message when the user picks a file with one of these rejected extensions */
    rejectedExtensionMessage?: {
        extensions: string[];
        message: string;
    };
}

function normalizeExt(ext: string): string {
    return ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
}

function getValidationIcon(status: ValidationStatus) {
    switch (status) {
        case "passed":
            return FaCheck;
        case "failed":
            return FaTimes;
        default:
            return FaQuestion;
    }
}

function getValidationColor(status: ValidationStatus): string {
    switch (status) {
        case "passed":
            return "green.500";
        case "failed":
            return "red.500";
        default:
            return "orange.500";
    }
}

function getValidationText(status: ValidationStatus): string {
    switch (status) {
        case "passed":
            return "Validación exitosa";
        case "failed":
            return "La validación ha fallado";
        default:
            return "Pendiente de validación";
    }
}

function normalizeResult(result: ValidationResult | boolean): ValidationResult {
    if (typeof result === "boolean") {
        return { valid: result };
    }
    return result;
}

export default function FileChooserWithValidation({
    allowedExtensions,
    validateFile,
    onValidationSuccess,
    onNext,
    instructionText,
    loadButtonLabel = "Cargar",
    validateButtonLabel = "Validar",
    nextButtonLabel = "Siguiente",
    showNextButton = true,
    rejectedExtensionMessage,
}: FileChooserWithValidationProps) {
    const [file, setFile] = useState<File | null>(null);
    const [validationStatus, setValidationStatus] = useState<ValidationStatus>("pending");
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [isValidating, setIsValidating] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const toast = useToast();

    const normalizedExts = allowedExtensions.map(normalizeExt);
    const acceptString = normalizedExts.join(",");

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const chosen = files[0];
        const lower = chosen.name.toLowerCase();
        const isValid = normalizedExts.some((ext) => lower.endsWith(ext));

        if (!isValid) {
            const rejectedMatch = rejectedExtensionMessage?.extensions
                .map(normalizeExt)
                .some((ext) => lower.endsWith(ext));

            toast({
                title: rejectedMatch
                    ? "Formato no compatible"
                    : "Tipo de archivo no permitido",
                description: rejectedMatch
                    ? rejectedExtensionMessage!.message
                    : `Solo se permiten archivos: ${normalizedExts.join(", ")}`,
                status: "warning",
                duration: 8000,
                isClosable: true,
            });
            event.target.value = "";
            return;
        }

        setFile(chosen);
        setValidationStatus("pending");
        setValidationErrors([]);
    };

    const handleCargar = () => {
        fileInputRef.current?.click();
    };

    const handleValidar = async () => {
        if (!file) return;
        setIsValidating(true);
        setValidationErrors([]);
        try {
            const rawResult = await validateFile(file);
            const result = normalizeResult(rawResult);
            setValidationStatus(result.valid ? "passed" : "failed");
            if (!result.valid && result.errors && result.errors.length > 0) {
                setValidationErrors(result.errors);
            }
            if (result.valid && onValidationSuccess) {
                onValidationSuccess(file);
            }
        } catch (error) {
            console.error("[FileChooserWithValidation] Error inesperado al validar:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            setValidationStatus("failed");
            setValidationErrors([
                "Ocurrió un error inesperado al validar el archivo.",
                `Detalle: ${errorMessage}`,
            ]);
        } finally {
            setIsValidating(false);
        }
    };

    const handleSiguiente = () => {
        if (onNext && file) onNext(file);
    };

    return (
        <VStack spacing={5} align="stretch" w="full" p={4}>
            {/* Instruction text */}
            {instructionText && (
                <Box bg="blue.50" p={4} borderRadius="md" borderLeft="4px solid" borderLeftColor="blue.400">
                    <Text fontSize="md" color="gray.700">
                        {instructionText}
                    </Text>
                </Box>
            )}

            <Divider />

            {/* File upload section */}
            <Flex direction="row" gap="1.5em" p="1em" alignItems="center" justifyContent="center" w="full">
                <Icon
                    as={file ? FaFileCircleCheck : FaFileCircleQuestion}
                    boxSize="3em"
                    color={file ? "green.500" : "orange.500"}
                />
                <Text fontSize="md" flex={1}>
                    {file
                        ? `Archivo seleccionado: ${file.name}`
                        : "Ningún archivo cargado"}
                </Text>
                <Button colorScheme="teal" onClick={handleCargar}>
                    {loadButtonLabel}
                </Button>
            </Flex>

            <Divider />

            {/* Validation section */}
            <Flex direction="row" gap="1.5em" p="1em" alignItems="center" justifyContent="center" w="full">
                <Icon
                    as={getValidationIcon(validationStatus)}
                    boxSize="3em"
                    color={getValidationColor(validationStatus)}
                />
                <Text fontSize="md" flex={1}>
                    {getValidationText(validationStatus)}
                </Text>
                <Button
                    colorScheme="teal"
                    onClick={handleValidar}
                    isDisabled={!file}
                    isLoading={isValidating}
                    loadingText="Validando..."
                >
                    {validateButtonLabel}
                </Button>
            </Flex>

            {/* Validation errors */}
            {validationStatus === "failed" && validationErrors.length > 0 && (
                <Alert status="error" borderRadius="md" flexDirection="column" alignItems="flex-start">
                    <Flex alignItems="center" mb={2}>
                        <AlertIcon />
                        <AlertTitle>Errores de validación:</AlertTitle>
                    </Flex>
                    <AlertDescription w="full">
                        <VStack align="stretch" spacing={1}>
                            {validationErrors.slice(0, 10).map((error, index) => (
                                <Text key={index} fontSize="sm">
                                    {error}
                                </Text>
                            ))}
                            {validationErrors.length > 10 && (
                                <Text fontSize="sm" fontStyle="italic">
                                    ... y {validationErrors.length - 10} errores más
                                </Text>
                            )}
                        </VStack>
                    </AlertDescription>
                </Alert>
            )}

            <Divider />

            {/* Next button */}
            {showNextButton && (
                <Flex justifyContent="flex-end" p="1em">
                    <Button
                        colorScheme="blue"
                        size="lg"
                        onClick={handleSiguiente}
                        isDisabled={validationStatus !== "passed"}
                    >
                        {nextButtonLabel}
                    </Button>
                </Flex>
            )}

            {/* Hidden file input */}
            <input
                type="file"
                accept={acceptString}
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: "none" }}
            />
        </VStack>
    );
}
