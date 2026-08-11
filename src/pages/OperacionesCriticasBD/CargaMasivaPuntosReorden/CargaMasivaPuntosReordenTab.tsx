import {
    Steps,
    Alert,
    Badge,
    Box,
    Button,
    Container,
    Flex,
    Heading,
    HStack,
    Input,
    SimpleGrid,
    Spinner,
    Stat,
    Table,
    TableContainer,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    useDisclosure,
    useSteps,
    useToast,
    VStack,
    Field,
    Dialog,
    Portal,
} from "@chakra-ui/react";
import { LuCheck } from 'react-icons/lu';
import axios from "axios";
import { ChangeEvent, useMemo, useState } from "react";
import { FaArrowLeft, FaDownload, FaFileExcel, FaRedo } from "react-icons/fa";
import EndPointsURL from "../../../api/EndPointsURL";
import {
    CargaPuntosReordenExecutionResponse,
    CargaPuntosReordenValidationResponse,
} from "./types";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const PREVIEW_PAGE_SIZE = 25;

const steps = [
    { title: "Información y plantilla", description: "Descargar el Excel actualizado" },
    { title: "Subir y validar", description: "Revisar estructura y valores" },
    { title: "Previsualizar y ejecutar", description: "Confirmar los cambios" },
];

interface CargaMasivaPuntosReordenTabProps {
    onBackToSelector: () => void;
}

function isValidationResponse(value: unknown): value is CargaPuntosReordenValidationResponse {
    if (value == null || typeof value !== "object") return false;
    const candidate = value as Partial<CargaPuntosReordenValidationResponse>;
    return typeof candidate.valid === "boolean"
        && Array.isArray(candidate.changes)
        && Array.isArray(candidate.errors);
}

function formatNumber(value: number): string {
    return value.toLocaleString("es-CO", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
    });
}

export default function CargaMasivaPuntosReordenTab({
    onBackToSelector,
}: CargaMasivaPuntosReordenTabProps) {
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const toast = useToast();
    const confirmModal = useDisclosure();
    const stepsApi = useSteps({
        defaultStep: 0,
        count: steps.length
    });

    const [file, setFile] = useState<File | null>(null);
    const [fileInputKey, setFileInputKey] = useState(0);
    const [validation, setValidation] =
        useState<CargaPuntosReordenValidationResponse | null>(null);
    const [execution, setExecution] =
        useState<CargaPuntosReordenExecutionResponse | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [previewPage, setPreviewPage] = useState(0);

    const totalPreviewPages = validation
        ? Math.max(1, Math.ceil(validation.changes.length / PREVIEW_PAGE_SIZE))
        : 1;
    const previewChanges = validation?.changes.slice(
        previewPage * PREVIEW_PAGE_SIZE,
        (previewPage + 1) * PREVIEW_PAGE_SIZE
    ) ?? [];

    const resetFlow = () => {
        setFile(null);
        setValidation(null);
        setExecution(null);
        setPreviewPage(0);
        setFileInputKey((current) => current + 1);
        setActiveStep(0);
    };

    const downloadTemplate = async () => {
        setIsDownloading(true);
        try {
            const response = await axios.get(
                endpoints.carga_masiva_puntos_reorden_template,
                {
                    withCredentials: true,
                    responseType: "blob",
                }
            );
            const blobUrl = URL.createObjectURL(response.data);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = "plantilla_actualizacion_puntos_reorden.xlsx";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Error descargando plantilla de puntos de reorden", error);
            toast({
                title: "No se pudo descargar la plantilla",
                description: "Intente nuevamente o verifique sus permisos.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsDownloading(false);
        }
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const selected = event.target.files?.[0] ?? null;
        setValidation(null);
        setExecution(null);
        setPreviewPage(0);

        if (selected && !selected.name.toLowerCase().endsWith(".xlsx")) {
            setFile(null);
            setFileInputKey((current) => current + 1);
            toast({
                title: "Archivo no permitido",
                description: "Seleccione un archivo Excel con extensión .xlsx.",
                status: "warning",
                duration: 4000,
                isClosable: true,
            });
            return;
        }
        if (selected && selected.size > MAX_FILE_SIZE_BYTES) {
            setFile(null);
            setFileInputKey((current) => current + 1);
            toast({
                title: "Archivo demasiado grande",
                description: "El tamaño máximo permitido es 10 MB.",
                status: "warning",
                duration: 4000,
                isClosable: true,
            });
            return;
        }
        setFile(selected);
    };

    const validateFile = async () => {
        if (!file) return;
        setIsValidating(true);
        setValidation(null);
        setExecution(null);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const response = await axios.post<CargaPuntosReordenValidationResponse>(
                endpoints.carga_masiva_puntos_reorden_validar,
                formData,
                {
                    withCredentials: true,
                    headers: { "Content-Type": "multipart/form-data" },
                }
            );
            setValidation(response.data);
            if (response.data.valid && response.data.updateRows > 0) {
                setPreviewPage(0);
                setActiveStep(2);
                return;
            }
            toast({
                title: response.data.valid
                    ? "No hay cambios para aplicar"
                    : "El archivo contiene errores",
                description: response.data.valid
                    ? "Diligencie al menos un punto de reorden diferente al valor actual."
                    : "Revise el detalle antes de continuar.",
                status: response.data.valid ? "info" : "warning",
                duration: 5000,
                isClosable: true,
            });
        } catch (error) {
            console.error("Error validando puntos de reorden", error);
            toast({
                title: "No se pudo validar el archivo",
                description: "Ocurrió un error al comunicarse con el servidor.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsValidating(false);
        }
    };

    const executeFile = async () => {
        if (!file || !validation?.valid || validation.updateRows <= 0) return;
        confirmModal.onClose();
        setIsExecuting(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const response = await axios.post<CargaPuntosReordenExecutionResponse>(
                endpoints.carga_masiva_puntos_reorden_ejecutar,
                formData,
                {
                    withCredentials: true,
                    headers: { "Content-Type": "multipart/form-data" },
                }
            );
            setExecution(response.data);
            toast({
                title: "Puntos de reorden actualizados",
                description: `${response.data.updatedRows} materiales fueron actualizados.`,
                status: "success",
                duration: 5000,
                isClosable: true,
            });
        } catch (error) {
            console.error("Error ejecutando carga de puntos de reorden", error);
            if (axios.isAxiosError(error) && isValidationResponse(error.response?.data)) {
                setValidation(error.response.data);
                setExecution(null);
                setActiveStep(1);
                toast({
                    title: error.response?.status === 409
                        ? "La plantilla está desactualizada"
                        : "No se pudo ejecutar la carga",
                    description: error.response?.status === 409
                        ? "Descargue una plantilla nueva antes de volver a intentar."
                        : "Revise los errores informados por el servidor.",
                    status: "warning",
                    duration: 6000,
                    isClosable: true,
                });
                return;
            }
            toast({
                title: "No se pudo ejecutar la carga",
                description: "No se aplicó ningún cambio. Intente nuevamente.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsExecuting(false);
        }
    };

    const summary = validation && (
        <SimpleGrid columns={{ base: 2, md: 5 }} gap={4}>
            <Stat.Root>
                <Stat.Label>Filas leídas</Stat.Label>
                <Stat.ValueText>{validation.totalRows}</Stat.ValueText>
            </Stat.Root>
            <Stat.Root>
                <Stat.Label>Ignoradas</Stat.Label>
                <Stat.ValueText>{validation.ignoredRows}</Stat.ValueText>
            </Stat.Root>
            <Stat.Root>
                <Stat.Label>Sin cambio</Stat.Label>
                <Stat.ValueText>{validation.unchangedRows}</Stat.ValueText>
            </Stat.Root>
            <Stat.Root>
                <Stat.Label>A actualizar</Stat.Label>
                <Stat.ValueText color="purple.500">{validation.updateRows}</Stat.ValueText>
            </Stat.Root>
            <Stat.Root>
                <Stat.Label>Con error</Stat.Label>
                <Stat.ValueText color={validation.errorRows > 0 ? "red.500" : undefined}>
                    {validation.errorRows}
                </Stat.ValueText>
            </Stat.Root>
        </SimpleGrid>
    );

    const errorsTable = validation && validation.errors.length > 0 && (
        <Box>
            <Heading size="sm" mb={3}>Errores encontrados</Heading>
            <Table.ScrollArea maxH="360px" overflowY="auto">
                <Table.Root size="sm">
                    <Table.Header position="sticky" top={0} bg="app.background" zIndex={1}>
                        <Table.Row>
                            <Table.ColumnHeader>Fila</Table.ColumnHeader>
                            <Table.ColumnHeader>Código</Table.ColumnHeader>
                            <Table.ColumnHeader>Columna</Table.ColumnHeader>
                            <Table.ColumnHeader>Detalle</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {validation.errors.map((error, index) => (
                            <Table.Row key={`${error.rowNumber}-${error.columnName}-${index}`}>
                                <Table.Cell>{error.rowNumber > 0 ? error.rowNumber : "Archivo"}</Table.Cell>
                                <Table.Cell>{error.productoId || "—"}</Table.Cell>
                                <Table.Cell>{error.columnName || "—"}</Table.Cell>
                                <Table.Cell whiteSpace="normal">{error.message}</Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </Table.ScrollArea>
        </Box>
    );

    const renderStep = () => {
        if (activeStep === 0) {
            return (
                <VStack align="stretch" gap={5}>
                    <Heading size="md">Actualización masiva de puntos de reorden</Heading>
                    <Alert.Root status="info">
                        <Alert.Indicator />
                        <Alert.Description>
                            Descargue una plantilla actualizada y edite únicamente la columna
                            <strong> nuevo_punto_reorden</strong>. Las filas vacías no serán modificadas.
                        </Alert.Description>
                    </Alert.Root>
                    <Box>
                        <Text><strong>-1:</strong> ignorar alertas de punto de reorden.</Text>
                        <Text><strong>0:</strong> dejar el material sin umbral definido.</Text>
                        <Text><strong>Mayor que 0:</strong> activar el umbral de alerta.</Text>
                    </Box>
                    <HStack>
                        <Button
                            colorPalette="purple"
                            onClick={downloadTemplate}
                            loading={isDownloading}
                            loadingText="Generando plantilla"><FaDownload />Descargar plantilla
                                                    </Button>
                        <Button variant="outline" onClick={() => setActiveStep(1)}>
                            Ya tengo la plantilla
                        </Button>
                    </HStack>
                </VStack>
            );
        }

        if (activeStep === 1) {
            return (
                <VStack align="stretch" gap={5}>
                    <Heading size="md">Subir y validar Excel</Heading>
                    <Field.Root>
                        <Field.Label htmlFor="puntos-reorden-file">Plantilla diligenciada</Field.Label>
                        <Input
                            key={fileInputKey}
                            id="puntos-reorden-file"
                            type="file"
                            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            onValueChange={handleFileChange}
                            p={1}
                        />
                        <Field.HelperText>Solo .xlsx, máximo 10 MB.</Field.HelperText>
                    </Field.Root>
                    {file && (
                        <HStack>
                            <FaFileExcel />
                            <Text>{file.name}</Text>
                            <Badge colorPalette="green">
                                {(file.size / 1024).toFixed(1)} KB
                            </Badge>
                        </HStack>
                    )}
                    <HStack justify="space-between">
                        <Button variant="outline" onClick={() => setActiveStep(0)}>
                            Atrás
                        </Button>
                        <Button
                            colorPalette="purple"
                            onClick={validateFile}
                            disabled={!file}
                            loading={isValidating}
                            loadingText="Validando"
                        >
                            Validar archivo
                        </Button>
                    </HStack>
                    {validation && (
                        <VStack align="stretch" gap={4}>
                            {summary}
                            {validation.valid && validation.updateRows === 0 && (
                                <Alert.Root status="info">
                                    <Alert.Indicator />
                                    <Alert.Description>
                                        El archivo es válido, pero no contiene valores nuevos diferentes.
                                    </Alert.Description>
                                </Alert.Root>
                            )}
                            {errorsTable}
                        </VStack>
                    )}
                </VStack>
            );
        }

        if (!validation) {
            return (
                <Alert.Root status="warning">
                    <Alert.Indicator />
                    <Alert.Description>
                        Valide nuevamente el archivo antes de continuar.
                    </Alert.Description>
                </Alert.Root>
            );
        }

        if (execution) {
            return (
                <VStack align="stretch" gap={5}>
                    <Alert.Root status="success">
                        <Alert.Indicator />
                        <Alert.Description>
                            La carga terminó correctamente. Se actualizaron{" "}
                            <strong>{execution.updatedRows}</strong> materiales.
                        </Alert.Description>
                    </Alert.Root>
                    <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
                        <Stat.Root><Stat.Label>Filas leídas</Stat.Label><Stat.ValueText>{execution.totalRows}</Stat.ValueText></Stat.Root>
                        <Stat.Root><Stat.Label>Ignoradas</Stat.Label><Stat.ValueText>{execution.ignoredRows}</Stat.ValueText></Stat.Root>
                        <Stat.Root><Stat.Label>Sin cambio</Stat.Label><Stat.ValueText>{execution.unchangedRows}</Stat.ValueText></Stat.Root>
                        <Stat.Root><Stat.Label>Actualizadas</Stat.Label><Stat.ValueText>{execution.updatedRows}</Stat.ValueText></Stat.Root>
                    </SimpleGrid>
                    <HStack>
                        <Button onClick={resetFlow}><FaRedo />Procesar otra plantilla
                                                    </Button>
                        <Button variant="outline" onClick={onBackToSelector}>
                            Volver a cargas masivas
                        </Button>
                    </HStack>
                </VStack>
            );
        }

        return (
            <VStack align="stretch" gap={5}>
                <Heading size="md">Cambios a aplicar</Heading>
                {summary}
                <Table.ScrollArea>
                    <Table.Root size="sm">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>Fila</Table.ColumnHeader>
                                <Table.ColumnHeader>Código</Table.ColumnHeader>
                                <Table.ColumnHeader>Material</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign='end'>Valor actual</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign='end'>Valor nuevo</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {previewChanges.map((change) => (
                                <Table.Row key={`${change.rowNumber}-${change.productoId}`}>
                                    <Table.Cell>{change.rowNumber}</Table.Cell>
                                    <Table.Cell>{change.productoId}</Table.Cell>
                                    <Table.Cell>{change.nombre}</Table.Cell>
                                    <Table.Cell textAlign='end'>{formatNumber(change.currentValue)}</Table.Cell>
                                    <Table.Cell fontWeight="bold" textAlign='end'>{formatNumber(change.newValue)}</Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Table.ScrollArea>
                {totalPreviewPages > 1 && (
                    <HStack justify="space-between">
                        <Button
                            size="sm"
                            onClick={() => setPreviewPage((page) => Math.max(0, page - 1))}
                            disabled={previewPage === 0}
                        >
                            Anterior
                        </Button>
                        <Text fontSize="sm">
                            Página {previewPage + 1} de {totalPreviewPages}
                        </Text>
                        <Button
                            size="sm"
                            onClick={() => setPreviewPage((page) =>
                                Math.min(totalPreviewPages - 1, page + 1))}
                            disabled={previewPage >= totalPreviewPages - 1}
                        >
                            Siguiente
                        </Button>
                    </HStack>
                )}
                <Alert.Root status="warning">
                    <Alert.Indicator />
                    <Alert.Description>
                        La operación actualizará todos los materiales listados en una sola transacción.
                    </Alert.Description>
                </Alert.Root>
                <HStack justify="space-between">
                    <Button variant="outline" onClick={() => setActiveStep(1)}>
                        Atrás
                    </Button>
                    <Button
                        colorPalette="red"
                        onClick={confirmModal.onOpen}
                        disabled={!validation.valid || validation.updateRows <= 0 || isExecuting}
                    >
                        Confirmar actualización
                    </Button>
                </HStack>
            </VStack>
        );
    };

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full" py={4}>
            <Flex direction="column" gap={4}>
                <Button
                    w="fit-content"
                    variant="ghost"
                    onClick={onBackToSelector}
                    disabled={isExecuting}><FaArrowLeft />Volver a cargas masivas
                                    </Button>
                <Steps.RootProvider p="1em" backgroundColor="app.stepperTeal" w="full" value={stepsApi}>
                    {steps.map((step, index) => (
                        <Steps.Item key={step.title}>
                            <Steps.Indicator>
                                <Steps.Status
                                    complete={<LuCheck />}
                                    incomplete={<Steps.Number />}
                                    current={<Steps.Number />}
                                />
                            </Steps.Indicator>
                            <Box flexShrink="0">
                                <Steps.Title>{step.title}</Steps.Title>
                                <Steps.Description>{step.description}</Steps.Description>
                            </Box>
                            <Steps.Separator />
                        </Steps.Item>
                    ))}
                </Steps.RootProvider>
                {isExecuting ? (
                    <Flex justify="center" align="center" minH="260px" direction="column" gap={3}>
                        <Spinner size="xl" color="purple.500" />
                        <Text>Aplicando puntos de reorden...</Text>
                    </Flex>
                ) : renderStep()}
            </Flex>

            <Dialog.Root open={confirmModal.open} placement='center' onOpenChange={e => {
                if (!e.open) {
                    confirmModal.onClose();
                }
            }}>
                <Portal>

                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content>
                            <Dialog.Header>Confirmar actualización masiva</Dialog.Header>
                            <Dialog.CloseTrigger />
                            <Dialog.Body>
                                Se actualizarán <strong>{validation?.updateRows ?? 0}</strong> materiales.
                                El archivo será validado nuevamente antes de guardar.
                            </Dialog.Body>
                            <Dialog.Footer gap={3}>
                                <Button variant="ghost" onClick={confirmModal.onClose}>
                                    Cancelar
                                </Button>
                                <Button colorPalette="red" onClick={executeFile}>
                                    Actualizar puntos de reorden
                                </Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>

                </Portal>
            </Dialog.Root>
        </Container>
    );
}
