import {
    Alert,
    AlertDescription,
    AlertIcon,
    Box,
    Button,
    Flex,
    Heading,
    Spinner,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    useToast,
    VStack,
} from "@chakra-ui/react";
import axios from "axios";
import { useMemo, useState } from "react";
import EndPointsURL from "../../../../api/EndPointsURL";
import type { BackupTotalImportJobResponse } from "../types";

interface ImportacionTotalBDStep2EjecutarProps {
    setActiveStep: (step: number) => void;
    dumpFile: File | null;
    onReset: () => void;
    setNavigationLocked: (locked: boolean) => void;
}

function isImportJobResponse(value: unknown): value is BackupTotalImportJobResponse {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as Partial<BackupTotalImportJobResponse>;
    return (
        typeof candidate.jobId === "string" &&
        typeof candidate.estado === "string" &&
        typeof candidate.filename === "string" &&
        typeof candidate.requestedAt === "string"
    );
}

function progressMessageForStatus(job: BackupTotalImportJobResponse) {
    if (job.message && job.message.trim().length > 0) {
        return job.message;
    }

    if (job.estado === "PENDIENTE") return "Registrando la solicitud de importacion total...";
    if (job.estado === "VALIDANDO") return "Validando archivo y herramientas de restauracion...";
    if (job.estado === "PURGANDO") return "Vaciando completamente el esquema actual...";
    if (job.estado === "RESTAURANDO") return "Restaurando backup total PostgreSQL...";
    if (job.estado === "LISTO") return "La importacion total finalizo correctamente.";
    if (job.estado === "EXPIRADO") return "El resultado del job ya expiro.";
    return "La importacion total finalizo con error.";
}

export default function ImportacionTotalBDStep2Ejecutar({
    setActiveStep,
    dumpFile,
    onReset,
    setNavigationLocked,
}: ImportacionTotalBDStep2EjecutarProps) {
    const [isExecuting, setIsExecuting] = useState(false);
    const [currentJobId, setCurrentJobId] = useState<string | null>(null);
    const [result, setResult] = useState<BackupTotalImportJobResponse | null>(null);
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const toast = useToast();

    const cleanupTerminalJob = async (jobIdOverride?: string) => {
        const jobId = jobIdOverride ?? currentJobId;
        if (!jobId) return;
        try {
            await axios.delete(endpoints.importacionBackupTotalJob(jobId), {
                withCredentials: true,
            });
        } catch {
            // Cleanup best-effort.
        } finally {
            setCurrentJobId(null);
        }
    };

    const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

    const handleExecute = async () => {
        if (!dumpFile) {
            toast({
                title: "No hay archivo para importar",
                description: "Seleccione un archivo .dump en el paso anterior antes de ejecutar la restauracion.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        setIsExecuting(true);
        setNavigationLocked(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append("file", dumpFile);

            const createResponse = await axios.post<BackupTotalImportJobResponse>(
                endpoints.importacion_backup_total_create_job,
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                    withCredentials: true,
                }
            );

            let currentJob = createResponse.data;
            setCurrentJobId(currentJob.jobId);
            setResult(currentJob);

            while (true) {
                if (currentJob.estado === "LISTO") {
                    setResult(currentJob);
                    toast({
                        title: "Importacion total completada",
                        description: currentJob.message ?? "La base de datos fue restaurada correctamente.",
                        status: "success",
                        duration: 6000,
                        isClosable: true,
                    });
                    return;
                }

                if (currentJob.estado === "ERROR" || currentJob.estado === "EXPIRADO") {
                    setResult(currentJob);
                    throw new Error(
                        currentJob.message ?? "No fue posible completar la importacion total de la base de datos."
                    );
                }

                await wait(2000);

                const statusResponse = await axios.get<BackupTotalImportJobResponse>(
                    endpoints.importacionBackupTotalJob(currentJob.jobId),
                    { withCredentials: true }
                );
                currentJob = statusResponse.data;
                setResult(currentJob);
            }
        } catch (error: unknown) {
            if (axios.isAxiosError(error) && isImportJobResponse(error.response?.data)) {
                setResult(error.response.data);
                toast({
                    title: "Operacion bloqueada",
                    description: error.response.data.message ?? "La importacion total no pudo ejecutarse.",
                    status: "error",
                    duration: 6000,
                    isClosable: true,
                });
            } else {
                const message = error instanceof Error ? error.message : "No fue posible completar la importacion total.";
                toast({
                    title: "Error en importacion total",
                    description: message,
                    status: "error",
                    duration: 6000,
                    isClosable: true,
                });
            }
        } finally {
            setIsExecuting(false);
            setNavigationLocked(false);
        }
    };

    const handleReset = async () => {
        await cleanupTerminalJob();
        setResult(null);
        setNavigationLocked(false);
        onReset();
    };

    const hasResult = result != null;

    return (
        <VStack align="stretch" spacing={6}>
            <Heading size="md" color="red.700">
                Ejecutar Importacion Total
            </Heading>

            {!hasResult && (
                <Alert status="warning">
                    <AlertIcon />
                    <AlertDescription>
                        Se eliminara completamente la informacion actual y luego se restaurara el backup seleccionado.
                        Una vez iniciada la restauracion, no debe cerrarse la sesion ni asumir que la base sigue
                        disponible hasta recibir el resultado final.
                    </AlertDescription>
                </Alert>
            )}

            <Box>
                <Text fontWeight="bold">Archivo listo para restaurar</Text>
                <Text color="gray.600">{dumpFile?.name ?? "Sin archivo seleccionado"}</Text>
            </Box>

            {(isExecuting || hasResult) && result && (
                <Alert status={result.estado === "LISTO" ? "success" : result.estado === "ERROR" || result.estado === "EXPIRADO" ? "error" : "info"}>
                    <AlertIcon />
                    {(isExecuting && result.estado !== "LISTO" && result.estado !== "ERROR" && result.estado !== "EXPIRADO") ? <Spinner size="sm" mr={2} /> : null}
                    <AlertDescription>{progressMessageForStatus(result)}</AlertDescription>
                </Alert>
            )}

            {hasResult && result && (
                <Box>
                    <Heading size="sm" mb={2}>
                        Resumen de ejecucion
                    </Heading>
                    <Table size="sm" variant="simple">
                        <Thead>
                            <Tr>
                                <Th>Campo</Th>
                                <Th>Valor</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            <Tr>
                                <Td>Estado</Td>
                                <Td>{result.estado}</Td>
                            </Tr>
                            <Tr>
                                <Td>Archivo</Td>
                                <Td>{result.filename}</Td>
                            </Tr>
                            <Tr>
                                <Td>Solicitado</Td>
                                <Td>{result.requestedAt}</Td>
                            </Tr>
                            <Tr>
                                <Td>Iniciado</Td>
                                <Td>{result.startedAt ?? "-"}</Td>
                            </Tr>
                            <Tr>
                                <Td>Finalizado</Td>
                                <Td>{result.finishedAt ?? "-"}</Td>
                            </Tr>
                            <Tr>
                                <Td>Error code</Td>
                                <Td>{result.errorCode ?? "-"}</Td>
                            </Tr>
                        </Tbody>
                    </Table>
                </Box>
            )}

            <Flex gap={3} w="full" justify="space-between">
                <Button
                    variant="outline"
                    onClick={() => setActiveStep(1)}
                    isDisabled={isExecuting}
                >
                    Atras
                </Button>

                {!hasResult ? (
                    <Button
                        colorScheme="red"
                        onClick={handleExecute}
                        isLoading={isExecuting}
                        loadingText="Ejecutando importacion..."
                    >
                        Ejecutar importacion total
                    </Button>
                ) : (
                    <Button colorScheme="teal" onClick={handleReset}>
                        Reiniciar flujo
                    </Button>
                )}
            </Flex>
        </VStack>
    );
}
