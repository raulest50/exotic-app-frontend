import {
    Alert,
    AlertIcon,
    Button,
    FormControl,
    FormLabel,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { descargarArchivoExportacion } from "./exportacionBlobService";

export interface ExportConfig {
    tituloModal: string;
    alertDescripcion: string;
    endpointUrl: string;
    defaultFilename: string;
    blobMimeType?: string;
    successDescription: string;
}

interface ConfirmarExportacionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    config: ExportConfig | null;
}

export default function ConfirmarExportacionModal({
    isOpen,
    onClose,
    onConfirm,
    config,
}: ConfirmarExportacionModalProps) {
    const [randomToken, setRandomToken] = useState("");
    const [inputToken, setInputToken] = useState("");
    const [isExporting, setIsExporting] = useState(false);

    const toast = useToast();

    useEffect(() => {
        if (isOpen) {
            const token = Math.floor(1000 + Math.random() * 9000).toString();
            setRandomToken(token);
            setInputToken("");
        }
    }, [isOpen]);

    const handleExportar = async () => {
        if (inputToken !== randomToken) {
            toast({
                title: "Token incorrecto",
                description: "El token ingresado no coincide con el token de confirmación.",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        if (!config) return;

        setIsExporting(true);
        try {
            await descargarArchivoExportacion(
                config.endpointUrl,
                config.defaultFilename,
                config.blobMimeType
            );

            toast({
                title: "Exportación completada",
                description: config.successDescription,
                status: "success",
                duration: 5000,
                isClosable: true,
            });

            onConfirm?.();
            onClose();
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);
            toast({
                title: "Error al exportar",
                description: message,
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsExporting(false);
        }
    };

    const handleClose = () => {
        if (!isExporting) {
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{config?.tituloModal}</ModalHeader>
                <ModalCloseButton isDisabled={isExporting} />
                <ModalBody>
                    <Alert status="warning" mb={4}>
                        <AlertIcon />
                        {config?.alertDescripcion}
                    </Alert>

                    <Text fontWeight="bold" mb={2}>
                        Token de confirmación: <strong>{randomToken}</strong>
                    </Text>

                    <FormControl>
                        <FormLabel>Ingrese el token de 4 dígitos:</FormLabel>
                        <Input
                            placeholder="Ingrese el token de 4 dígitos"
                            value={inputToken}
                            onChange={(e) => setInputToken(e.target.value)}
                        />
                    </FormControl>
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" onClick={handleClose} isDisabled={isExporting}>
                        Cancelar
                    </Button>
                    <Button
                        colorScheme="teal"
                        onClick={handleExportar}
                        isDisabled={inputToken !== randomToken || isExporting}
                        isLoading={isExporting}
                        loadingText="Exportando..."
                    >
                        Exportar
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
