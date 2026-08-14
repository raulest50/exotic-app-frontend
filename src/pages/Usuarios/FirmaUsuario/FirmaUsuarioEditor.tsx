import {
    Box,
    Button,
    Field,
    HStack,
    SimpleGrid,
    Spinner,
    Tabs,
    Text,
    Textarea,
    VStack,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppToast } from "@/components/ui/use-app-toast";
import type { User } from "../GestionUsuarios/types";
import FirmaCanvas from "./FirmaCanvas";
import FirmaUsuarioConfirmDialog from "./FirmaUsuarioConfirmDialog";
import FirmaUsuarioHistorial from "./FirmaUsuarioHistorial";
import FirmaUsuarioPreview from "./FirmaUsuarioPreview";
import FirmaUsuarioUpload from "./FirmaUsuarioUpload";
import {
    crearFirmaVisualVersion,
    firmaApiErrorMessage,
    getFirmaVisualActual,
    getFirmaVisualImagenVigente,
    getFirmaVisualVersiones,
    retirarFirmaVisual,
} from "./firmaUsuarioApi";
import type {
    FirmaVisualSeleccionada,
    FirmaVisualUsuarioActual,
    FirmaVisualUsuarioVersion,
} from "./firmaUsuario.types";

interface FirmaUsuarioEditorProps {
    user: User;
    onBack: () => void;
    onSaved: () => void;
}

type CaptureMode = "draw" | "upload";

export default function FirmaUsuarioEditor({ user, onBack, onSaved }: FirmaUsuarioEditorProps) {
    const toast = useAppToast();
    const [actual, setActual] = useState<FirmaVisualUsuarioActual | null>(null);
    const [versiones, setVersiones] = useState<FirmaVisualUsuarioVersion[]>([]);
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [selected, setSelected] = useState<FirmaVisualSeleccionada | null>(null);
    const [captureRevision, setCaptureRevision] = useState(0);
    const [captureMode, setCaptureMode] = useState<CaptureMode>("draw");
    const [motivoCambio, setMotivoCambio] = useState("Configuración inicial");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [retiring, setRetiring] = useState(false);
    const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
    const [retireDialogOpen, setRetireDialogOpen] = useState(false);
    const [motivoRetiro, setMotivoRetiro] = useState("");

    const vigente = actual?.vigente ?? null;
    const isActiveUser = user.estado === 1;
    const canSave = Boolean(
        actual !== null
        && isActiveUser
        && selected
        && motivoCambio.trim()
        && !saving
        && !retiring
    );

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [actualResponse, versionesResponse] = await Promise.all([
                getFirmaVisualActual(user.id),
                getFirmaVisualVersiones(user.id),
            ]);
            setActual(actualResponse);
            setVersiones(versionesResponse);
            setMotivoCambio(actualResponse.configurada ? "" : "Configuración inicial");

            if (actualResponse.configurada) {
                try {
                    setCurrentImage(await getFirmaVisualImagenVigente(user.id));
                } catch (error) {
                    setCurrentImage(null);
                    toast({
                        title: "No se pudo cargar la imagen vigente",
                        description: firmaApiErrorMessage(error, "Los metadatos sí fueron recuperados."),
                        status: "warning",
                        duration: 5000,
                        isClosable: true,
                    });
                }
            } else {
                setCurrentImage(null);
            }
        } catch (error) {
            setActual(null);
            setVersiones([]);
            setCurrentImage(null);
            toast({
                title: "No se pudo cargar la firma visual",
                description: firmaApiErrorMessage(error, "Intente nuevamente."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [toast, user.id]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const showCaptureError = useCallback((message: string) => {
        toast({
            title: "Firma visual inválida",
            description: message,
            status: "error",
            duration: 5000,
            isClosable: true,
        });
    }, [toast]);

    const saveSelected = async () => {
        if (!selected || !motivoCambio.trim()) return;
        setSaving(true);
        try {
            await crearFirmaVisualVersion(user.id, selected.file, motivoCambio.trim());
            toast({
                title: vigente ? "Firma visual reemplazada" : "Firma visual configurada",
                status: "success",
                duration: 4000,
                isClosable: true,
            });
            setSelected(null);
            setCaptureRevision((revision) => revision + 1);
            setReplaceDialogOpen(false);
            await loadData();
            onSaved();
        } catch (error) {
            toast({
                title: "No se pudo guardar la firma visual",
                description: firmaApiErrorMessage(error, "Revise la imagen e intente nuevamente."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSaving(false);
        }
    };

    const handleSave = () => {
        if (!canSave) return;
        if (vigente) {
            setReplaceDialogOpen(true);
        } else {
            void saveSelected();
        }
    };

    const handleRetire = async () => {
        if (!motivoRetiro.trim()) return;
        setRetiring(true);
        try {
            await retirarFirmaVisual(user.id, motivoRetiro.trim());
            toast({
                title: "Firma visual retirada",
                description: "El historial se conservó y ya no existe una versión vigente.",
                status: "success",
                duration: 4000,
                isClosable: true,
            });
            setRetireDialogOpen(false);
            setMotivoRetiro("");
            setSelected(null);
            setCaptureRevision((revision) => revision + 1);
            await loadData();
            onSaved();
        } catch (error) {
            toast({
                title: "No se pudo retirar la firma visual",
                description: firmaApiErrorMessage(error, "Intente nuevamente."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setRetiring(false);
        }
    };

    const userSummary = useMemo(
        () => `${user.nombreCompleto ?? user.username} — ${user.username} — C.C. ${user.cedula}`,
        [user.cedula, user.nombreCompleto, user.username]
    );

    return (
        <VStack align="stretch" gap={5}>
            <HStack justify="space-between" align="flex-start">
                <Box>
                    <Text fontSize="2xl" fontWeight="semibold">Firma visual del usuario</Text>
                    <Text color="app.textMuted">{userSummary}</Text>
                </Box>
                <Button variant="outline" onClick={onBack} disabled={saving || retiring}>
                    Volver a usuarios
                </Button>
            </HStack>

            <Box borderWidth="1px" borderRadius="md" p={4} bg="orange.50" color="orange.900">
                <Text fontWeight="semibold">Representación documental</Text>
                <Text fontSize="sm">
                    Esta imagen representa visualmente la firma. No sustituye la identificación,
                    la sesión autenticada ni la auditoría de las acciones del usuario.
                </Text>
            </Box>

            {!isActiveUser ? (
                <Box borderWidth="1px" borderRadius="md" p={4} bg="red.50" color="red.900">
                    <Text fontSize="sm">
                        El usuario está inactivo. Puede consultar o retirar su firma histórica,
                        pero debe activarlo antes de crear o reemplazar una versión.
                    </Text>
                </Box>
            ) : null}

            {loading ? (
                <HStack py={8} justify="center"><Spinner /><Text>Cargando firma visual…</Text></HStack>
            ) : (
                <>
                    <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
                        <FirmaUsuarioPreview
                            title="Firma vigente"
                            dataUrl={currentImage}
                            version={vigente}
                            emptyText="No existe una firma visual vigente."
                        />
                        <FirmaUsuarioPreview
                            title="Nueva firma"
                            dataUrl={selected?.dataUrl ?? null}
                            seleccionada={selected}
                            emptyText="Dibuje o seleccione una imagen para previsualizarla."
                        />
                    </SimpleGrid>

                    <Box borderWidth="1px" borderRadius="md" p={4}>
                        <Tabs.Root
                            value={captureMode}
                            onValueChange={({ value }) => {
                                setCaptureMode(value as CaptureMode);
                                setSelected(null);
                                setCaptureRevision((revision) => revision + 1);
                            }}
                        >
                            <Tabs.List mb={4}>
                                <Tabs.Trigger value="draw">Dibujar</Tabs.Trigger>
                                <Tabs.Trigger value="upload">Subir PNG</Tabs.Trigger>
                            </Tabs.List>
                            <Tabs.Content value="draw">
                                <FirmaCanvas
                                    key={`draw-${captureRevision}`}
                                    disabled={!isActiveUser || saving || retiring}
                                    onChange={setSelected}
                                    onError={showCaptureError}
                                />
                            </Tabs.Content>
                            <Tabs.Content value="upload">
                                <FirmaUsuarioUpload
                                    key={`upload-${captureRevision}`}
                                    disabled={!isActiveUser || saving || retiring}
                                    onChange={setSelected}
                                    onError={showCaptureError}
                                />
                            </Tabs.Content>
                        </Tabs.Root>

                        <Field.Root required mt={5} disabled={!isActiveUser || saving || retiring}>
                            <Field.Label>Motivo {vigente ? "del cambio" : "de la configuración"}</Field.Label>
                            <Textarea
                                value={motivoCambio}
                                onChange={(event) => setMotivoCambio(event.target.value)}
                                minH="80px"
                            />
                        </Field.Root>

                        <HStack justify="space-between" mt={4} flexWrap="wrap">
                            <Button
                                colorPalette="red"
                                variant="outline"
                                onClick={() => setRetireDialogOpen(true)}
                                disabled={!vigente || retiring || saving}
                            >
                                Retirar firma vigente
                            </Button>
                            <Button
                                colorPalette="blue"
                                onClick={handleSave}
                                disabled={!canSave}
                                loading={saving}
                            >
                                {vigente ? "Reemplazar firma" : "Guardar firma"}
                            </Button>
                        </HStack>
                    </Box>

                    <Box>
                        <Text fontSize="lg" fontWeight="semibold" mb={3}>Historial</Text>
                        <FirmaUsuarioHistorial versiones={versiones} />
                    </Box>
                </>
            )}

            <FirmaUsuarioConfirmDialog
                open={replaceDialogOpen}
                title="Reemplazar firma visual"
                description="La versión actual será retirada y permanecerá en el historial. La nueva imagen quedará vigente."
                confirmLabel="Confirmar reemplazo"
                busy={saving}
                onCancel={() => setReplaceDialogOpen(false)}
                onConfirm={() => void saveSelected()}
            />
            <FirmaUsuarioConfirmDialog
                open={retireDialogOpen}
                title="Retirar firma visual"
                description="La firma dejará de estar vigente, pero su versión y auditoría se conservarán."
                confirmLabel="Retirar firma"
                colorPalette="red"
                busy={retiring}
                reason={motivoRetiro}
                reasonLabel="Motivo del retiro"
                requireReason
                onReasonChange={setMotivoRetiro}
                onCancel={() => {
                    setRetireDialogOpen(false);
                    setMotivoRetiro("");
                }}
                onConfirm={() => void handleRetire()}
            />
        </VStack>
    );
}
