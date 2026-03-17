import {
    Alert,
    AlertDescription,
    AlertIcon,
    AlertTitle,
    Box,
    Button,
    Flex,
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

    const isValidJsonExtension = (file: File): boolean => file.name.toLowerCase().endsWith(".json");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!isValidJsonExtension(file)) {
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
        }
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

    const validateJsonFile = async (file: File) => {
        setIsValidating(true);
        setValidationErrors([]);
        setTableErrors([]);
        setHttpErrorType(null);
        setJsonIsValid(false);

        try {
            const text = await file.text();
            const parsed = JSON.parse(text) as ExportacionTerminadosConInsumos;

            const schemaValid = validateSchema(parsed);
            if (!schemaValid) {
                const schemaErrors = mapSchemaErrors(validateSchema.errors, parsed);
                setTableErrors(schemaErrors);
                setIsValidating(false);
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

            const result = response.data;
            if (!result.valid && result.errors && result.errors.length > 0) {
                setTableErrors(result.errors);
                setJsonIsValid(false);
                toast({
                    title: "Errores de validación en el servidor",
                    description: `${result.errors.length} error(es) encontrado(s). Revise la tabla para corregir el archivo.`,
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
            } else {
                setTableErrors([]);
                setJsonIsValid(true);
                setLocalJsonData(parsed);
                toast({
                    title: "Validación exitosa",
                    description: `Se validaron ${parsed.terminados.length} terminado(s) correctamente`,
                    status: "success",
                    duration: 5000,
                    isClosable: true,
                });
            }
        } catch (error) {
            setJsonIsValid(false);
            if (error instanceof SyntaxError) {
                setHttpErrorType(null);
                setTableErrors([]);
                setValidationErrors(["El archivo no contiene un JSON válido"]);
            } else if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const data = error.response?.data as { errors?: ErrorRecordDTO[] } | undefined;
                if (status === 403 || status === 401) {
                    setHttpErrorType("session");
                    setTableErrors([]);
                    setValidationErrors([]);
                    toast({
                        title: "Sesión expirada",
                        description: "Su sesión ha expirado o no tiene permisos. Por favor inicie sesión nuevamente.",
                        status: "error",
                        duration: 7000,
                        isClosable: true,
                    });
                } else if (status === 500) {
                    setHttpErrorType("server");
                    setTableErrors([]);
                    setValidationErrors([]);
                    toast({
                        title: "Error interno del servidor",
                        description: "Intente más tarde o contacte al administrador.",
                        status: "error",
                        duration: 7000,
                        isClosable: true,
                    });
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
            <VStack align="stretch" spacing={6}>
                <Text fontSize="lg" fontWeight="semibold">
                    Subir y validar archivo JSON
                </Text>

                <Text>
                    Cargue el mismo JSON exportado por el sistema. El archivo debe conservar
                    `schemaVersion`, `exportedAt`, la lista `terminados` y la receta `insumos`
                    de cada terminado.
                </Text>

                <Text fontSize="sm" color="gray.600">
                    El producto de cada insumo debe existir previamente en la base de datos. Este
                    flujo crea terminados con insumos, dejando `procesoProduccionCompleto` y
                    `casePack` en null.
                </Text>

                <Box p={5} borderWidth="1px" borderRadius="lg">
                    <VStack spacing={4} align="stretch">
                        <HStack spacing={4} alignItems="center">
                            <Button onClick={() => inputRef.current?.click()}>
                                Subir JSON
                            </Button>
                            <Input
                                type="file"
                                ref={inputRef}
                                style={{ display: "none" }}
                                accept=".json,application/json"
                                onChange={handleFileChange}
                            />
                            <Icon
                                as={jsonFile ? FaFileCircleCheck : FaFileCircleQuestion}
                                boxSize="2em"
                                color={jsonFile ? "green" : "orange.500"}
                            />
                            {jsonFile && (
                                <Text fontSize="sm" noOfLines={1} flex={1}>
                                    {jsonFile.name}
                                </Text>
                            )}
                        </HStack>

                        <Button
                            colorScheme="blue"
                            onClick={() => jsonFile && validateJsonFile(jsonFile)}
                            isDisabled={!jsonFile || isValidating}
                            isLoading={isValidating}
                            loadingText="Validando..."
                        >
                            Validar JSON
                        </Button>
                    </VStack>
                </Box>

                {httpErrorType === "session" && (
                    <Alert status="error">
                        <AlertIcon />
                        <Box>
                            <AlertTitle>Sesión expirada</AlertTitle>
                            <AlertDescription>
                                Su sesión ha expirado o no tiene permisos. Por favor inicie sesión nuevamente.
                            </AlertDescription>
                        </Box>
                    </Alert>
                )}

                {httpErrorType === "server" && (
                    <Alert status="error">
                        <AlertIcon />
                        <Box>
                            <AlertTitle>Error interno del servidor</AlertTitle>
                            <AlertDescription>
                                Intente más tarde o contacte al administrador.
                            </AlertDescription>
                        </Box>
                    </Alert>
                )}

                {tableErrors.length > 0 && httpErrorType === null && (
                    <Alert status="error">
                        <AlertIcon />
                        <Box width="100%">
                            <AlertTitle>Errores de validación encontrados:</AlertTitle>
                            <AlertDescription as="div" mt={3}>
                                <TableContainer maxH="300px" overflowY="auto">
                                    <Table size="sm" variant="simple">
                                        <Thead>
                                            <Tr>
                                                <Th>Fila</Th>
                                                <Th>Campo</Th>
                                                <Th>Producto ID</Th>
                                                <Th>Descripción del error</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {tableErrors.slice(0, 20).map((e, idx) => (
                                                <Tr key={idx}>
                                                    <Td>{e.rowNumber}</Td>
                                                    <Td>{e.columnName || "-"}</Td>
                                                    <Td>{e.productoId || "-"}</Td>
                                                    <Td>{e.message}</Td>
                                                </Tr>
                                            ))}
                                        </Tbody>
                                    </Table>
                                </TableContainer>
                                {tableErrors.length > 20 && (
                                    <Text fontSize="sm" fontStyle="italic" mt={2}>
                                        ... y {tableErrors.length - 20} errores más
                                    </Text>
                                )}
                            </AlertDescription>
                        </Box>
                    </Alert>
                )}

                {validationErrors.length > 0 && tableErrors.length === 0 && httpErrorType === null && (
                    <Alert status="error">
                        <AlertIcon />
                        <Box>
                            <AlertTitle>Error de validación</AlertTitle>
                            <AlertDescription>
                                <VStack align="stretch" spacing={1} mt={2}>
                                    {validationErrors.map((error, index) => (
                                        <Text key={index} fontSize="sm">
                                            {error}
                                        </Text>
                                    ))}
                                </VStack>
                            </AlertDescription>
                        </Box>
                    </Alert>
                )}

                {jsonIsValid && jsonData && (
                    <Alert status="success">
                        <AlertIcon />
                        <AlertDescription>
                            Archivo validado correctamente. Se encontraron {jsonData.terminados.length} terminado(s) para registrar.
                        </AlertDescription>
                    </Alert>
                )}

                <Flex gap={4} justify="flex-end">
                    <Button
                        colorScheme="blue"
                        onClick={() => setActiveStep(1)}
                        isDisabled={!jsonIsValid}
                    >
                        Siguiente
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
