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
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import EndPointsURL from "../../../api/EndPointsURL";

interface ConfirmarExportacionTerminadosModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
}

export default function ConfirmarExportacionTerminadosModal({
    isOpen,
    onClose,
    onConfirm,
}: ConfirmarExportacionTerminadosModalProps) {
    const [randomToken, setRandomToken] = useState("");
    const [inputToken, setInputToken] = useState("");
    const [isExporting, setIsExporting] = useState(false);

    const toast = useToast();
    const endpoints = useMemo(() => new EndPointsURL(), []);

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

        setIsExporting(true);
        try {
            const response = await axios.get(endpoints.exportacion_terminados_excel, {
                withCredentials: true,
                responseType: "blob",
            });

            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;

            const contentDisposition = response.headers["content-disposition"];
            let filename = "exportacion_terminados.xlsx";
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?(.+)"?/);
                if (match && match[1]) filename = match[1].trim();
            }
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
                title: "Exportación completada",
                description: "El archivo Excel de productos terminados se ha descargado correctamente.",
                status: "success",
                duration: 5000,
                isClosable: true,
            });

            onConfirm?.();
            onClose();
        } catch (error) {
            const message = axios.isAxiosError(error)
                ? error.response?.data?.message || error.message
                : (error as Error).message;
            toast({
                title: "Error al exportar",
                description: String(message),
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
                <ModalHeader>Confirmar exportación de productos terminados</ModalHeader>
                <ModalCloseButton isDisabled={isExporting} />
                <ModalBody>
                    <Alert status="warning" mb={4}>
                        <AlertIcon />
                        Se exportará la información de los productos terminados en formato "sin insumos"
                        (sin lista de insumos, proceso de producción ni case pack). El archivo Excel tendrá
                        una estructura compatible con la carga masiva de terminados sin insumos.
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
