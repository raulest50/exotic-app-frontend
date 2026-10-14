import {
    Alert,
    Badge,
    Box,
    Button,
    Card,
    CloseButton,
    Dialog,
    Field,
    Flex,
    Heading,
    HStack,
    Input,
    Portal,
    Spinner,
    Table,
    Text,
    Textarea,
    VStack,
    chakra,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    LuDownload,
    LuEye,
    LuEyeOff,
    LuFilePlus2,
    LuHistory,
    LuRefreshCw,
} from "react-icons/lu";
import axios from "axios";
import EndPointsURL from "../../../../api/EndPointsURL";
import { useAppToast } from "@/components/ui/use-app-toast";

// API y validaciones privadas de la ficha técnica.
interface FichaTecnicaMetadata {
    disponible: boolean;
    versionVigente: FichaTecnicaVersion | null;
    totalVersiones: number;
}

interface FichaTecnicaVersion {
    id: number;
    version: number;
    estado: "VIGENTE" | "RETIRADA";
    nombreArchivoOriginal: string;
    tamanoBytes: number | null;
    vigenteDesde: string;
    vigenteHasta: string | null;
    creadoEn: string;
    creadoPor: string | null;
    motivoCambio: string;
    disponible: boolean;
}

const endPoints = new EndPointsURL();

function resolveEndpoint(template: string, productoId: string): string {
    return template.replace("{productoId}", encodeURIComponent(productoId));
}

async function consultarFichaTecnicaMetadata(
    productoId: string,
    signal?: AbortSignal,
): Promise<FichaTecnicaMetadata> {
    const response = await axios.get<FichaTecnicaMetadata>(
        resolveEndpoint(endPoints.producto_ficha_tecnica_metadata, productoId),
        { signal },
    );
    return response.data;
}

async function obtenerFichaTecnicaPdf(
    productoId: string,
    signal?: AbortSignal,
): Promise<Blob> {
    return obtenerPdf(
        resolveEndpoint(endPoints.producto_ficha_tecnica, productoId),
        signal,
    );
}

async function consultarFichaTecnicaVersiones(
    productoId: string,
    signal?: AbortSignal,
): Promise<FichaTecnicaVersion[]> {
    const response = await axios.get<FichaTecnicaVersion[]>(
        resolveEndpoint(endPoints.producto_ficha_tecnica_versiones, productoId),
        { signal },
    );
    return response.data;
}

async function crearFichaTecnicaVersion(
    productoId: string,
    archivo: File,
    motivoCambio: string,
    signal?: AbortSignal,
): Promise<FichaTecnicaVersion> {
    const formData = new FormData();
    formData.append("archivo", archivo);
    if (motivoCambio.trim()) {
        formData.append("motivoCambio", motivoCambio.trim());
    }
    const response = await axios.post<FichaTecnicaVersion>(
        resolveEndpoint(endPoints.producto_ficha_tecnica_versiones, productoId),
        formData,
        { signal },
    );
    return response.data;
}

async function obtenerFichaTecnicaVersionPdf(
    productoId: string,
    versionId: number,
    signal?: AbortSignal,
): Promise<Blob> {
    const url = resolveEndpoint(endPoints.producto_ficha_tecnica_version_archivo, productoId)
        .replace("{versionId}", encodeURIComponent(String(versionId)));
    return obtenerPdf(url, signal);
}

async function obtenerPdf(url: string, signal?: AbortSignal): Promise<Blob> {
    const response = await axios.get<Blob>(url, { responseType: "blob", signal });
    const rawContentType = response.headers["content-type"];
    const contentType = (typeof rawContentType === "string" ? rawContentType : response.data.type)
        .split(";", 1)[0]
        .trim()
        .toLowerCase();
    if (contentType !== "application/pdf") {
        throw new Error("El servidor no devolvio un documento PDF.");
    }
    return response.data;
}

function validarFichaTecnicaPdf(file: File): void {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
        throw new Error("La ficha tecnica debe tener extension PDF.");
    }
    if (file.size === 0) {
        throw new Error("La ficha tecnica no puede estar vacia.");
    }
    if (file.size > 10 * 1024 * 1024) {
        throw new Error("La ficha tecnica no puede superar 10 MB.");
    }
}

function fichaTecnicaErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
            return data.error;
        }
        return error.message;
    }
    return error instanceof Error ? error.message : "Ocurrio un error inesperado.";
}

function fichaTecnicaDuplicada(error: unknown): boolean {
    return axios.isAxiosError(error) && error.response?.status === 409;
}

function fichaTecnicaNoDisponible(error: unknown): boolean {
    return axios.isAxiosError(error) && error.response?.status === 404;
}

function solicitudFichaTecnicaCancelada(error: unknown): boolean {
    return axios.isCancel(error) || (axios.isAxiosError(error) && error.code === "ERR_CANCELED");
}

type Availability = "checking" | "available" | "missing" | "unavailable" | "error";

type Props = {
    productoId: string;
    canManage: boolean;
};

type HistoryPreview = {
    versionId: number;
    url: string;
};

const PdfFrame = chakra("iframe");

function currentDownloadFilename(productoId: string): string {
    return `ficha-tecnica-${safeFilePart(productoId)}.pdf`;
}

function versionDownloadFilename(productoId: string, version: number): string {
    return `ficha-tecnica-${safeFilePart(productoId)}-v${version}.pdf`;
}

function safeFilePart(value: string): string {
    return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function formatBytes(value: number | null): string {
    if (value == null) return "Tamaño no registrado";
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value: string | null): string {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("es-CO");
}

function triggerDownload(url: string, filename: string): void {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
}

export default function FichaTecnicaMaterialCard({ productoId, canManage }: Props) {
    const [availability, setAvailability] = useState<Availability>("checking");
    const [metadata, setMetadata] = useState<FichaTecnicaMetadata | null>(null);
    const [retryToken, setRetryToken] = useState(0);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const [uploadOpen, setUploadOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [motivoCambio, setMotivoCambio] = useState("");
    const [fileInputKey, setFileInputKey] = useState(0);
    const [uploading, setUploading] = useState(false);

    const [historyOpen, setHistoryOpen] = useState(false);
    const [versions, setVersions] = useState<FichaTecnicaVersion[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState(false);
    const [historyPreview, setHistoryPreview] = useState<HistoryPreview | null>(null);
    const [historyPreviewLoadingId, setHistoryPreviewLoadingId] = useState<number | null>(null);
    const [historyDownloadingId, setHistoryDownloadingId] = useState<number | null>(null);

    const previewUrlRef = useRef<string | null>(null);
    const historyPreviewRef = useRef<HistoryPreview | null>(null);
    const currentActionControllerRef = useRef<AbortController | null>(null);
    const historyLoadControllerRef = useRef<AbortController | null>(null);
    const historyActionControllerRef = useRef<AbortController | null>(null);
    const uploadControllerRef = useRef<AbortController | null>(null);
    const toast = useAppToast();

    const vigente = metadata?.versionVigente ?? null;
    const requiresReason = vigente !== null;

    const releasePreview = useCallback(() => {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }
        setPreviewUrl(null);
    }, []);

    const releaseHistoryPreview = useCallback(() => {
        if (historyPreviewRef.current) {
            URL.revokeObjectURL(historyPreviewRef.current.url);
            historyPreviewRef.current = null;
        }
        setHistoryPreview(null);
    }, []);

    const closeHistory = useCallback(() => {
        historyLoadControllerRef.current?.abort();
        historyActionControllerRef.current?.abort();
        historyLoadControllerRef.current = null;
        historyActionControllerRef.current = null;
        setHistoryLoading(false);
        setHistoryPreviewLoadingId(null);
        setHistoryDownloadingId(null);
        releaseHistoryPreview();
        setHistoryOpen(false);
    }, [releaseHistoryPreview]);

    useEffect(() => {
        const controller = new AbortController();
        currentActionControllerRef.current?.abort();
        currentActionControllerRef.current = null;
        historyLoadControllerRef.current?.abort();
        historyActionControllerRef.current?.abort();
        uploadControllerRef.current?.abort();
        releasePreview();
        releaseHistoryPreview();
        setHistoryOpen(false);
        setUploadOpen(false);
        setLoadingPreview(false);
        setDownloading(false);
        setMetadata(null);
        setAvailability("checking");

        void consultarFichaTecnicaMetadata(productoId, controller.signal)
            .then((response) => {
                setMetadata(response);
                if (!response.versionVigente) {
                    setAvailability("missing");
                } else {
                    setAvailability(response.disponible ? "available" : "unavailable");
                }
            })
            .catch((error: unknown) => {
                if (!solicitudFichaTecnicaCancelada(error)) {
                    setAvailability("error");
                }
            });

        return () => controller.abort();
    }, [productoId, retryToken, releaseHistoryPreview, releasePreview]);

    useEffect(() => () => {
        currentActionControllerRef.current?.abort();
        historyLoadControllerRef.current?.abort();
        historyActionControllerRef.current?.abort();
        uploadControllerRef.current?.abort();
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        if (historyPreviewRef.current) URL.revokeObjectURL(historyPreviewRef.current.url);
    }, []);

    const markCurrentUnavailable = useCallback(() => {
        releasePreview();
        setAvailability("unavailable");
        setMetadata((current) => current?.versionVigente
            ? {
                ...current,
                disponible: false,
                versionVigente: { ...current.versionVigente, disponible: false },
            }
            : current);
        toast({
            title: "Ficha técnica no disponible",
            description: "El documento registrado ya no se encuentra disponible.",
            status: "warning",
            duration: 3500,
            isClosable: true,
        });
    }, [releasePreview, toast]);

    const handleTogglePreview = async () => {
        if (previewUrlRef.current) {
            releasePreview();
            return;
        }

        const controller = new AbortController();
        currentActionControllerRef.current?.abort();
        currentActionControllerRef.current = controller;
        setLoadingPreview(true);
        try {
            const pdf = await obtenerFichaTecnicaPdf(productoId, controller.signal);
            const nextUrl = URL.createObjectURL(pdf);
            previewUrlRef.current = nextUrl;
            setPreviewUrl(nextUrl);
        } catch (error: unknown) {
            if (fichaTecnicaNoDisponible(error)) {
                markCurrentUnavailable();
            } else if (!solicitudFichaTecnicaCancelada(error)) {
                toast({
                    title: "No se pudo abrir la ficha técnica",
                    description: fichaTecnicaErrorMessage(error),
                    status: "error",
                    duration: 4000,
                    isClosable: true,
                });
            }
        } finally {
            if (currentActionControllerRef.current === controller) {
                currentActionControllerRef.current = null;
                setLoadingPreview(false);
            }
        }
    };

    const handleDownload = async () => {
        const filename = currentDownloadFilename(productoId);
        if (previewUrlRef.current) {
            triggerDownload(previewUrlRef.current, filename);
            return;
        }

        const controller = new AbortController();
        currentActionControllerRef.current?.abort();
        currentActionControllerRef.current = controller;
        setDownloading(true);
        try {
            const pdf = await obtenerFichaTecnicaPdf(productoId, controller.signal);
            const temporaryUrl = URL.createObjectURL(pdf);
            triggerDownload(temporaryUrl, filename);
            window.setTimeout(() => URL.revokeObjectURL(temporaryUrl), 1000);
        } catch (error: unknown) {
            if (fichaTecnicaNoDisponible(error)) {
                markCurrentUnavailable();
            } else if (!solicitudFichaTecnicaCancelada(error)) {
                toast({
                    title: "No se pudo descargar la ficha técnica",
                    description: fichaTecnicaErrorMessage(error),
                    status: "error",
                    duration: 4000,
                    isClosable: true,
                });
            }
        } finally {
            if (currentActionControllerRef.current === controller) {
                currentActionControllerRef.current = null;
                setDownloading(false);
            }
        }
    };

    const openUpload = () => {
        setSelectedFile(null);
        setMotivoCambio("");
        setFileInputKey((current) => current + 1);
        setUploadOpen(true);
    };

    const closeUpload = () => {
        uploadControllerRef.current?.abort();
        uploadControllerRef.current = null;
        setUploading(false);
        setUploadOpen(false);
        setSelectedFile(null);
        setMotivoCambio("");
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        setSelectedFile(null);
        if (!file) return;
        try {
            validarFichaTecnicaPdf(file);
            setSelectedFile(file);
        } catch (error: unknown) {
            event.target.value = "";
            toast({
                title: "Ficha técnica no válida",
                description: fichaTecnicaErrorMessage(error),
                status: "warning",
                duration: 4000,
                isClosable: true,
            });
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || (requiresReason && !motivoCambio.trim())) return;
        const controller = new AbortController();
        uploadControllerRef.current = controller;
        setUploading(true);
        try {
            await crearFichaTecnicaVersion(
                productoId,
                selectedFile,
                motivoCambio,
                controller.signal,
            );
            releasePreview();
            closeHistory();
            setUploadOpen(false);
            setSelectedFile(null);
            setMotivoCambio("");
            setRetryToken((current) => current + 1);
            toast({
                title: requiresReason ? "Nueva versión creada" : "Ficha técnica adjuntada",
                status: "success",
                duration: 4000,
                isClosable: true,
            });
        } catch (error: unknown) {
            if (!solicitudFichaTecnicaCancelada(error)) {
                toast({
                    title: fichaTecnicaDuplicada(error)
                        ? "El documento ya está vigente"
                        : "No se pudo guardar la ficha técnica",
                    description: fichaTecnicaErrorMessage(error),
                    status: fichaTecnicaDuplicada(error) ? "warning" : "error",
                    duration: 5000,
                    isClosable: true,
                });
            }
        } finally {
            if (uploadControllerRef.current === controller) {
                uploadControllerRef.current = null;
                setUploading(false);
            }
        }
    };

    const loadVersions = useCallback(async () => {
        const controller = new AbortController();
        historyLoadControllerRef.current?.abort();
        historyLoadControllerRef.current = controller;
        setHistoryLoading(true);
        setHistoryError(false);
        try {
            setVersions(await consultarFichaTecnicaVersiones(productoId, controller.signal));
        } catch (error: unknown) {
            if (!solicitudFichaTecnicaCancelada(error)) {
                setVersions([]);
                setHistoryError(true);
            }
        } finally {
            if (historyLoadControllerRef.current === controller) {
                historyLoadControllerRef.current = null;
                setHistoryLoading(false);
            }
        }
    }, [productoId]);

    useEffect(() => {
        if (historyOpen) void loadVersions();
    }, [historyOpen, loadVersions]);

    const handleHistoryPreview = async (version: FichaTecnicaVersion) => {
        if (historyPreviewRef.current?.versionId === version.id) {
            releaseHistoryPreview();
            return;
        }
        historyActionControllerRef.current?.abort();
        releaseHistoryPreview();
        const controller = new AbortController();
        historyActionControllerRef.current = controller;
        setHistoryDownloadingId(null);
        setHistoryPreviewLoadingId(version.id);
        try {
            const pdf = await obtenerFichaTecnicaVersionPdf(productoId, version.id, controller.signal);
            const nextPreview = { versionId: version.id, url: URL.createObjectURL(pdf) };
            historyPreviewRef.current = nextPreview;
            setHistoryPreview(nextPreview);
        } catch (error: unknown) {
            if (fichaTecnicaNoDisponible(error)) {
                setVersions((current) => current.map((item) =>
                    item.id === version.id ? { ...item, disponible: false } : item));
            }
            if (!solicitudFichaTecnicaCancelada(error)) {
                toast({
                    title: "No se pudo abrir esta versión",
                    description: fichaTecnicaErrorMessage(error),
                    status: "error",
                    duration: 4000,
                    isClosable: true,
                });
            }
        } finally {
            if (historyActionControllerRef.current === controller) {
                historyActionControllerRef.current = null;
                setHistoryPreviewLoadingId(null);
            }
        }
    };

    const handleHistoryDownload = async (version: FichaTecnicaVersion) => {
        const filename = versionDownloadFilename(productoId, version.version);
        if (historyPreviewRef.current?.versionId === version.id) {
            triggerDownload(historyPreviewRef.current.url, filename);
            return;
        }
        const controller = new AbortController();
        historyActionControllerRef.current?.abort();
        historyActionControllerRef.current = controller;
        setHistoryPreviewLoadingId(null);
        setHistoryDownloadingId(version.id);
        try {
            const pdf = await obtenerFichaTecnicaVersionPdf(productoId, version.id, controller.signal);
            const temporaryUrl = URL.createObjectURL(pdf);
            triggerDownload(temporaryUrl, filename);
            window.setTimeout(() => URL.revokeObjectURL(temporaryUrl), 1000);
        } catch (error: unknown) {
            if (fichaTecnicaNoDisponible(error)) {
                setVersions((current) => current.map((item) =>
                    item.id === version.id ? { ...item, disponible: false } : item));
            }
            if (!solicitudFichaTecnicaCancelada(error)) {
                toast({
                    title: "No se pudo descargar esta versión",
                    description: fichaTecnicaErrorMessage(error),
                    status: "error",
                    duration: 4000,
                    isClosable: true,
                });
            }
        } finally {
            if (historyActionControllerRef.current === controller) {
                historyActionControllerRef.current = null;
                setHistoryDownloadingId(null);
            }
        }
    };

    const selectedHistoryVersion = useMemo(
        () => versions.find((version) => version.id === historyPreview?.versionId) ?? null,
        [historyPreview?.versionId, versions],
    );
    const currentControlsDisabled = availability !== "available" || loadingPreview || downloading;
    const metadataBusy = availability === "checking";

    return (
        <>
            <Card.Root mb={5} variant="outline" boxShadow="md" aria-busy={metadataBusy}>
                <Card.Header bg="app.stepperBlue">
                    <Flex
                        align={{ base: "flex-start", sm: "center" }}
                        justify="space-between"
                        direction={{ base: "column", sm: "row" }}
                        gap={2}
                    >
                        <Heading size="md">Ficha técnica</Heading>
                        <Box aria-live="polite">
                            {availability === "checking" && (
                                <HStack gap={2}><Spinner size="sm" /><Text fontSize="sm">Comprobando...</Text></HStack>
                            )}
                            {availability === "available" && <Badge colorPalette="green">Disponible</Badge>}
                            {availability === "missing" && <Badge colorPalette="gray">No registrada</Badge>}
                            {availability === "unavailable" && <Badge colorPalette="orange">Archivo no disponible</Badge>}
                        </Box>
                    </Flex>
                </Card.Header>
                <Card.Body>
                    <Flex direction="column" gap={4}>
                        {vigente && (
                            <Box>
                                <Text fontWeight="semibold">
                                    Versión vigente: v{vigente.version} · {vigente.nombreArchivoOriginal}
                                </Text>
                                <Text fontSize="sm" color="fg.muted">
                                    {formatBytes(vigente.tamanoBytes)} · Cargada por {vigente.creadoPor || "-"}
                                    {" · "}{formatDateTime(vigente.creadoEn)}
                                </Text>
                            </Box>
                        )}
                        {availability === "missing" && (
                            <Text color="fg.muted">Este material no tiene una ficha técnica registrada.</Text>
                        )}
                        {availability === "unavailable" && (
                            <Text color="orange.700">
                                La versión vigente está registrada, pero su archivo no puede leerse.
                            </Text>
                        )}
                        {availability === "error" && (
                            <Alert.Root status="error" alignItems="flex-start" borderRadius="md">
                                <Alert.Indicator />
                                <Box flex="1">
                                    <Alert.Title>No se pudo consultar la ficha técnica</Alert.Title>
                                    <Alert.Description>Verifique la conexión e intente nuevamente.</Alert.Description>
                                </Box>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    colorPalette="red"
                                    onClick={() => setRetryToken((current) => current + 1)}
                                >
                                    <LuRefreshCw /> Reintentar
                                </Button>
                            </Alert.Root>
                        )}

                        <Flex direction={{ base: "column", sm: "row" }} gap={3} align={{ sm: "center" }} wrap="wrap">
                            <Button
                                colorPalette="blue"
                                variant="outline"
                                disabled={currentControlsDisabled}
                                loading={loadingPreview}
                                loadingText="Abriendo"
                                onClick={() => void handleTogglePreview()}
                            >
                                {previewUrl ? <LuEyeOff /> : <LuEye />}
                                {previewUrl ? "Ocultar ficha técnica" : "Ver ficha técnica"}
                            </Button>
                            <Button
                                colorPalette="teal"
                                disabled={currentControlsDisabled}
                                loading={downloading}
                                loadingText="Descargando"
                                onClick={() => void handleDownload()}
                            >
                                <LuDownload /> Descargar PDF
                            </Button>
                            <Button
                                variant="outline"
                                disabled={metadataBusy || availability === "error" || !metadata?.totalVersiones}
                                onClick={() => setHistoryOpen(true)}
                            >
                                <LuHistory /> Historial{metadata?.totalVersiones ? ` (${metadata.totalVersiones})` : ""}
                            </Button>
                            {canManage && (
                                <Button
                                    colorPalette="purple"
                                    variant="outline"
                                    disabled={metadataBusy || availability === "error"}
                                    onClick={openUpload}
                                >
                                    <LuFilePlus2 /> {vigente ? "Cargar nueva versión" : "Adjuntar ficha técnica"}
                                </Button>
                            )}
                        </Flex>

                        {previewUrl && (
                            <Box borderWidth="1px" borderRadius="md" overflow="hidden" bg="bg.subtle">
                                <PdfFrame
                                    src={previewUrl}
                                    title={`Ficha técnica vigente del material ${productoId}`}
                                    width="100%"
                                    height={{ base: "65vh", md: "720px" }}
                                    border="0"
                                    display="block"
                                />
                            </Box>
                        )}
                    </Flex>
                </Card.Body>
            </Card.Root>

            <Dialog.Root open={uploadOpen} placement="center" onOpenChange={({ open }) => {
                if (!open) closeUpload();
            }}>
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content maxW="lg">
                            <Dialog.Header>
                                <Dialog.Title>{vigente ? "Cargar nueva versión" : "Adjuntar ficha técnica"}</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.CloseTrigger asChild><CloseButton aria-label="Cerrar" size="sm" /></Dialog.CloseTrigger>
                            <Dialog.Body>
                                <VStack align="stretch" gap={4}>
                                    <Field.Root required>
                                        <Field.Label htmlFor="material-ficha-tecnica-archivo">
                                            Archivo PDF
                                        </Field.Label>
                                        <Input
                                            key={fileInputKey}
                                            id="material-ficha-tecnica-archivo"
                                            type="file"
                                            accept=".pdf,application/pdf"
                                            p={1}
                                            onChange={handleFileChange}
                                        />
                                        <Field.HelperText>Archivo PDF de hasta 10 MB.</Field.HelperText>
                                    </Field.Root>
                                    {selectedFile && (
                                        <Box borderWidth="1px" borderRadius="md" p={3}>
                                            <Text fontWeight="medium">{selectedFile.name}</Text>
                                            <Text fontSize="sm" color="fg.muted">{formatBytes(selectedFile.size)}</Text>
                                        </Box>
                                    )}
                                    <Field.Root required={requiresReason}>
                                        <Field.Label htmlFor="material-ficha-tecnica-motivo">
                                            {requiresReason ? "Motivo del cambio" : "Observación inicial (opcional)"}
                                        </Field.Label>
                                        <Textarea
                                            id="material-ficha-tecnica-motivo"
                                            value={motivoCambio}
                                            onChange={(event) => setMotivoCambio(event.target.value)}
                                            placeholder={requiresReason
                                                ? "Describa brevemente por qué se reemplaza la ficha"
                                                : "Carga inicial"}
                                            maxLength={2000}
                                        />
                                    </Field.Root>
                                </VStack>
                            </Dialog.Body>
                            <Dialog.Footer>
                                <Button variant="ghost" onClick={closeUpload} disabled={uploading}>Cancelar</Button>
                                <Button
                                    colorPalette="purple"
                                    onClick={() => void handleUpload()}
                                    disabled={!selectedFile || (requiresReason && !motivoCambio.trim())}
                                    loading={uploading}
                                >
                                    {requiresReason ? "Crear nueva versión" : "Adjuntar ficha"}
                                </Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>

            <Dialog.Root open={historyOpen} placement="center" size="cover" onOpenChange={({ open }) => {
                if (!open) closeHistory();
            }}>
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content maxW="6xl" maxH="92vh">
                            <Dialog.Header><Dialog.Title>Historial de fichas técnicas</Dialog.Title></Dialog.Header>
                            <Dialog.CloseTrigger asChild><CloseButton aria-label="Cerrar" size="sm" /></Dialog.CloseTrigger>
                            <Dialog.Body overflowY="auto">
                                {historyLoading && <HStack><Spinner size="sm" /><Text>Cargando historial...</Text></HStack>}
                                {historyError && (
                                    <Alert.Root status="error" mb={4}>
                                        <Alert.Indicator />
                                        <Box flex="1">
                                            <Alert.Title>No se pudo consultar el historial</Alert.Title>
                                        </Box>
                                        <Button size="sm" variant="outline" onClick={() => void loadVersions()}>
                                            <LuRefreshCw /> Reintentar
                                        </Button>
                                    </Alert.Root>
                                )}
                                {!historyLoading && !historyError && (
                                    <Box overflowX="auto">
                                        <Table.Root size="sm">
                                            <Table.Header>
                                                <Table.Row>
                                                    <Table.ColumnHeader>Versión</Table.ColumnHeader>
                                                    <Table.ColumnHeader>Estado</Table.ColumnHeader>
                                                    <Table.ColumnHeader>Archivo</Table.ColumnHeader>
                                                    <Table.ColumnHeader>Fecha</Table.ColumnHeader>
                                                    <Table.ColumnHeader>Usuario</Table.ColumnHeader>
                                                    <Table.ColumnHeader>Motivo</Table.ColumnHeader>
                                                    <Table.ColumnHeader>Acciones</Table.ColumnHeader>
                                                </Table.Row>
                                            </Table.Header>
                                            <Table.Body>
                                                {versions.map((version) => (
                                                    <Table.Row key={version.id}>
                                                        <Table.Cell>v{version.version}</Table.Cell>
                                                        <Table.Cell>
                                                            <Badge colorPalette={version.estado === "VIGENTE" ? "green" : "gray"}>
                                                                {version.estado}
                                                            </Badge>
                                                        </Table.Cell>
                                                        <Table.Cell>
                                                            <Text>{version.nombreArchivoOriginal}</Text>
                                                            <Text fontSize="xs" color={version.disponible ? "fg.muted" : "orange.600"}>
                                                                {version.disponible ? formatBytes(version.tamanoBytes) : "Archivo no disponible"}
                                                            </Text>
                                                        </Table.Cell>
                                                        <Table.Cell>{formatDateTime(version.creadoEn)}</Table.Cell>
                                                        <Table.Cell>{version.creadoPor || "-"}</Table.Cell>
                                                        <Table.Cell minW="220px">{version.motivoCambio}</Table.Cell>
                                                        <Table.Cell>
                                                            <HStack>
                                                                <Button
                                                                    size="xs"
                                                                    variant="outline"
                                                                    disabled={!version.disponible}
                                                                    loading={historyPreviewLoadingId === version.id}
                                                                    onClick={() => void handleHistoryPreview(version)}
                                                                >
                                                                    {historyPreview?.versionId === version.id ? <LuEyeOff /> : <LuEye />}
                                                                    {historyPreview?.versionId === version.id ? "Ocultar" : "Ver"}
                                                                </Button>
                                                                <Button
                                                                    size="xs"
                                                                    variant="outline"
                                                                    disabled={!version.disponible}
                                                                    loading={historyDownloadingId === version.id}
                                                                    onClick={() => void handleHistoryDownload(version)}
                                                                >
                                                                    <LuDownload /> Descargar
                                                                </Button>
                                                            </HStack>
                                                        </Table.Cell>
                                                    </Table.Row>
                                                ))}
                                            </Table.Body>
                                        </Table.Root>
                                    </Box>
                                )}
                                {historyPreview && selectedHistoryVersion && (
                                    <Box mt={5} borderWidth="1px" borderRadius="md" overflow="hidden">
                                        <Box p={3} bg="bg.subtle">
                                            <Text fontWeight="semibold">Vista de la versión v{selectedHistoryVersion.version}</Text>
                                        </Box>
                                        <PdfFrame
                                            src={historyPreview.url}
                                            title={`Ficha técnica ${productoId}, versión ${selectedHistoryVersion.version}`}
                                            width="100%"
                                            height={{ base: "55vh", md: "650px" }}
                                            border="0"
                                            display="block"
                                        />
                                    </Box>
                                )}
                            </Dialog.Body>
                            <Dialog.Footer><Button onClick={closeHistory}>Cerrar</Button></Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>
        </>
    );
}
