import { useCallback, useEffect, useState } from "react";
import { useColorModeValue } from "../../components/ui/color-mode";
import axios from "axios";
import {
    Accordion,
    Alert,
    Badge,
    Box,
    Button,
    Container,
    Flex,
    Heading,
    HStack,
    Icon,
    Spinner,
    Text,
    Textarea,
    VStack,
    useDisclosure,
    Separator,
    Dialog,
    Portal,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import {
    FaBalanceScale,
    FaEye,
    FaHandshake,
    FaHistory,
    FaLeaf,
    FaLightbulb,
    FaPencilAlt,
    FaRecycle,
    FaUsers,
} from "react-icons/fa";
import {
    MisionVisionVersion,
    MisionVisionVersionSummary,
    getMisionVisionVersion,
    getMisionVisionVersiones,
    getMisionVisionVigente,
    restoreMisionVisionVersion,
} from "../../api/MisionVisionApi";
import { useAuth } from "../../context/AuthContext";
import MisionVisionEditorModal from "./components/MisionVisionEditorModal";
import SafeRichText from "./components/SafeRichText";

interface MisionVisionProps {
    canEdit: boolean;
}

const VALUE_ICONS = [FaHandshake, FaBalanceScale, FaLeaf, FaUsers];
const VALUE_COLORS = ["blue.500", "teal.500", "green.500", "purple.500"];

export function MisionVision({ canEdit }: MisionVisionProps) {
    const toast = useAppToast();
    const { refreshAccesos } = useAuth();
    const editorDisclosure = useDisclosure();
    const detailDisclosure = useDisclosure();
    const restoreDisclosure = useDisclosure();
    const [vigente, setVigente] = useState<MisionVisionVersion | null>(null);
    const [versiones, setVersiones] = useState<MisionVisionVersionSummary[]>([]);
    const [detailVersion, setDetailVersion] = useState<MisionVisionVersion | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [restoreTarget, setRestoreTarget] = useState<MisionVisionVersionSummary | null>(null);
    const [restoreReason, setRestoreReason] = useState("");
    const [restoring, setRestoring] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const bgGradient = useColorModeValue(
        "linear(to-r, blue.50, white, blue.50)",
        "linear(to-r, gray.800, gray.900, gray.800)"
    );
    const cardBg = useColorModeValue("white", "gray.700");
    const borderColor = useColorModeValue("blue.100", "blue.700");
    const missionHeadingColor = useColorModeValue("blue.600", "blue.200");
    const visionHeadingColor = useColorModeValue("teal.600", "teal.200");
    const valuesHeadingColor = useColorModeValue("purple.600", "purple.200");

    const handleForbidden = useCallback(async () => {
        toast({
            title: "Tu permiso cambió",
            description: "Ya no tienes autorización para realizar esta operación.",
            status: "warning",
            duration: 5000,
            isClosable: true,
        });
        await refreshAccesos();
    }, [refreshAccesos, toast]);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [current, history] = await Promise.all([
                getMisionVisionVigente(),
                getMisionVisionVersiones(),
            ]);
            setVigente(current);
            setVersiones(history);
        } catch (cause) {
            if (axios.isAxiosError(cause) && cause.response?.status === 403) {
                await handleForbidden();
            }
            setError(apiErrorMessage(cause, "No fue posible cargar la misión, visión y valores."));
        } finally {
            setLoading(false);
        }
    }, [handleForbidden]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const reloadCurrent = async (): Promise<MisionVisionVersion> => {
        const [current, history] = await Promise.all([
            getMisionVisionVigente(),
            getMisionVisionVersiones(),
        ]);
        setVigente(current);
        setVersiones(history);
        return current;
    };

    const handleSaved = (created: MisionVisionVersion) => {
        setVigente(created);
        void getMisionVisionVersiones().then(setVersiones).catch(() => undefined);
    };

    const openVersionDetail = async (id: number) => {
        setDetailVersion(null);
        setDetailLoading(true);
        detailDisclosure.onOpen();
        try {
            setDetailVersion(await getMisionVisionVersion(id));
        } catch (cause) {
            if (axios.isAxiosError(cause) && cause.response?.status === 403) {
                await handleForbidden();
                detailDisclosure.onClose();
                return;
            }
            toast({
                title: "No fue posible abrir la versión",
                description: apiErrorMessage(cause, "Inténtalo nuevamente."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setDetailLoading(false);
        }
    };

    const openRestore = (version: MisionVisionVersionSummary) => {
        setRestoreTarget(version);
        setRestoreReason("");
        restoreDisclosure.onOpen();
    };

    const handleRestore = async () => {
        if (!vigente || !restoreTarget || !restoreReason.trim()) return;
        setRestoring(true);
        try {
            const restored = await restoreMisionVisionVersion(restoreTarget.id, {
                versionBase: vigente.version,
                motivoCambio: restoreReason.trim(),
            });
            handleSaved(restored);
            restoreDisclosure.onClose();
            detailDisclosure.onClose();
            toast({
                title: `Versión ${restoreTarget.version} restaurada`,
                description: `Se publicó como la nueva versión ${restored.version}.`,
                status: "success",
                duration: 4500,
                isClosable: true,
            });
        } catch (cause) {
            if (axios.isAxiosError(cause) && cause.response?.status === 409) {
                await reloadCurrent();
                toast({
                    title: "La versión vigente cambió",
                    description: "Se recargó el historial. Revisa los cambios antes de restaurar.",
                    status: "warning",
                    duration: 5000,
                    isClosable: true,
                });
                restoreDisclosure.onClose();
            } else if (axios.isAxiosError(cause) && cause.response?.status === 403) {
                await handleForbidden();
                restoreDisclosure.onClose();
            } else {
                toast({
                    title: "No fue posible restaurar la versión",
                    description: apiErrorMessage(cause, "Inténtalo nuevamente."),
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
            }
        } finally {
            setRestoring(false);
        }
    };

    if (loading) {
        return (
            <Flex minH="60vh" align="center" justify="center">
                <Spinner size="xl" />
            </Flex>
        );
    }

    if (error || !vigente) {
        return (
            <Box p={8}>
                <Alert.Root status="error" borderRadius="md">
                    <Alert.Indicator />
                    <Flex flex="1" align="center" justify="space-between" gap={4}>
                        <Text>{error ?? "No existe una versión vigente configurada."}</Text>
                        <Button size="sm" onClick={() => void loadData()}>Reintentar</Button>
                    </Flex>
                </Alert.Root>
            </Box>
        );
    }

    return (
        <Box bgGradient={bgGradient} minH="100vh" py={8}>
            <Container maxW="container.xl">
                <Flex direction="column" align="center" textAlign="center" mb={12}>
                    <Heading
                        as="h1"
                        size="2xl"
                        mb={4}
                        bgGradient="linear(to-r, blue.400, teal.400)"
                        bgClip="text"
                    >
                        Nuestra Identidad Corporativa
                    </Heading>
                    <Text fontSize="xl" maxW="800px" color="app.textMuted">
                        Conoce los principios que guían nuestro trabajo y definen quiénes somos como organización.
                    </Text>
                    <HStack mt={5} gap={3}>
                        <Badge colorPalette="blue">Versión {vigente.version}</Badge>
                        {canEdit && (
                            <Button colorPalette="blue" size="sm" onClick={editorDisclosure.onOpen}><FaPencilAlt />Editar
                                                            </Button>
                        )}
                    </HStack>
                </Flex>

                <Flex direction={{ base: "column", lg: "row" }} gap={8} mb={16}>
                    <IdentityCard
                        title="Nuestra Misión"
                        icon={FaLightbulb}
                        iconColor="blue.500"
                        headingColor={missionHeadingColor}
                        borderColor={borderColor}
                        cardBg={cardBg}
                        accentGradient="linear(to-r, blue.400, blue.600)"
                        html={vigente.misionHtml}
                    />
                    <IdentityCard
                        title="Nuestra Visión"
                        icon={FaEye}
                        iconColor="teal.500"
                        headingColor={visionHeadingColor}
                        borderColor={borderColor}
                        cardBg={cardBg}
                        accentGradient="linear(to-r, teal.400, teal.600)"
                        html={vigente.visionHtml}
                    />
                </Flex>

                <Box mb={16}>
                    <Heading as="h2" size="xl" textAlign="center" mb={10} color={valuesHeadingColor}>
                        Nuestros Valores
                    </Heading>
                    <Flex wrap="wrap" justify="center" gap={6}>
                        {vigente.valores
                            .slice()
                            .sort((a, b) => a.orden - b.orden)
                            .map((value, index) => {
                                const ValueIcon = VALUE_ICONS[index % VALUE_ICONS.length];
                                return (
                                    <Box
                                        key={value.id}
                                        bg={cardBg}
                                        p={6}
                                        borderRadius="lg"
                                        boxShadow="md"
                                        borderWidth="1px"
                                        borderColor={borderColor}
                                        width={{ base: "100%", md: "45%", lg: "30%" }}
                                    >
                                        <VStack align="center" gap={4}>
                                            <Icon boxSize={12} color={VALUE_COLORS[index % VALUE_COLORS.length]} asChild><ValueIcon /></Icon>
                                            <Heading as="h3" size="md" textAlign="center">{value.titulo}</Heading>
                                            <SafeRichText html={value.descripcionHtml} textAlign="center" />
                                        </VStack>
                                    </Box>
                                );
                            })}
                    </Flex>
                </Box>

                <Accordion.Root collapsible mb={12} borderColor={borderColor}>
                    <Accordion.Item bg={cardBg} borderRadius="lg" overflow="hidden" value='item-0'>
                        <Accordion.ItemTrigger py={4}>
                            <HStack flex="1" textAlign="left">
                                <Icon color="blue.500" asChild><FaHistory /></Icon>
                                <Text fontWeight="semibold">Historial de versiones</Text>
                                <Badge>{versiones.length}</Badge>
                            </HStack>
                            <Accordion.ItemIndicator />
                        </Accordion.ItemTrigger>
                        <Accordion.ItemContent pb={4}><Accordion.ItemBody>
                                <VStack align="stretch" gap={3}>
                                    {versiones.map((version) => (
                                        <Flex
                                            key={version.id}
                                            direction={{ base: "column", md: "row" }}
                                            align={{ base: "stretch", md: "center" }}
                                            justify="space-between"
                                            gap={3}
                                            p={3}
                                            borderWidth="1px"
                                            borderRadius="md"
                                        >
                                            <Box>
                                                <HStack mb={1}>
                                                    <Text fontWeight="semibold">Versión {version.version}</Text>
                                                    <Badge colorPalette={version.estado === "VIGENTE" ? "green" : "gray"}>
                                                        {version.estado}
                                                    </Badge>
                                                    {version.origenVersion && <Badge colorPalette="purple">Restaurada de v{version.origenVersion}</Badge>}
                                                </HStack>
                                                <Text fontSize="sm">{version.motivoCambio}</Text>
                                                <Text fontSize="xs" color="app.textMuted">
                                                    {version.creadoPor || "Sistema"} · {formatDate(version.creadoEn)}
                                                </Text>
                                            </Box>
                                            <HStack>
                                                <Button size="sm" variant="outline" onClick={() => void openVersionDetail(version.id)}>
                                                    Ver
                                                </Button>
                                                {canEdit && version.estado === "RETIRADA" && (
                                                    <Button size="sm" onClick={() => openRestore(version)}><FaRecycle />Restaurar
                                                                                                            </Button>
                                                )}
                                            </HStack>
                                        </Flex>
                                    ))}
                                </VStack>
                            </Accordion.ItemBody></Accordion.ItemContent>
                    </Accordion.Item>
                </Accordion.Root>

                <Separator mb={8} />
                <Text textAlign="center" color="app.textSubtle" fontSize="sm">
                    © {new Date().getFullYear()} Exotic Expert. Todos los derechos reservados.
                </Text>
            </Container>

            {canEdit && editorDisclosure.open && (
                <MisionVisionEditorModal
                    isOpen={editorDisclosure.open}
                    vigente={vigente}
                    onClose={editorDisclosure.onClose}
                    onSaved={handleSaved}
                    onReloadCurrent={reloadCurrent}
                    onForbidden={handleForbidden}
                />
            )}

            <Dialog.Root open={detailDisclosure.open} size='xl' scrollBehavior="inside" onOpenChange={e => {
                if (!e.open) {
                    detailDisclosure.onClose();
                }
            }}>
                <Portal>

                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content>
                            <Dialog.Header>
                                <Dialog.Title>{detailVersion ? `Detalle de la versión ${detailVersion.version}` : "Cargando versión"}</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.CloseTrigger />
                            <Dialog.Body>
                                {detailLoading || !detailVersion ? (
                                    <Flex justify="center" py={12}><Spinner size="lg" /></Flex>
                                ) : (
                                    <VersionDetail version={detailVersion} />
                                )}
                            </Dialog.Body>
                            <Dialog.Footer gap={3}>
                                {canEdit && detailVersion?.estado === "RETIRADA" && (
                                    <Button onClick={() => openRestore(detailVersion)}><FaRecycle />Restaurar esta versión
                                                                    </Button>
                                )}
                                <Button onClick={detailDisclosure.onClose}>Cerrar</Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>

                </Portal>
            </Dialog.Root>

            <Dialog.Root open={restoreDisclosure.open} placement='center' onOpenChange={e => {
                if (!e.open) {
                    restoreDisclosure.onClose();
                }
            }}>
                <Portal>

                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content>
                            <Dialog.Header><Dialog.Title>Restaurar versión {restoreTarget?.version}</Dialog.Title></Dialog.Header>
                            <Dialog.CloseTrigger disabled={restoring} />
                            <Dialog.Body>
                                <Text mb={4}>
                                    Se copiará el contenido seleccionado y se publicará como una nueva versión. El historial no será modificado.
                                </Text>
                                <Textarea
                                    value={restoreReason}
                                    onChange={(event) => setRestoreReason(event.target.value)}
                                    maxLength={1000}
                                    rows={4}
                                    placeholder="Motivo de la restauración"
                                />
                            </Dialog.Body>
                            <Dialog.Footer gap={3}>
                                <Button variant="ghost" onClick={restoreDisclosure.onClose} disabled={restoring}>Cancelar</Button>
                                <Button
                                    colorPalette="blue"
                                    onClick={() => void handleRestore()}
                                    loading={restoring}
                                    disabled={!restoreReason.trim()}
                                >
                                    Restaurar como nueva versión
                                </Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>

                </Portal>
            </Dialog.Root>
        </Box>
    );
}

interface IdentityCardProps {
    title: string;
    icon: typeof FaLightbulb;
    iconColor: string;
    headingColor: string;
    borderColor: string;
    cardBg: string;
    accentGradient: string;
    html: string;
}

function IdentityCard({
    title,
    icon,
    iconColor,
    headingColor,
    borderColor,
    cardBg,
    accentGradient,
    html,
}: IdentityCardProps) {
    return (
        <Box
            flex="1"
            bg={cardBg}
            p={8}
            borderRadius="xl"
            boxShadow="xl"
            borderWidth="1px"
            borderColor={borderColor}
            position="relative"
            overflow="hidden"
            _before={{
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "5px",
                bgGradient: accentGradient,
            }}
        >
            <Flex align="center" mb={6}>
                <Icon as={icon} boxSize={10} color={iconColor} mr={4} />
                <Heading as="h2" size="xl" color={headingColor}>{title}</Heading>
            </Flex>
            <SafeRichText html={html} fontSize="lg" lineHeight="tall" />
        </Box>
    );
}

function VersionDetail({ version }: { version: MisionVisionVersion }) {
    return (
        <VStack align="stretch" gap={6}>
            <Box>
                <HStack mb={2}>
                    <Badge colorPalette={version.estado === "VIGENTE" ? "green" : "gray"}>{version.estado}</Badge>
                    {version.origenVersion && <Badge colorPalette="purple">Restaurada de v{version.origenVersion}</Badge>}
                </HStack>
                <Text fontSize="sm"><strong>Motivo:</strong> {version.motivoCambio}</Text>
                <Text fontSize="sm"><strong>Autor:</strong> {version.creadoPor || "Sistema"}</Text>
                <Text fontSize="sm"><strong>Fecha:</strong> {formatDate(version.creadoEn)}</Text>
            </Box>
            <Box>
                <Heading size="md" mb={3}>Misión</Heading>
                <SafeRichText html={version.misionHtml} />
            </Box>
            <Box>
                <Heading size="md" mb={3}>Visión</Heading>
                <SafeRichText html={version.visionHtml} />
            </Box>
            <Box>
                <Heading size="md" mb={3}>Valores</Heading>
                <VStack align="stretch" gap={4}>
                    {version.valores
                        .slice()
                        .sort((a, b) => a.orden - b.orden)
                        .map((value) => (
                            <Box key={value.id} p={3} borderWidth="1px" borderRadius="md">
                                <Text fontWeight="semibold" mb={2}>{value.titulo}</Text>
                                <SafeRichText html={value.descripcionHtml} />
                            </Box>
                        ))}
                </VStack>
            </Box>
        </VStack>
    );
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function apiErrorMessage(cause: unknown, fallback: string): string {
    if (!axios.isAxiosError(cause)) return fallback;
    const data = cause.response?.data as { detail?: string; message?: string; error?: string } | undefined;
    return data?.detail || data?.message || data?.error || fallback;
}
