import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
    Accordion,
    AccordionButton,
    AccordionIcon,
    AccordionItem,
    AccordionPanel,
    Alert,
    AlertIcon,
    Badge,
    Box,
    Button,
    Container,
    Divider,
    Flex,
    Heading,
    HStack,
    Icon,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Spinner,
    Text,
    Textarea,
    VStack,
    useColorModeValue,
    useDisclosure,
    useToast,
} from "@chakra-ui/react";
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
    const toast = useToast();
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
                <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    <Flex flex="1" align="center" justify="space-between" gap={4}>
                        <Text>{error ?? "No existe una versión vigente configurada."}</Text>
                        <Button size="sm" onClick={() => void loadData()}>Reintentar</Button>
                    </Flex>
                </Alert>
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
                    <HStack mt={5} spacing={3}>
                        <Badge colorScheme="blue">Versión {vigente.version}</Badge>
                        {canEdit && (
                            <Button leftIcon={<FaPencilAlt />} colorScheme="blue" size="sm" onClick={editorDisclosure.onOpen}>
                                Editar
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
                                        <VStack align="center" spacing={4}>
                                            <Icon as={ValueIcon} boxSize={12} color={VALUE_COLORS[index % VALUE_COLORS.length]} />
                                            <Heading as="h3" size="md" textAlign="center">{value.titulo}</Heading>
                                            <SafeRichText html={value.descripcionHtml} textAlign="center" />
                                        </VStack>
                                    </Box>
                                );
                            })}
                    </Flex>
                </Box>

                <Accordion allowToggle mb={12} borderColor={borderColor}>
                    <AccordionItem bg={cardBg} borderRadius="lg" overflow="hidden">
                        <AccordionButton py={4}>
                            <HStack flex="1" textAlign="left">
                                <Icon as={FaHistory} color="blue.500" />
                                <Text fontWeight="semibold">Historial de versiones</Text>
                                <Badge>{versiones.length}</Badge>
                            </HStack>
                            <AccordionIcon />
                        </AccordionButton>
                        <AccordionPanel pb={4}>
                            <VStack align="stretch" spacing={3}>
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
                                                <Badge colorScheme={version.estado === "VIGENTE" ? "green" : "gray"}>
                                                    {version.estado}
                                                </Badge>
                                                {version.origenVersion && <Badge colorScheme="purple">Restaurada de v{version.origenVersion}</Badge>}
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
                                                <Button size="sm" leftIcon={<FaRecycle />} onClick={() => openRestore(version)}>
                                                    Restaurar
                                                </Button>
                                            )}
                                        </HStack>
                                    </Flex>
                                ))}
                            </VStack>
                        </AccordionPanel>
                    </AccordionItem>
                </Accordion>

                <Divider mb={8} />
                <Text textAlign="center" color="app.textSubtle" fontSize="sm">
                    © {new Date().getFullYear()} Exotic Expert. Todos los derechos reservados.
                </Text>
            </Container>

            {canEdit && editorDisclosure.isOpen && (
                <MisionVisionEditorModal
                    isOpen={editorDisclosure.isOpen}
                    vigente={vigente}
                    onClose={editorDisclosure.onClose}
                    onSaved={handleSaved}
                    onReloadCurrent={reloadCurrent}
                    onForbidden={handleForbidden}
                />
            )}

            <Modal isOpen={detailDisclosure.isOpen} onClose={detailDisclosure.onClose} size="4xl" scrollBehavior="inside">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>
                        {detailVersion ? `Detalle de la versión ${detailVersion.version}` : "Cargando versión"}
                    </ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        {detailLoading || !detailVersion ? (
                            <Flex justify="center" py={12}><Spinner size="lg" /></Flex>
                        ) : (
                            <VersionDetail version={detailVersion} />
                        )}
                    </ModalBody>
                    <ModalFooter gap={3}>
                        {canEdit && detailVersion?.estado === "RETIRADA" && (
                            <Button
                                leftIcon={<FaRecycle />}
                                onClick={() => openRestore(detailVersion)}
                            >
                                Restaurar esta versión
                            </Button>
                        )}
                        <Button onClick={detailDisclosure.onClose}>Cerrar</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <Modal isOpen={restoreDisclosure.isOpen} onClose={restoreDisclosure.onClose} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Restaurar versión {restoreTarget?.version}</ModalHeader>
                    <ModalCloseButton isDisabled={restoring} />
                    <ModalBody>
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
                    </ModalBody>
                    <ModalFooter gap={3}>
                        <Button variant="ghost" onClick={restoreDisclosure.onClose} isDisabled={restoring}>Cancelar</Button>
                        <Button
                            colorScheme="blue"
                            onClick={() => void handleRestore()}
                            isLoading={restoring}
                            isDisabled={!restoreReason.trim()}
                        >
                            Restaurar como nueva versión
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
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
        <VStack align="stretch" spacing={6}>
            <Box>
                <HStack mb={2}>
                    <Badge colorScheme={version.estado === "VIGENTE" ? "green" : "gray"}>{version.estado}</Badge>
                    {version.origenVersion && <Badge colorScheme="purple">Restaurada de v{version.origenVersion}</Badge>}
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
                <VStack align="stretch" spacing={4}>
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
