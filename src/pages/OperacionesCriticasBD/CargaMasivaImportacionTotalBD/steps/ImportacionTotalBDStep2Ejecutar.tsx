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
import { useAuth } from "../../../../context/AuthContext";
import type { BackupTotalImportJobResponse } from "../types";

interface ImportacionTotalBDStep2EjecutarProps {
    setActiveStep: (step: number) => void;
    dumpFile: File | null;
    onReset: () => void;
    setNavigationLocked: (locked: boolean) => void;
    version?: 1 | 2;
}

const importJobStates: readonly BackupTotalImportJobResponse["estado"][] = [
    "PENDIENTE", "VALIDANDO", "PURGANDO", "RESTAURANDO", "MIGRANDO", "VERIFICANDO", "SANEANDO", "LISTO", "ERROR", "EXPIRADO",
];

function isImportJobResponse(value: unknown): value is BackupTotalImportJobResponse {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as Partial<BackupTotalImportJobResponse>;
    return (
        typeof candidate.jobId === "string" && candidate.jobId.length > 0 &&
        typeof candidate.estado === "string" && importJobStates.includes(candidate.estado) &&
        typeof candidate.filename === "string" &&
        typeof candidate.requestedAt === "string" &&
        (candidate.sourceSchemaVersion == null || typeof candidate.sourceSchemaVersion === "string") &&
        (candidate.targetSchemaVersion == null || typeof candidate.targetSchemaVersion === "string") &&
        (candidate.finalSchemaVersion == null || typeof candidate.finalSchemaVersion === "string") &&
        (candidate.migrationsApplied == null || (Number.isInteger(candidate.migrationsApplied) && candidate.migrationsApplied >= 0)) &&
        (candidate.requiresRecovery === undefined || typeof candidate.requiresRecovery === "boolean")
    );
}

const isTerminalJob = (job: BackupTotalImportJobResponse): boolean =>
    job.estado === "LISTO" || job.estado === "ERROR" || job.estado === "EXPIRADO";

const isSuccessfulJob = (job: BackupTotalImportJobResponse): boolean =>
    job.estado === "LISTO" && !job.requiresRecovery;

const keepsNavigationLocked = (job: BackupTotalImportJobResponse): boolean =>
    !isTerminalJob(job) || isSuccessfulJob(job) || job.requiresRecovery === true;

function progressMessageForStatus(job: BackupTotalImportJobResponse) {
    if (job.message && job.message.trim().length > 0) {
        return job.message;
    }

    if (job.requiresRecovery) return "La importación requiere recuperación manual antes de habilitar el entorno.";
    if (job.estado === "PENDIENTE") return "Registrando la solicitud de importación total...";
    if (job.estado === "VALIDANDO") return "Comprobando el respaldo y su compatibilidad con el destino...";
    if (job.estado === "PURGANDO") return "Preparando el destino para reemplazar sus datos...";
    if (job.estado === "RESTAURANDO") return "Restaurando el respaldo seleccionado...";
    if (job.estado === "MIGRANDO") return "Actualizando la estructura de los datos para esta versión de Exotic...";
    if (job.estado === "VERIFICANDO") return "Verificando que el destino restaurado sea compatible con esta versión de Exotic...";
    if (job.estado === "SANEANDO") return "Preparando las credenciales para el entorno no productivo...";
    if (job.estado === "LISTO") return "La importación, la actualización y la verificación finalizaron correctamente.";
    if (job.estado === "EXPIRADO") return "El servidor ya no conserva el resultado de la importación.";
    return "La importación total finalizó con error.";
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
    const [requestError, setRequestError] = useState<string | null>(null);
    const [submissionUncertain, setSubmissionUncertain] = useState(false);
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const { logout } = useAuth();
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
        if (isExecuting || submissionUncertain || result?.requiresRecovery || (result && isTerminalJob(result))) return;
        if (!currentJobId && !dumpFile) {
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
        setRequestError(null);
        let acceptedJobId = currentJobId;
        let latestJob = result;
        let creatingJob = false;
        let uncertain = false;

        const acceptJob = (value: unknown): BackupTotalImportJobResponse => {
            if (!isImportJobResponse(value) || (acceptedJobId && value.jobId !== acceptedJobId)) {
                throw new Error("No fue posible confirmar el resultado de esta importación. Verifique el destino antes de iniciar otra.");
            }
            acceptedJobId = value.jobId;
            latestJob = value;
            setCurrentJobId(value.jobId);
            setResult(value);
            return value;
        };

        try {
            let currentJob: BackupTotalImportJobResponse;
            if (acceptedJobId) {
                const response = await axios.get<unknown>(jobUrl(acceptedJobId), { withCredentials: true });
                currentJob = acceptJob(response.data);
            } else {
                const formData = new FormData();
                formData.append("file", dumpFile!);
                creatingJob = true;
                const response = await axios.post<unknown>(
                    version === 2 ? endpoints.importacion_backup_total_v2_create_job : endpoints.importacion_backup_total_create_job,
                    formData,
                    { withCredentials: true }
                );
                currentJob = acceptJob(response.data);
            }

            while (true) {
                if (isSuccessfulJob(currentJob)) {
                    toast({
                        title: "Importación total completada",
                        description: progressMessageForStatus(currentJob),
                        status: "success",
                        duration: 6000,
                        isClosable: true,
                    });
                    return;
                }

                if (isTerminalJob(currentJob) || currentJob.requiresRecovery) {
                    toast({
                        title: currentJob.requiresRecovery ? "El entorno requiere recuperación" : "Importación no completada",
                        description: progressMessageForStatus(currentJob),
                        status: "error",
                        duration: 6000,
                        isClosable: true,
                    });
                    return;
                }

                await wait(2000);

                const statusResponse = await axios.get<unknown>(
                    jobUrl(currentJob.jobId),
                    { withCredentials: true }
                );
                currentJob = acceptJob(statusResponse.data);
            }
        } catch (error: unknown) {
            if (axios.isAxiosError(error) && isImportJobResponse(error.response?.data)
                && (!acceptedJobId || acceptedJobId === error.response.data.jobId)) {
                const currentJob = acceptJob(error.response.data);
                toast({
                    title: isSuccessfulJob(currentJob) ? "Importación total completada" : "Estado de la importación",
                    description: progressMessageForStatus(currentJob),
                    status: isSuccessfulJob(currentJob) ? "success" : isTerminalJob(currentJob) || currentJob.requiresRecovery ? "error" : "info",
                    duration: 6000,
                    isClosable: true,
                });
            } else {
                uncertain = creatingJob && !acceptedJobId
                    && (!axios.isAxiosError(error) || !error.response || error.response.status >= 500);
                setSubmissionUncertain(uncertain);
                const responseData: unknown = axios.isAxiosError(error) ? error.response?.data : null;
                const serverMessage = typeof responseData === "object" && responseData !== null && "message" in responseData
                    && typeof responseData.message === "string" ? responseData.message : null;
                const message = acceptedJobId
                    ? "No fue posible consultar el resultado. Consulte nuevamente el estado de esta misma importación; no se iniciará otra."
                    : uncertain
                        ? "No fue posible confirmar si se registró la importación. Un responsable debe verificar el destino antes de iniciar otra."
                        : serverMessage || (error instanceof Error && !axios.isAxiosError(error) ? error.message : "No fue posible iniciar la importación total.");
                setRequestError(message);
                toast({
                    title: acceptedJobId || uncertain ? "Resultado pendiente de confirmar" : "Importación no iniciada",
                    description: message,
                    status: "error",
                    duration: 6000,
                    isClosable: true,
                });
            }
        } finally {
            setIsExecuting(false);
            setNavigationLocked(uncertain || (latestJob ? keepsNavigationLocked(latestJob) : acceptedJobId !== null));
        }
    };

    const handleReset = async () => {
        await cleanupTerminalJob();
        setResult(null);
        setRequestError(null);
        setSubmissionUncertain(false);
        setNavigationLocked(false);
        onReset();
    };

    const hasResult = result != null;
    const hasPendingJob = currentJobId !== null && (!result || !isTerminalJob(result));
    const requiresRecovery = result?.requiresRecovery === true;
    const completed = result !== null && isSuccessfulJob(result);
    const navigationBlocked = isExecuting || hasPendingJob || submissionUncertain || requiresRecovery || completed;

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
                            ? "Se comprobará el ZIP completo y se restaurarán la base de datos y los POE. Los archivos de otros módulos se conservarán. "
                            : "Se comprobará el respaldo y, si es compatible, se reemplazará la base de datos del destino. "}
                        La estructura restaurada se actualizará y verificará para esta versión de Exotic.
                        Mantenga esta pantalla abierta y espere el resultado final antes de utilizar el entorno.
                    </Alert.Description>
                </Alert.Root>
            )}

            <Box>
                <Text fontWeight="bold">Archivo seleccionado</Text>
                <Text color="app.textMuted">{dumpFile?.name ?? "Sin archivo seleccionado"}</Text>
            </Box>

            {(isExecuting || hasResult) && result && (
                <Alert.Root status={requiresRecovery ? "error" : completed ? "success" : isTerminalJob(result) ? "error" : "info"}>
                    <Alert.Indicator />
                    {isExecuting && !isTerminalJob(result) && !requiresRecovery ? <Spinner size="sm" mr={2} /> : null}
                    <Alert.Description>{progressMessageForStatus(result)}</Alert.Description>
                </Alert.Root>
            )}

            {requestError && (
                <Alert.Root status="warning">
                    <Alert.Indicator />
                    <Alert.Description>{requestError}</Alert.Description>
                </Alert.Root>
            )}

            {requiresRecovery && (
                <Alert.Root status="error">
                    <Alert.Indicator />
                    <Alert.Description>
                        El entorno permanece en mantenimiento y requiere recuperación manual por un responsable.
                        No inicie otra importación ni continúe trabajando en este entorno.
                    </Alert.Description>
                </Alert.Root>
            )}

            {completed && (
                <Alert.Root status="info">
                    <Alert.Indicator />
                    <Alert.Description>
                        La base de datos fue restaurada y verificada. Los usuarios y permisos pueden haber cambiado.
                        Revise este resultado y vuelva a iniciar sesión antes de continuar.
                    </Alert.Description>
                </Alert.Root>
            )}

            {hasResult && result && (
                <Box>
                    <Heading size="sm" mb={2}>
                        Resultado de la importación
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
                                <Table.Cell>Identificador de importación</Table.Cell>
                                <Table.Cell>{result.jobId}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell>Estado</Table.Cell>
                                <Table.Cell>{result.estado}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell>Archivo</Table.Cell>
                                <Table.Cell>{result.filename}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell>Formato del respaldo</Table.Cell>
                                <Table.Cell>{version === 2 ? "V2 · ZIP con base de datos y POE" : "V1 · Respaldo de base de datos"}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell>Versión de estructura del respaldo</Table.Cell>
                                <Table.Cell>{result.sourceSchemaVersion ?? "No determinada"}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell>Versión de estructura requerida</Table.Cell>
                                <Table.Cell>{result.targetSchemaVersion ?? "No determinada"}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell>Versión de estructura final</Table.Cell>
                                <Table.Cell>{result.finalSchemaVersion ?? "Pendiente de verificar"}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell>Migraciones aplicadas</Table.Cell>
                                <Table.Cell>{result.migrationsApplied ?? "Pendiente"}</Table.Cell>
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
                                <Table.Cell>Código del resultado</Table.Cell>
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
                    disabled={navigationBlocked}
                >
                    Atrás
                </Button>

                {completed ? (
                    <Button colorPalette="teal" onClick={logout}>
                        Volver a iniciar sesión
                    </Button>
                ) : !requiresRecovery && !submissionUncertain && (!hasResult || hasPendingJob) ? (
                    <Button
                        colorPalette="red"
                        onClick={handleExecute}
                        loading={isExecuting}
                        disabled={isExecuting}
                        loadingText={hasPendingJob ? "Consultando estado..." : "Ejecutando importación..."}
                    >
                        {hasPendingJob ? "Consultar estado" : version === 2 ? "Ejecutar importación V2" : "Ejecutar importacion total"}
                    </Button>
                ) : !requiresRecovery && !submissionUncertain ? (
                    <Button colorPalette="teal" onClick={handleReset} disabled={isExecuting}>
                        Reiniciar flujo
                    </Button>
                ) : null}
            </Flex>
        </VStack>
    );
}
