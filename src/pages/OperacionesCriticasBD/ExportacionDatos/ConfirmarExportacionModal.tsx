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
    Spinner,
    Text,
    useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import axios from "axios";
import { descargarArchivoExportacion } from "./exportacionBlobService";

export interface AsyncExportJobConfig {
    createJobUrl: string;
    getJobUrl: (jobId: string) => string;
    downloadUrl: (jobId: string) => string;
    deleteJobUrl?: (jobId: string) => string;
    pollingIntervalMs?: number;
}

export interface ExportConfig {
    tituloModal: string;
    alertDescripcion: string;
    endpointUrl: string;
    defaultFilename: string;
    blobMimeType?: string;
    successDescription: string;
    asyncJob?: AsyncExportJobConfig;
}

interface BackupTotalJobResponse {
    jobId: string;
    estado: "PENDIENTE" | "EN_PROCESO" | "LISTO" | "ERROR" | "EXPIRADO";
    filename: string;
    requestedAt: string;
    readyAt?: string | null;
    expiresAt?: string | null;
    errorCode?: string | null;
    message?: string | null;
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
    const [currentJobId, setCurrentJobId] = useState<string | null>(null);
    const [progressMessage, setProgressMessage] = useState<string | null>(null);

    const toast = useToast();

    useEffect(() => {
        if (isOpen) {
            const token = Math.floor(1000 + Math.random() * 9000).toString();
            setRandomToken(token);
            setInputToken("");
            setCurrentJobId(null);
            setProgressMessage(null);
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
            if (config.asyncJob) {
                await ejecutarExportacionAsincrona(config);
            } else {
                await descargarArchivoExportacion(
                    config.endpointUrl,
                    config.defaultFilename,
                    config.blobMimeType
                );
            }

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
            void cleanupJob();
            onClose();
        }
    };

    const cleanupJob = async (jobIdOverride?: string) => {
        const jobId = jobIdOverride ?? currentJobId;
        if (!config?.asyncJob?.deleteJobUrl || !jobId) return;
        try {
            await axios.delete(config.asyncJob.deleteJobUrl(jobId), {
                withCredentials: true,
            });
        } catch {
            // El cleanup es best-effort.
        } finally {
            setCurrentJobId(null);
        }
    };

    const ejecutarExportacionAsincrona = async (activeConfig: ExportConfig) => {
        if (!activeConfig.asyncJob) return;

        setProgressMessage("Solicitando la generación del backup total...");
        const createResponse = await axios.post<BackupTotalJobResponse>(
            activeConfig.asyncJob.createJobUrl,
            {},
            { withCredentials: true }
        );

        let currentJob = createResponse.data;
        setCurrentJobId(currentJob.jobId);

        while (true) {
            if (currentJob.estado === "LISTO") {
                setProgressMessage("Descargando el archivo de backup...");
                await descargarArchivoExportacion(
                    activeConfig.asyncJob.downloadUrl(currentJob.jobId),
                    currentJob.filename || activeConfig.defaultFilename,
                    activeConfig.blobMimeType
                );
                await cleanupJob(currentJob.jobId);
                return;
            }

            if (currentJob.estado === "ERROR" || currentJob.estado === "EXPIRADO") {
                throw new Error(
                    currentJob.message ||
                    "No fue posible generar el backup total de la base de datos."
                );
            }

            setProgressMessage("Generando backup total PostgreSQL. Esto puede tardar unos minutos...");
            await wait(activeConfig.asyncJob.pollingIntervalMs ?? 2000);

            const statusResponse = await axios.get<BackupTotalJobResponse>(
                activeConfig.asyncJob.getJobUrl(currentJob.jobId),
                { withCredentials: true }
            );
            currentJob = statusResponse.data;
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
                            isDisabled={isExporting}
                        />
                    </FormControl>

                    {isExporting && progressMessage ? (
                        <Alert status="info" mt={4}>
                            <AlertIcon />
                            <Spinner size="sm" mr={2} />
                            {progressMessage}
                        </Alert>
                    ) : null}
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
                        loadingText={progressMessage ?? "Exportando..."}
                    >
                        Exportar
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function wait(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}
