import {
    Steps,
    Alert,
    Box,
    Button,
    HStack,
    Icon,
    Input,
    Table,
    TableContainer,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    useToast,
    VStack,
} from "@chakra-ui/react";
import { useMemo, useRef, useState } from "react";
import { FaFileCircleCheck, FaFileCircleQuestion } from "react-icons/fa6";
import Ajv, { ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import axios from "axios";
import EndPointsURL from "../../../../../api/EndPointsURL";
import { validateBulkProductoId } from "../../productoIdValidation";
import { soloInsumosSchema } from "../soloInsumosSchema";
import {
    ErrorRecordDTO,
    ExportacionTerminadosConInsumos,
    ValidationResultDTO,
} from "../soloInsumosTypes";

interface SoloInsumosStep2SubirValidarProps {
    setActiveStep: (step: number) => void;
    setJsonFile: (file: File | null) => void;
}

export default function SoloInsumosStep2SubirValidar({
    setActiveStep,
    setJsonFile,
}: SoloInsumosStep2SubirValidarProps) {
    const toast = useToast();
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const inputRef = useRef<HTMLInputElement>(null);
    const [jsonFile, setLocalJsonFile] = useState<File | null>(null);
    const [jsonIsValid, setJsonIsValid] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [tableErrors, setTableErrors] = useState<ErrorRecordDTO[]>([]);
    const [httpErrorType, setHttpErrorType] = useState<"session" | "server" | null>(null);
    const [jsonData, setLocalJsonData] = useState<ExportacionTerminadosConInsumos | null>(null);

    const validateSchema = useMemo(() => {
        const ajv = new Ajv({ allErrors: true, strict: false });
        addFormats(ajv);
        return ajv.compile(soloInsumosSchema);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            e.target.value = "";
            return;
        }

        if (!file.name.toLowerCase().endsWith(".json")) {
            toast({
                title: "Tipo de archivo no permitido",
                description: "Solo se permiten archivos JSON (.json)",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            e.target.value = "";
            return;
        }

        setLocalJsonFile(file);
        setJsonFile(file);
        setJsonIsValid(false);
        setValidationErrors([]);
        setTableErrors([]);
        setHttpErrorType(null);
        setLocalJsonData(null);
        e.target.value = "";
    };

    const mapSchemaErrors = (errors: ErrorObject[] | null | undefined, data?: ExportacionTerminadosConInsumos): ErrorRecordDTO[] => {
        if (!errors?.length) {
            return [];
        }
        return errors.map((error) => {
            const match = error.instancePath.match(/^\/terminados\/(\d+)/);
            const index = match ? Number(match[1]) : -1;
            const productoId = index >= 0 ? data?.terminados?.[index]?.productoId ?? "" : "";
            const pointerParts = error.instancePath.split("/").filter(Boolean);
            const columnName = pointerParts.length > 0 ? pointerParts[pointerParts.length - 1] : "json";
            const propertyName =
                error.keyword === "required" && typeof error.params === "object" && error.params && "missingProperty" in error.params
                    ? String(error.params.missingProperty)
                    : columnName;

            return {
                rowNumber: index >= 0 ? index + 1 : 0,
                productoId,
                columnName: propertyName,
                message: `${error.instancePath || "/"} ${error.message || "no cumple el schema"}`.trim(),
            };
        });
    };

    const validateProductoIds = (data: ExportacionTerminadosConInsumos): ErrorRecordDTO[] => {
        const errors: ErrorRecordDTO[] = [];
        data.terminados.forEach((terminado, index) => {
            const rowNumber = index + 1;
            const productoId = terminado.productoId ?? "";
            const productoIdError = validateBulkProductoId(productoId, "productoId");
            if (productoIdError) {
                errors.push({ rowNumber, productoId, columnName: "productoId", message: productoIdError });
            }

            terminado.insumos.forEach((insumo) => {
                const insumoProductoId = insumo.producto?.productoId ?? "";
                const insumoProductoIdError = validateBulkProductoId(insumoProductoId, "insumos.producto.productoId");
                if (insumoProductoIdError) {
                    errors.push({
                        rowNumber,
                        productoId,
                        columnName: "insumos.producto.productoId",
                        message: insumoProductoIdError,
                    });
                }
            });
        });
        return errors;
    };

    const validateJsonFile = async (file: File) => {
        setIsValidating(true);
        setValidationErrors([]);
        setTableErrors([]);
        setHttpErrorType(null);
        setJsonIsValid(false);

        try {
            const parsed = JSON.parse(await file.text()) as ExportacionTerminadosConInsumos;
            const schemaValid = validateSchema(parsed);
            if (!schemaValid) {
                setTableErrors(mapSchemaErrors(validateSchema.errors, parsed));
                return;
            }

            const semanticErrors = validateProductoIds(parsed);
            if (semanticErrors.length > 0) {
                setTableErrors(semanticErrors);
                return;
            }

            const formData = new FormData();
            formData.append("file", file);
            const response = await axios.post<ValidationResultDTO>(
                endpoints.carga_masiva_terminados_validar_json_con_insumos,
                formData,
                {
                    withCredentials: true,
                    headers: { "Content-Type": "multipart/form-data" },
                }
            );

            if (!response.data.valid && response.data.errors?.length) {
                setTableErrors(response.data.errors);
                toast({
                    title: "Errores de validacion en el servidor",
                    description: `${response.data.errors.length} error(es) encontrado(s). Revise la tabla para corregir el archivo.`,
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
                return;
            }

            setTableErrors([]);
            setJsonIsValid(true);
            setLocalJsonData(parsed);
            toast({
                title: "Validacion exitosa",
                description: `Se validaron ${parsed.terminados.length} terminado(s) correctamente`,
                status: "success",
                duration: 5000,
                isClosable: true,
            });
        } catch (error) {
            setJsonIsValid(false);
            if (error instanceof SyntaxError) {
                setHttpErrorType(null);
                setTableErrors([]);
                setValidationErrors(["El archivo no contiene un JSON valido"]);
            } else if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const data = error.response?.data as { errors?: ErrorRecordDTO[] } | undefined;
                if (status === 401 || status === 403) {
                    setHttpErrorType("session");
                    setTableErrors([]);
                    setValidationErrors([]);
                } else if (status === 500) {
                    setHttpErrorType("server");
                    setTableErrors([]);
                    setValidationErrors([]);
                } else if (data?.errors?.length) {
                    setHttpErrorType(null);
                    setTableErrors(data.errors);
                } else {
                    setHttpErrorType(null);
                    setTableErrors([]);
                    setValidationErrors([error.message || "Error al validar el archivo JSON"]);
                }
            } else {
                setHttpErrorType(null);
                setTableErrors([]);
                setValidationErrors([error instanceof Error ? error.message : "Error al validar el archivo JSON"]);
            }
        } finally {
            setIsValidating(false);
        }
    };

    return (
        <Box p={4}>
            <VStack align="stretch" gap={6}>
                <Text fontSize="lg" fontWeight="semibold">Subir y validar archivo JSON</Text>

                <Text>
                    Cargue el mismo JSON exportado por el sistema. El archivo debe conservar
                    <code> schemaVersion </code>, <code> exportedAt </code>, la lista <code>terminados</code> y la receta <code>insumos</code>.
                </Text>
                <Text fontSize="sm" color="app.textMuted">
                    Los IDs de producto deben venir solo con letras y numeros en mayusculas, sin espacios ni caracteres especiales.
                </Text>

                <Box p={5} borderWidth="1px" borderRadius="lg">
                    <VStack gap={4} align="stretch">
                        <HStack gap={4} alignItems="center">
                            <Button onClick={() => inputRef.current?.click()}>Subir JSON</Button>
                            <Input type="file" ref={inputRef} style={{ display: "none" }} accept=".json,application/json" onValueChange={handleFileChange} />
                            <Icon as={jsonFile ? FaFileCircleCheck : FaFileCircleQuestion} boxSize="2em" color={jsonFile ? "green" : "orange.500"} />
                            {jsonFile && <Text fontSize="sm" lineClamp={1} flex={1}>{jsonFile.name}</Text>}
                        </HStack>

                        <Button
                            colorPalette="blue"
                            onClick={() => jsonFile && validateJsonFile(jsonFile)}
                            disabled={!jsonFile || isValidating}
                            loading={isValidating}
                            loadingText="Validando..."
                        >
                            Validar JSON
                        </Button>
                    </VStack>
                </Box>

                {httpErrorType === "session" && (
                    <Alert.Root status="error">
                        <Alert.Indicator />
                        <Box>
                            <Alert.Title>Sesion expirada</Alert.Title>
                            <Alert.Description>Su sesion ha expirado o no tiene permisos. Por favor inicie sesion nuevamente.</Alert.Description>
                        </Box>
                    </Alert.Root>
                )}

                {httpErrorType === "server" && (
                    <Alert.Root status="error">
                        <Alert.Indicator />
                        <Box>
                            <Alert.Title>Error interno del servidor</Alert.Title>
                            <Alert.Description>Intente mas tarde o contacte al administrador.</Alert.Description>
                        </Box>
                    </Alert.Root>
                )}

                {tableErrors.length > 0 && httpErrorType === null && (
                    <Alert.Root status="error">
                        <Alert.Indicator />
                        <Box width="100%">
                            <Alert.Title>Errores de validacion encontrados:</Alert.Title>
                            <Alert.Description as="div" mt={3}>
                                <Table.ScrollArea maxH="300px" overflowY="auto">
                                    <Table.Root size="sm" variant="simple">
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.ColumnHeader>Fila</Table.ColumnHeader>
                                                <Table.ColumnHeader>Campo</Table.ColumnHeader>
                                                <Table.ColumnHeader>Producto ID</Table.ColumnHeader>
                                                <Table.ColumnHeader>Descripcion del error</Table.ColumnHeader>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {tableErrors.slice(0, 20).map((error, idx) => (
                                                <Table.Row key={idx}>
                                                    <Table.Cell>{error.rowNumber}</Table.Cell>
                                                    <Table.Cell>{error.columnName || "-"}</Table.Cell>
                                                    <Table.Cell>{error.productoId || "-"}</Table.Cell>
                                                    <Table.Cell>{error.message}</Table.Cell>
                                                </Table.Row>
                                            ))}
                                        </Table.Body>
                                    </Table.Root>
                                </Table.ScrollArea>
                                {tableErrors.length > 20 && <Text fontSize="sm" fontStyle="italic" mt={2}>... y {tableErrors.length - 20} errores mas</Text>}
                            </Alert.Description>
                        </Box>
                    </Alert.Root>
                )}

                {validationErrors.length > 0 && tableErrors.length === 0 && httpErrorType === null && (
                    <Alert.Root status="error">
                        <Alert.Indicator />
                        <Box>
                            <Alert.Title>Error de validacion</Alert.Title>
                            <Alert.Description>
                                <VStack align="stretch" gap={1} mt={2}>
                                    {validationErrors.map((error, index) => <Text key={index} fontSize="sm">{error}</Text>)}
                                </VStack>
                            </Alert.Description>
                        </Box>
                    </Alert.Root>
                )}

                {jsonIsValid && jsonData && (
                    <Alert.Root status="success">
                        <Alert.Indicator />
                        <Alert.Description>Archivo validado correctamente. Se encontraron {jsonData.terminados.length} terminado(s) para registrar.</Alert.Description>
                    </Alert.Root>
                )}

                <HStack justify="flex-end">
                    <Button variant="outline" onClick={() => setActiveStep(0)}>Atras</Button>
                    <Button colorPalette="blue" onClick={() => setActiveStep(2)} disabled={!jsonIsValid}>Siguiente</Button>
                </HStack>
            </VStack>
        </Box>
    );
}
