import {
    Alert,
    AlertDescription,
    AlertIcon,
    Badge,
    Box,
    Button,
    Container,
    Flex,
    FormControl,
    FormHelperText,
    FormLabel,
    Heading,
    HStack,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    SimpleGrid,
    Spinner,
    Stat,
    StatLabel,
    StatNumber,
    StepDescription,
    StepNumber,
    StepSeparator,
    StepStatus,
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
} from "@chakra-ui/react";
import { Step, StepIcon, StepIndicator, Stepper, StepTitle } from "@chakra-ui/icons";
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
    const { activeStep, setActiveStep } = useSteps({
        index: 0,
        count: steps.length,
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
        <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4}>
            <Stat>
                <StatLabel>Filas leídas</StatLabel>
                <StatNumber>{validation.totalRows}</StatNumber>
            </Stat>
            <Stat>
                <StatLabel>Ignoradas</StatLabel>
                <StatNumber>{validation.ignoredRows}</StatNumber>
            </Stat>
            <Stat>
                <StatLabel>Sin cambio</StatLabel>
                <StatNumber>{validation.unchangedRows}</StatNumber>
            </Stat>
            <Stat>
                <StatLabel>A actualizar</StatLabel>
                <StatNumber color="purple.500">{validation.updateRows}</StatNumber>
            </Stat>
            <Stat>
                <StatLabel>Con error</StatLabel>
                <StatNumber color={validation.errorRows > 0 ? "red.500" : undefined}>
                    {validation.errorRows}
                </StatNumber>
            </Stat>
        </SimpleGrid>
    );

    const errorsTable = validation && validation.errors.length > 0 && (
        <Box>
            <Heading size="sm" mb={3}>Errores encontrados</Heading>
            <TableContainer maxH="360px" overflowY="auto">
                <Table size="sm">
                    <Thead position="sticky" top={0} bg="app.background" zIndex={1}>
                        <Tr>
                            <Th>Fila</Th>
                            <Th>Código</Th>
                            <Th>Columna</Th>
                            <Th>Detalle</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {validation.errors.map((error, index) => (
                            <Tr key={`${error.rowNumber}-${error.columnName}-${index}`}>
                                <Td>{error.rowNumber > 0 ? error.rowNumber : "Archivo"}</Td>
                                <Td>{error.productoId || "—"}</Td>
                                <Td>{error.columnName || "—"}</Td>
                                <Td whiteSpace="normal">{error.message}</Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            </TableContainer>
        </Box>
    );

    const renderStep = () => {
        if (activeStep === 0) {
            return (
                <VStack align="stretch" spacing={5}>
                    <Heading size="md">Actualización masiva de puntos de reorden</Heading>
                    <Alert status="info">
                        <AlertIcon />
                        <AlertDescription>
                            Descargue una plantilla actualizada y edite únicamente la columna
                            <strong> nuevo_punto_reorden</strong>. Las filas vacías no serán modificadas.
                        </AlertDescription>
                    </Alert>
                    <Box>
                        <Text><strong>-1:</strong> ignorar alertas de punto de reorden.</Text>
                        <Text><strong>0:</strong> dejar el material sin umbral definido.</Text>
                        <Text><strong>Mayor que 0:</strong> activar el umbral de alerta.</Text>
                    </Box>
                    <HStack>
                        <Button
                            leftIcon={<FaDownload />}
                            colorScheme="purple"
                            onClick={downloadTemplate}
                            isLoading={isDownloading}
                            loadingText="Generando plantilla"
                        >
                            Descargar plantilla
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
                <VStack align="stretch" spacing={5}>
                    <Heading size="md">Subir y validar Excel</Heading>
                    <FormControl>
                        <FormLabel htmlFor="puntos-reorden-file">Plantilla diligenciada</FormLabel>
                        <Input
                            key={fileInputKey}
                            id="puntos-reorden-file"
                            type="file"
                            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            onChange={handleFileChange}
                            p={1}
                        />
                        <FormHelperText>Solo .xlsx, máximo 10 MB.</FormHelperText>
                    </FormControl>
                    {file && (
                        <HStack>
                            <FaFileExcel />
                            <Text>{file.name}</Text>
                            <Badge colorScheme="green">
                                {(file.size / 1024).toFixed(1)} KB
                            </Badge>
                        </HStack>
                    )}
                    <HStack justify="space-between">
                        <Button variant="outline" onClick={() => setActiveStep(0)}>
                            Atrás
                        </Button>
                        <Button
                            colorScheme="purple"
                            onClick={validateFile}
                            isDisabled={!file}
                            isLoading={isValidating}
                            loadingText="Validando"
                        >
                            Validar archivo
                        </Button>
                    </HStack>
                    {validation && (
                        <VStack align="stretch" spacing={4}>
                            {summary}
                            {validation.valid && validation.updateRows === 0 && (
                                <Alert status="info">
                                    <AlertIcon />
                                    <AlertDescription>
                                        El archivo es válido, pero no contiene valores nuevos diferentes.
                                    </AlertDescription>
                                </Alert>
                            )}
                            {errorsTable}
                        </VStack>
                    )}
                </VStack>
            );
        }

        if (!validation) {
            return (
                <Alert status="warning">
                    <AlertIcon />
                    <AlertDescription>
                        Valide nuevamente el archivo antes de continuar.
                    </AlertDescription>
                </Alert>
            );
        }

        if (execution) {
            return (
                <VStack align="stretch" spacing={5}>
                    <Alert status="success">
                        <AlertIcon />
                        <AlertDescription>
                            La carga terminó correctamente. Se actualizaron{" "}
                            <strong>{execution.updatedRows}</strong> materiales.
                        </AlertDescription>
                    </Alert>
                    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                        <Stat><StatLabel>Filas leídas</StatLabel><StatNumber>{execution.totalRows}</StatNumber></Stat>
                        <Stat><StatLabel>Ignoradas</StatLabel><StatNumber>{execution.ignoredRows}</StatNumber></Stat>
                        <Stat><StatLabel>Sin cambio</StatLabel><StatNumber>{execution.unchangedRows}</StatNumber></Stat>
                        <Stat><StatLabel>Actualizadas</StatLabel><StatNumber>{execution.updatedRows}</StatNumber></Stat>
                    </SimpleGrid>
                    <HStack>
                        <Button leftIcon={<FaRedo />} onClick={resetFlow}>
                            Procesar otra plantilla
                        </Button>
                        <Button variant="outline" onClick={onBackToSelector}>
                            Volver a cargas masivas
                        </Button>
                    </HStack>
                </VStack>
            );
        }

        return (
            <VStack align="stretch" spacing={5}>
                <Heading size="md">Cambios a aplicar</Heading>
                {summary}
                <TableContainer>
                    <Table size="sm">
                        <Thead>
                            <Tr>
                                <Th>Fila</Th>
                                <Th>Código</Th>
                                <Th>Material</Th>
                                <Th isNumeric>Valor actual</Th>
                                <Th isNumeric>Valor nuevo</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {previewChanges.map((change) => (
                                <Tr key={`${change.rowNumber}-${change.productoId}`}>
                                    <Td>{change.rowNumber}</Td>
                                    <Td>{change.productoId}</Td>
                                    <Td>{change.nombre}</Td>
                                    <Td isNumeric>{formatNumber(change.currentValue)}</Td>
                                    <Td isNumeric fontWeight="bold">{formatNumber(change.newValue)}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </TableContainer>
                {totalPreviewPages > 1 && (
                    <HStack justify="space-between">
                        <Button
                            size="sm"
                            onClick={() => setPreviewPage((page) => Math.max(0, page - 1))}
                            isDisabled={previewPage === 0}
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
                            isDisabled={previewPage >= totalPreviewPages - 1}
                        >
                            Siguiente
                        </Button>
                    </HStack>
                )}
                <Alert status="warning">
                    <AlertIcon />
                    <AlertDescription>
                        La operación actualizará todos los materiales listados en una sola transacción.
                    </AlertDescription>
                </Alert>
                <HStack justify="space-between">
                    <Button variant="outline" onClick={() => setActiveStep(1)}>
                        Atrás
                    </Button>
                    <Button
                        colorScheme="red"
                        onClick={confirmModal.onOpen}
                        isDisabled={!validation.valid || validation.updateRows <= 0 || isExecuting}
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
                    leftIcon={<FaArrowLeft />}
                    w="fit-content"
                    variant="ghost"
                    onClick={onBackToSelector}
                    isDisabled={isExecuting}
                >
                    Volver a cargas masivas
                </Button>
                <Stepper index={activeStep} p="1em" backgroundColor="app.stepperTeal" w="full">
                    {steps.map((step, index) => (
                        <Step key={step.title}>
                            <StepIndicator>
                                <StepStatus
                                    complete={<StepIcon />}
                                    incomplete={<StepNumber />}
                                    active={<StepNumber />}
                                />
                            </StepIndicator>
                            <Box flexShrink="0">
                                <StepTitle>{step.title}</StepTitle>
                                <StepDescription>{step.description}</StepDescription>
                            </Box>
                            <StepSeparator />
                        </Step>
                    ))}
                </Stepper>
                {isExecuting ? (
                    <Flex justify="center" align="center" minH="260px" direction="column" gap={3}>
                        <Spinner size="xl" color="purple.500" />
                        <Text>Aplicando puntos de reorden...</Text>
                    </Flex>
                ) : renderStep()}
            </Flex>

            <Modal isOpen={confirmModal.isOpen} onClose={confirmModal.onClose} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Confirmar actualización masiva</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        Se actualizarán <strong>{validation?.updateRows ?? 0}</strong> materiales.
                        El archivo será validado nuevamente antes de guardar.
                    </ModalBody>
                    <ModalFooter gap={3}>
                        <Button variant="ghost" onClick={confirmModal.onClose}>
                            Cancelar
                        </Button>
                        <Button colorScheme="red" onClick={executeFile}>
                            Actualizar puntos de reorden
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Container>
    );
}
