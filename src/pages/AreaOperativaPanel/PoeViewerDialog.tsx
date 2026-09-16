import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
    Alert,
    Box,
    Button,
    CloseButton,
    Dialog,
    Flex,
    HStack,
    Portal,
    Spinner,
    Text,
} from "@chakra-ui/react";
import { FiChevronDown, FiChevronUp, FiMinus, FiPlus, FiRefreshCw } from "react-icons/fi";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { PoeViewerTarget } from "./areaOperativaPanel.types";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
).toString();

interface Props {
    target: PoeViewerTarget | null;
    onClose: () => void;
}

interface ProgressivePdfPageProps {
    pageNumber: number;
    width: number;
    scale: number;
    onVisible: (pageNumber: number) => void;
}

const MIN_ZOOM = 0.75;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.25;

function ProgressivePdfPage({
    pageNumber,
    width,
    scale,
    onVisible,
}: ProgressivePdfPageProps) {
    const pageRef = useRef<HTMLDivElement | null>(null);
    const [shouldRender, setShouldRender] = useState(pageNumber <= 2);

    useEffect(() => {
        const element = pageRef.current;
        if (!element || shouldRender) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                setShouldRender(true);
                observer.disconnect();
            }
        }, { rootMargin: "900px 0px" });
        observer.observe(element);
        return () => observer.disconnect();
    }, [shouldRender]);

    useEffect(() => {
        const element = pageRef.current;
        if (!element) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                onVisible(pageNumber);
            }
        }, { threshold: 0.1 });
        observer.observe(element);
        return () => observer.disconnect();
    }, [onVisible, pageNumber]);

    return (
        <Box
            ref={pageRef}
            data-poe-page={pageNumber}
            minH={`${Math.round(width * 1.414 * scale)}px`}
            w="fit-content"
            mx="auto"
            bg="white"
            boxShadow="sm"
            aria-label={`Página ${pageNumber}`}
        >
            {shouldRender ? (
                <Page
                    pageNumber={pageNumber}
                    width={width}
                    scale={scale}
                    renderTextLayer
                    renderAnnotationLayer
                    loading={(
                        <Flex minH="240px" align="center" justify="center">
                            <Spinner size="sm" />
                        </Flex>
                    )}
                    error={(
                        <Flex minH="240px" align="center" justify="center" px={6}>
                            <Text color="red.600">No fue posible representar esta página.</Text>
                        </Flex>
                    )}
                />
            ) : null}
        </Box>
    );
}

function errorMessage(error: unknown): string {
    if (!axios.isAxiosError(error)) {
        return "No fue posible cargar el POE.";
    }
    if (error.code === "ERR_CANCELED") return "";
    if (error.response?.status === 403) {
        return "No tienes permiso para consultar el POE de esta etapa.";
    }
    if (error.response?.status === 404) {
        return "La versión congelada del POE ya no está disponible.";
    }
    return "No fue posible generar la vista PDF del POE.";
}

export default function PoeViewerDialog({ target, onClose }: Props) {
    const viewerRef = useRef<HTMLDivElement | null>(null);
    const [viewerElement, setViewerElement] = useState<HTMLDivElement | null>(null);
    const [viewerWidth, setViewerWidth] = useState(800);
    const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [zoom, setZoom] = useState(1);

    const viewerCallbackRef = useCallback((element: HTMLDivElement | null) => {
        viewerRef.current = element;
        setViewerElement(element);
    }, []);

    useEffect(() => {
        if (!viewerElement) return;
        const updateWidth = () => setViewerWidth(viewerElement.clientWidth);
        updateWidth();
        const observer = new ResizeObserver(updateWidth);
        observer.observe(viewerElement);
        return () => observer.disconnect();
    }, [viewerElement]);

    useEffect(() => {
        if (!target) {
            setPdfData(null);
            setError(null);
            setNumPages(0);
            setCurrentPage(1);
            setZoom(1);
            return;
        }

        const controller = new AbortController();
        setLoading(true);
        setError(null);
        setPdfData(null);
        setNumPages(0);
        setCurrentPage(1);

        void axios.get<ArrayBuffer>(target.url, {
            responseType: "arraybuffer",
            withCredentials: true,
            signal: controller.signal,
        }).then((response) => {
            const contentType = String(response.headers["content-type"] ?? "").toLowerCase();
            const bytes = new Uint8Array(response.data);
            const signature = String.fromCharCode(...bytes.slice(0, 5));
            if (!contentType.includes("application/pdf") || signature !== "%PDF-") {
                throw new Error("La respuesta del servidor no es un PDF válido.");
            }
            setPdfData(bytes);
        }).catch((requestError: unknown) => {
            const message = errorMessage(requestError);
            if (message) setError(message);
        }).finally(() => {
            if (!controller.signal.aborted) setLoading(false);
        });

        return () => controller.abort();
    }, [reloadKey, target]);

    const file = useMemo(() => pdfData ? { data: pdfData } : null, [pdfData]);
    const pageWidth = Math.max(260, Math.min(920, viewerWidth - 32));

    const onPageVisible = useCallback((pageNumber: number) => {
        setCurrentPage(pageNumber);
    }, []);

    const goToPage = (pageNumber: number) => {
        const nextPage = Math.max(1, Math.min(numPages, pageNumber));
        setCurrentPage(nextPage);
        viewerRef.current
            ?.querySelector<HTMLElement>(`[data-poe-page="${nextPage}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const changeZoom = (delta: number) => {
        setZoom((current) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current + delta)));
    };

    return (
        <Dialog.Root
            open={target != null}
            placement="center"
            scrollBehavior="inside"
            onOpenChange={(event) => {
                if (!event.open) onClose();
            }}
        >
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner p={{ base: 0, md: 4 }}>
                    <Dialog.Content
                        w={{ base: "100vw", md: "min(94vw, 1200px)" }}
                        h={{ base: "100dvh", md: "min(94dvh, 920px)" }}
                        maxW="none"
                        maxH="none"
                        borderRadius={{ base: 0, md: "lg" }}
                        overflow="hidden"
                    >
                        <Dialog.Header borderBottomWidth="1px" pr={12}>
                            <Box minW={0}>
                                <Dialog.Title lineClamp={1}>
                                    {target?.procesoNombre || "Procedimiento operativo estándar"}
                                </Dialog.Title>
                                <Dialog.Description>
                                    {target?.areaNombre || "Área operativa"} · POE v{target?.version ?? "-"}
                                </Dialog.Description>
                            </Box>
                        </Dialog.Header>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton aria-label="Cerrar visor de POE" size="sm" />
                        </Dialog.CloseTrigger>

                        <Flex
                            px={{ base: 2, md: 4 }}
                            py={2}
                            gap={2}
                            align="center"
                            justify="space-between"
                            flexWrap="wrap"
                            borderBottomWidth="1px"
                            bg="app.surface"
                        >
                            <HStack gap={2}>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    aria-label="Ir a la página anterior"
                                    disabled={currentPage <= 1 || numPages === 0}
                                    onClick={() => goToPage(currentPage - 1)}
                                >
                                    <FiChevronUp />
                                    <Text display={{ base: "none", sm: "inline" }}>Anterior</Text>
                                </Button>
                                <Text minW="96px" textAlign="center" fontSize="sm" fontWeight="semibold">
                                    Página {numPages ? currentPage : 0} de {numPages}
                                </Text>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    aria-label="Ir a la página siguiente"
                                    disabled={currentPage >= numPages || numPages === 0}
                                    onClick={() => goToPage(currentPage + 1)}
                                >
                                    <FiChevronDown />
                                    <Text display={{ base: "none", sm: "inline" }}>Siguiente</Text>
                                </Button>
                            </HStack>
                            <HStack gap={2}>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    aria-label="Reducir zoom"
                                    disabled={zoom <= MIN_ZOOM}
                                    onClick={() => changeZoom(-ZOOM_STEP)}
                                >
                                    <FiMinus />
                                </Button>
                                <Text minW="48px" textAlign="center" fontSize="sm">
                                    {Math.round(zoom * 100)}%
                                </Text>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    aria-label="Aumentar zoom"
                                    disabled={zoom >= MAX_ZOOM}
                                    onClick={() => changeZoom(ZOOM_STEP)}
                                >
                                    <FiPlus />
                                </Button>
                            </HStack>
                        </Flex>

                        <Dialog.Body p={0} display="flex" minH={0}>
                            <Box
                                ref={viewerCallbackRef}
                                flex="1"
                                overflow="auto"
                                bg="app.surfaceSubtle"
                                py={4}
                                px={{ base: 2, md: 4 }}
                            >
                                {loading ? (
                                    <Flex minH="full" align="center" justify="center" gap={3}>
                                        <Spinner />
                                        <Text>Cargando POE…</Text>
                                    </Flex>
                                ) : null}

                                {!loading && error ? (
                                    <Flex minH="full" align="center" justify="center">
                                        <Alert.Root status="error" maxW="lg">
                                            <Alert.Indicator />
                                            <Alert.Content>
                                                <Alert.Title>POE no disponible</Alert.Title>
                                                <Alert.Description>{error}</Alert.Description>
                                                <Button
                                                    mt={3}
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setReloadKey((current) => current + 1)}
                                                >
                                                    <FiRefreshCw /> Reintentar
                                                </Button>
                                            </Alert.Content>
                                        </Alert.Root>
                                    </Flex>
                                ) : null}

                                {!loading && !error && file ? (
                                    <Document
                                        file={file}
                                        onLoadSuccess={({ numPages: loadedPages }) => {
                                            setNumPages(loadedPages);
                                            setCurrentPage(1);
                                        }}
                                        onLoadError={() => setError("No fue posible interpretar el PDF del POE.")}
                                        loading={(
                                            <Flex minH="full" align="center" justify="center">
                                                <Spinner />
                                            </Flex>
                                        )}
                                    >
                                        <Flex direction="column" gap={4} align="center">
                                            {Array.from({ length: numPages }, (_, index) => (
                                                <ProgressivePdfPage
                                                    key={index + 1}
                                                    pageNumber={index + 1}
                                                    width={pageWidth}
                                                    scale={zoom}
                                                    onVisible={onPageVisible}
                                                />
                                            ))}
                                        </Flex>
                                    </Document>
                                ) : null}
                            </Box>
                        </Dialog.Body>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
