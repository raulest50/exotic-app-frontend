import {
    Box,
    Button,
    Flex,
    Text,
    useToast,
    VStack,
    HStack,
    Icon,
    Input,
    Alert,
    AlertIcon,
    AlertDescription,
    AlertTitle,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableContainer,
} from "@chakra-ui/react";
import { useRef, useState, useMemo } from "react";
import { FaFileCircleCheck, FaFileCircleQuestion } from "react-icons/fa6";
import ExcelJS from "exceljs";
import axios from "axios";
import EndPointsURL from "../../../../../api/EndPointsURL";

interface SinInsumosStep2SubirValidarProps {
    setActiveStep: (step: number) => void;
    setExcelFile: (file: File | null) => void;
    setExcelData?: (data: unknown[] | null) => void;
}

const EXPECTED_HEADERS = [
    "producto_id", "nombre", "observaciones", "costo", "iva_percentual", "tipo_unidades",
    "cantidad_unidad", "stock_minimo", "status", "categoria_id", "foto_url", "prefijo_lote",
];

const VALID_IVA = [0, 5, 19];
const VALID_TIPO_UNIDADES = ["L", "KG", "U"];
const VALID_STATUS = [0, 1];

interface ErrorRecord {
    rowNumber: number;
    productoId: string;
    message: string;
    columnName?: string;
}

interface ValidationResultDTO {
    valid: boolean;
    errors: ErrorRecord[];
    rowCount: number;
}

export default function SinInsumosStep2SubirValidar({
    setActiveStep,
    setExcelFile,
    setExcelData,
}: SinInsumosStep2SubirValidarProps) {
    const toast = useToast();
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const inputRef = useRef<HTMLInputElement>(null);
    const [excelFile, setLocalExcelFile] = useState<File | null>(null);
    const [excel_is_valid, setExcel_is_valid] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [tableErrors, setTableErrors] = useState<ErrorRecord[]>([]);
    const [httpErrorType, setHttpErrorType] = useState<"session" | "server" | null>(null);
    const [excelData, setLocalExcelData] = useState<unknown[] | null>(null);

    const isValidExcelExtension = (file: File): boolean => {
        const lower = file.name.toLowerCase();
        return lower.endsWith(".xlsx") || lower.endsWith(".xls");
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!isValidExcelExtension(file)) {
                toast({
                    title: "Tipo de archivo no permitido",
                    description: "Solo se permiten archivos Excel (.xlsx, .xls)",
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
                e.target.value = "";
                return;
            }
            setLocalExcelFile(file);
            setExcelFile(file);
            setExcel_is_valid(false);
            setValidationErrors([]);
            setTableErrors([]);
            setHttpErrorType(null);
            setLocalExcelData(null);
        }
        e.target.value = "";
    };

    const getCellStr = (row: ExcelJS.Row, col: number): string => {
        const cell = row.getCell(col);
        const v = cell?.value;
        if (v == null) return "";
        return String(v).trim();
    };

    const getCellNum = (row: ExcelJS.Row, col: number): number => {
        const cell = row.getCell(col);
        const v = cell?.value;
        if (v == null) return 0;
        if (typeof v === "number" && !Number.isNaN(v)) return v;
        const n = parseFloat(String(v));
        return Number.isNaN(n) ? 0 : n;
    };

    const validateExcelFile = async (file: File) => {
        setIsValidating(true);
        setValidationErrors([]);
        setTableErrors([]);
        setHttpErrorType(null);
        setExcel_is_valid(false);

        try {
            const data = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(data);

            const worksheet = workbook.getWorksheet("Datos") || (workbook.worksheets.length > 1 ? workbook.worksheets[1] : workbook.worksheets[0]);
            if (!worksheet) {
                setTableErrors([{ rowNumber: 0, productoId: "", message: "No se encontró la hoja 'Datos' en el archivo" }]);
                setIsValidating(false);
                return;
            }

            if ((worksheet.rowCount ?? 0) < 2) {
                setTableErrors([{ rowNumber: 0, productoId: "", message: "El archivo debe contener al menos una fila de encabezados y una fila de datos" }]);
                setIsValidating(false);
                return;
            }

            const tableErrs: ErrorRecord[] = [];
            const parsedData: unknown[] = [];
            const headerRow = worksheet.getRow(1);
            for (let c = 0; c < EXPECTED_HEADERS.length; c++) {
                const expected = EXPECTED_HEADERS[c];
                const actual = getCellStr(headerRow, c + 1).toLowerCase();
                if (actual !== expected.toLowerCase()) {
                    tableErrs.push({ rowNumber: 1, productoId: "", message: `Columna ${c + 1} esperada "${expected}", encontrada "${actual || "(vacía)"}"`, columnName: expected });
                }
            }
            if (tableErrs.length > 0) {
                setTableErrors(tableErrs);
                setIsValidating(false);
                return;
            }

            const seenProductoIds = new Set<string>();
            worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                if (rowNumber === 1) return;

                const producto_id = getCellStr(row, 1);
                const nombre = getCellStr(row, 2);
                const costo = getCellNum(row, 4);
                const iva_percentual = getCellNum(row, 5);
                const tipo_unidades = getCellStr(row, 6).toUpperCase();
                const cantidad_unidad = getCellNum(row, 7);
                const status = getCellNum(row, 9);

                if (!producto_id) {
                    tableErrs.push({ rowNumber, productoId: "", message: "producto_id está vacío", columnName: "producto_id" });
                    return;
                }
                if (seenProductoIds.has(producto_id)) {
                    tableErrs.push({ rowNumber, productoId, message: "producto_id duplicado en el archivo", columnName: "producto_id" });
                    return;
                }
                seenProductoIds.add(producto_id);

                if (!nombre) tableErrs.push({ rowNumber, productoId, message: "nombre es obligatorio", columnName: "nombre" });
                if (costo < 0) tableErrs.push({ rowNumber, productoId, message: "costo debe ser >= 0", columnName: "costo" });
                if (!VALID_IVA.includes(iva_percentual)) tableErrs.push({ rowNumber, productoId, message: "iva_percentual debe ser 0, 5 o 19", columnName: "iva_percentual" });
                if (!tipo_unidades || !VALID_TIPO_UNIDADES.includes(tipo_unidades)) {
                    tableErrs.push({ rowNumber, productoId, message: "tipo_unidades debe ser L, KG o U", columnName: "tipo_unidades" });
                }
                if (cantidad_unidad < 0) tableErrs.push({ rowNumber, productoId, message: "cantidad_unidad debe ser >= 0", columnName: "cantidad_unidad" });
                if (!VALID_STATUS.includes(status)) {
                    tableErrs.push({ rowNumber, productoId, message: "status debe ser 0 (activo) o 1 (obsoleto)", columnName: "status" });
                }
                const stock_minimo = getCellNum(row, 8);
                if (stock_minimo < 0) tableErrs.push({ rowNumber, productoId, message: "stock_minimo debe ser >= 0", columnName: "stock_minimo" });

                parsedData.push({
                    producto_id,
                    nombre,
                    observaciones: getCellStr(row, 3),
                    costo,
                    iva_percentual,
                    tipo_unidades,
                    cantidad_unidad,
                    stock_minimo,
                    status,
                    categoria_id: getCellNum(row, 10),
                    foto_url: getCellStr(row, 11),
                    prefijo_lote: getCellStr(row, 12),
                });
            });

            if (tableErrs.length > 0) {
                setTableErrors(tableErrs);
                setIsValidating(false);
                return;
            }

            const formData = new FormData();
            formData.append("file", file);
            const response = await axios.post<ValidationResultDTO>(endpoints.carga_masiva_terminados_validar_sin_insumos, formData, {
                withCredentials: true,
                headers: { "Content-Type": "multipart/form-data" },
            });

            const result = response.data;
            if (!result.valid && result.errors && result.errors.length > 0) {
                setTableErrors(result.errors);
                setExcel_is_valid(false);
                toast({
                    title: "Errores de validación en el servidor",
                    description: `${result.errors.length} error(es) encontrado(s). Revise la tabla para corregir filas y columnas.`,
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
            } else {
                setTableErrors([]);
                setExcel_is_valid(true);
                setLocalExcelData(parsedData);
                if (setExcelData) setExcelData(parsedData);
                toast({
                    title: "Validación exitosa",
                    description: `Se validaron ${parsedData.length} fila(s) correctamente`,
                    status: "success",
                    duration: 5000,
                    isClosable: true,
                });
            }
        } catch (error) {
            setExcel_is_valid(false);
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const data = error.response?.data as { errors?: ErrorRecord[] } | undefined;
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
                    toast({
                        title: "Errores de validación",
                        description: `${data.errors.length} error(es) encontrado(s). Revise la tabla.`,
                        status: "error",
                        duration: 5000,
                        isClosable: true,
                    });
                } else {
                    setHttpErrorType(null);
                    setTableErrors([]);
                    setValidationErrors([error.message || "Error al validar el archivo Excel"]);
                    toast({
                        title: "Error de conexión",
                        description: error.message || "Error al validar el archivo Excel",
                        status: "error",
                        duration: 5000,
                        isClosable: true,
                    });
                }
            } else {
                setHttpErrorType(null);
                setTableErrors([]);
                setValidationErrors([error instanceof Error ? error.message : "Error al validar el archivo Excel"]);
                toast({
                    title: "Error de validación",
                    description: error instanceof Error ? error.message : "Error al validar el archivo Excel",
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
            }
        } finally {
            setIsValidating(false);
        }
    };

    return (
        <Box p={4}>
            <VStack align="stretch" spacing={6}>
                <Text fontSize="lg" fontWeight="semibold">
                    Subir y validar archivo Excel
                </Text>

                <Box p={5} borderWidth="1px" borderRadius="lg">
                    <VStack spacing={4} align="stretch">
                        <HStack spacing={4} alignItems="center">
                            <Button onClick={() => inputRef.current?.click()}>
                                Subir Excel
                            </Button>
                            <Input
                                type="file"
                                ref={inputRef}
                                style={{ display: "none" }}
                                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                                onChange={handleFileChange}
                            />
                            <Icon
                                as={excelFile ? FaFileCircleCheck : FaFileCircleQuestion}
                                boxSize="2em"
                                color={excelFile ? "green" : "orange.500"}
                            />
                            {excelFile && (
                                <Text fontSize="sm" noOfLines={1} flex={1}>
                                    {excelFile.name}
                                </Text>
                            )}
                        </HStack>

                        <Button
                            colorScheme="teal"
                            onClick={() => excelFile && validateExcelFile(excelFile)}
                            isDisabled={!excelFile || isValidating}
                            isLoading={isValidating}
                            loadingText="Validando..."
                        >
                            Validar Excel
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
                                                <Th>Columna</Th>
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
                            <AlertTitle>Error de conexión</AlertTitle>
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

                {excel_is_valid && excelData && (
                    <Alert status="success">
                        <AlertIcon />
                        <AlertDescription>
                            Archivo validado correctamente. Se encontraron {excelData.length} terminado(s) para registrar.
                        </AlertDescription>
                    </Alert>
                )}

                <Flex gap={4} justify="flex-end">
                    <Button variant="outline" onClick={() => setActiveStep(0)}>
                        Atrás
                    </Button>
                    <Button
                        colorScheme="blue"
                        onClick={() => setActiveStep(2)}
                        isDisabled={!excel_is_valid}
                    >
                        Siguiente
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
