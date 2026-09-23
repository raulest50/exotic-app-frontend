import {
    Alert,
    Box,
    Button,
    Flex,
    Heading,
    Spinner,
    Table,
    Text,
    VStack,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from "axios";
import { useMemo, useState } from "react";
import EndPointsURL from "../../../../api/EndPointsURL";
import type { BackupTotalImportJobResponse } from "../types";

interface ImportacionTotalBDStep2EjecutarProps {
    setActiveStep: (step: number) => void;
    dumpFile: File | null;
    onReset: () => void;
    setNavigationLocked: (locked: boolean) => void;
    version?: 1 | 2;
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
    version = 1,
}: ImportacionTotalBDStep2EjecutarProps) {
    const [isExecuting, setIsExecuting] = useState(false);
    const [currentJobId, setCurrentJobId] = useState<string | null>(null);
    const [result, setResult] = useState<BackupTotalImportJobResponse | null>(null);
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const toast = useAppToast();
    const jobUrl = (jobId: string) => version === 2
        ? endpoints.importacionBackupTotalV2Job(jobId)
        : endpoints.importacionBackupTotalJob(jobId);

    const cleanupTerminalJob = async (jobIdOverride?: string) => {
        const jobId = jobIdOverride ?? currentJobId;
        if (!jobId) return;
        try {
            await axios.delete(jobUrl(jobId), {
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
                description: `Seleccione un archivo ${version === 2 ? ".zip V2" : ".dump"} en el paso anterior.`,
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        setIsExecuting(true);
        setNavigationLocked(true);
        let pending = currentJobId !== null && result !== null && !["LISTO", "ERROR", "EXPIRADO"].includes(result.estado);

        try {
            const formData = new FormData();
            formData.append("file", dumpFile);

            const createResponse = pending && currentJobId
                ? await axios.get<BackupTotalImportJobResponse>(jobUrl(currentJobId), { withCredentials: true })
                : await axios.post<BackupTotalImportJobResponse>(
                    version === 2 ? endpoints.importacion_backup_total_v2_create_job : endpoints.importacion_backup_total_create_job,
                    formData,
                    { withCredentials: true }
                );

            let currentJob = createResponse.data;
            setCurrentJobId(currentJob.jobId);
            setResult(currentJob);
            pending = true;

            while (true) {
                if (currentJob.estado === "LISTO") {
                    pending = false;
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
                    pending = false;
                    setResult(currentJob);
                    throw new Error(
                        currentJob.message ?? "No fue posible completar la importacion total de la base de datos."
                    );
                }

                await wait(2000);

                const statusResponse = await axios.get<BackupTotalImportJobResponse>(
                    jobUrl(currentJob.jobId),
                    { withCredentials: true }
                );
                currentJob = statusResponse.data;
                setResult(currentJob);
            }
        } catch (error: unknown) {
            if (axios.isAxiosError(error) && isImportJobResponse(error.response?.data)) {
                pending = !["LISTO", "ERROR", "EXPIRADO"].includes(error.response.data.estado);
                setResult(error.response.data);
                toast({
                    title: "Operacion bloqueada",
                    description: error.response.data.message ?? "La importacion total no pudo ejecutarse.",
                    status: "error",
                    duration: 6000,
                    isClosable: true,
                });
            } else {
                if (pending && axios.isAxiosError(error) && error.response?.status === 404) {
                    pending = false;
                    setResult(previous => previous ? {
                        ...previous,
                        estado: "EXPIRADO",
                        message: "El servidor ya no conserva el resultado. Verifique el estado del destino antes de iniciar otra importación.",
                    } : previous);
                }
                const responseData: unknown = axios.isAxiosError(error) ? error.response?.data : null;
                const serverMessage = typeof responseData === "object" && responseData !== null && "message" in responseData
                    && typeof responseData.message === "string" ? responseData.message : null;
                const message = serverMessage || (error instanceof Error ? error.message : "No fue posible completar la importacion total.");
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
            setNavigationLocked(pending);
        }
    };

    const handleReset = async () => {
        await cleanupTerminalJob();
        setResult(null);
        setNavigationLocked(false);
        onReset();
    };

    const hasResult = result != null;
    const hasPendingJob = result != null && !["LISTO", "ERROR", "EXPIRADO"].includes(result.estado);

    return (
        <VStack align="stretch" gap={6}>
            <Heading size="md" color="red.700">
                {version === 2 ? "Ejecutar importación total V2 · BD + POE" : "Ejecutar Importacion Total"}
            </Heading>

            {!hasResult && (
                <Alert.Root status="warning">
                    <Alert.Indicator />
                    <Alert.Description>
                        {version === 2
                            ? "Se validará el ZIP completo y se restaurarán la base de datos y los POE. Los archivos de otros módulos se conservarán. "
                            : "Se eliminara completamente la informacion actual y luego se restaurara el backup seleccionado. "}
                        Una vez iniciada la restauracion, no debe cerrarse la sesion ni asumir que la base sigue
                        disponible hasta recibir el resultado final.
                    </Alert.Description>
                </Alert.Root>
            )}

            <Box>
                <Text fontWeight="bold">Archivo listo para restaurar</Text>
                <Text color="app.textMuted">{dumpFile?.name ?? "Sin archivo seleccionado"}</Text>
            </Box>

            {(isExecuting || hasResult) && result && (
                <Alert.Root status={result.estado === "LISTO" ? "success" : result.estado === "ERROR" || result.estado === "EXPIRADO" ? "error" : "info"}>
                    <Alert.Indicator />
                    {(isExecuting && result.estado !== "LISTO" && result.estado !== "ERROR" && result.estado !== "EXPIRADO") ? <Spinner size="sm" mr={2} /> : null}
                    <Alert.Description>{progressMessageForStatus(result)}</Alert.Description>
                </Alert.Root>
            )}

            {hasResult && result && (
                <Box>
                    <Heading size="sm" mb={2}>
                        Resumen de ejecucion
                    </Heading>
                    <Table.Root size="sm" variant="line">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>Campo</Table.ColumnHeader>
                                <Table.ColumnHeader>Valor</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            <Table.Row>
                                <Table.Cell>Estado</Table.Cell>
                                <Table.Cell>{result.estado}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell>Archivo</Table.Cell>
                                <Table.Cell>{result.filename}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell>Solicitado</Table.Cell>
                                <Table.Cell>{result.requestedAt}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell>Iniciado</Table.Cell>
                                <Table.Cell>{result.startedAt ?? "-"}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell>Finalizado</Table.Cell>
                                <Table.Cell>{result.finishedAt ?? "-"}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell>Error code</Table.Cell>
                                <Table.Cell>{result.errorCode ?? "-"}</Table.Cell>
                            </Table.Row>
                        </Table.Body>
                    </Table.Root>
                </Box>
            )}

            <Flex gap={3} w="full" justify="space-between">
                <Button
                    variant="outline"
                    onClick={() => setActiveStep(1)}
                    disabled={isExecuting || hasPendingJob}
                >
                    Atras
                </Button>

                {!hasResult || hasPendingJob ? (
                    <Button
                        colorPalette="red"
                        onClick={handleExecute}
                        loading={isExecuting}
                        disabled={isExecuting}
                        loadingText="Ejecutando importacion..."
                    >
                        {hasPendingJob ? "Consultar estado" : version === 2 ? "Ejecutar importación V2" : "Ejecutar importacion total"}
                    </Button>
                ) : (
                    <Button colorPalette="teal" onClick={handleReset} disabled={isExecuting}>
                        Reiniciar flujo
                    </Button>
                )}
            </Flex>
        </VStack>
    );
}
