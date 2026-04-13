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
import ExcelJS from "exceljs";
import axios from "axios";
import EndPointsURL from "../../../../../api/EndPointsURL";
import { validateBulkProductoId } from "../../productoIdValidation";

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

interface ProductoIdCellResult {
    value: string;
    error: string | null;
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
    const [excelIsValid, setExcelIsValid] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [tableErrors, setTableErrors] = useState<ErrorRecord[]>([]);
    const [httpErrorType, setHttpErrorType] = useState<"session" | "server" | null>(null);
    const [excelData, setLocalExcelData] = useState<unknown[] | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            e.target.value = "";
            return;
        }

        if (!file.name.toLowerCase().endsWith(".xlsx")) {
            toast({
                title: "Tipo de archivo no permitido",
                description: "Solo se permiten archivos Excel (.xlsx)",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            e.target.value = "";
            return;
        }

        setLocalExcelFile(file);
        setExcelFile(file);
        setExcelIsValid(false);
        setValidationErrors([]);
        setTableErrors([]);
        setHttpErrorType(null);
        setLocalExcelData(null);
        e.target.value = "";
    };

    const getCellStr = (row: ExcelJS.Row, col: number): string => {
        const value = row.getCell(col).value;
        return value == null ? "" : String(value).trim();
    };

    const getCellNum = (row: ExcelJS.Row, col: number): number => {
        const value = row.getCell(col).value;
        if (value == null) return 0;
        if (typeof value === "number" && !Number.isNaN(value)) return value;
        const parsed = parseFloat(String(value));
        return Number.isNaN(parsed) ? 0 : parsed;
    };

    const getProductoIdCellResult = (row: ExcelJS.Row, col: number): ProductoIdCellResult => {
        const cell = row.getCell(col);
        const value = cell.value;
        if (value == null) {
            return { value: "", error: "producto_id esta vacio" };
        }
        if (typeof value === "number") {
            return {
                value: cell.text || String(value),
                error: "producto_id debe escribirse como texto en Excel. No se aceptan celdas numericas.",
            };
        }

        let productoId = "";
        if (typeof value === "string") {
            productoId = value;
        } else if (typeof value === "object" && value && "richText" in value && Array.isArray(value.richText)) {
            productoId = value.richText.map((part) => part.text).join("");
        } else {
            return {
                value: cell.text || String(value),
                error: "producto_id debe escribirse como texto alfanumerico en mayusculas.",
            };
        }

        return {
            value: productoId,
            error: validateBulkProductoId(productoId, "producto_id"),
        };
    };

    const validateExcelFile = async (file: File) => {
        setIsValidating(true);
        setValidationErrors([]);
        setTableErrors([]);
        setHttpErrorType(null);
        setExcelIsValid(false);

        try {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(await file.arrayBuffer());
            const worksheet = workbook.getWorksheet("Datos") || (workbook.worksheets.length > 1 ? workbook.worksheets[1] : workbook.worksheets[0]);

            if (!worksheet) {
                setTableErrors([{ rowNumber: 0, productoId: "", message: "No se encontro la hoja 'Datos' en el archivo" }]);
                return;
            }
            if ((worksheet.rowCount ?? 0) < 2) {
                setTableErrors([{ rowNumber: 0, productoId: "", message: "El archivo debe contener encabezados y al menos una fila de datos" }]);
                return;
            }

            const localErrors: ErrorRecord[] = [];
            const parsedData: unknown[] = [];
            const headerRow = worksheet.getRow(1);
            for (let c = 0; c < EXPECTED_HEADERS.length; c++) {
                const expected = EXPECTED_HEADERS[c];
                const actual = getCellStr(headerRow, c + 1).toLowerCase();
                if (actual !== expected.toLowerCase()) {
                    localErrors.push({ rowNumber: 1, productoId: "", message: `Columna ${c + 1} esperada "${expected}", encontrada "${actual || "(vacia)"}"`, columnName: expected });
                }
            }
            if (localErrors.length > 0) {
                setTableErrors(localErrors);
                return;
            }

            const seenProductoIds = new Set<string>();
            worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                if (rowNumber === 1) return;

                const productoIdResult = getProductoIdCellResult(row, 1);
                const productoId = productoIdResult.value;
                const nombre = getCellStr(row, 2);
                const costo = getCellNum(row, 4);
                const ivaPercentual = getCellNum(row, 5);
                const tipoUnidades = getCellStr(row, 6).toUpperCase();
                const cantidadUnidad = getCellNum(row, 7);
                const stockMinimo = getCellNum(row, 8);
                const status = getCellNum(row, 9);

                if (productoIdResult.error) {
                    localErrors.push({ rowNumber, productoId, message: productoIdResult.error, columnName: "producto_id" });
                } else if (seenProductoIds.has(productoId)) {
                    localErrors.push({ rowNumber, productoId, message: "producto_id duplicado en el archivo", columnName: "producto_id" });
                } else {
                    seenProductoIds.add(productoId);
                }

                if (!nombre) localErrors.push({ rowNumber, productoId, message: "nombre es obligatorio", columnName: "nombre" });
                if (costo < 0) localErrors.push({ rowNumber, productoId, message: "costo debe ser >= 0", columnName: "costo" });
                if (!VALID_IVA.includes(ivaPercentual)) localErrors.push({ rowNumber, productoId, message: "iva_percentual debe ser 0, 5 o 19", columnName: "iva_percentual" });
                if (!tipoUnidades || !VALID_TIPO_UNIDADES.includes(tipoUnidades)) localErrors.push({ rowNumber, productoId, message: "tipo_unidades debe ser L, KG o U", columnName: "tipo_unidades" });
                if (cantidadUnidad < 0) localErrors.push({ rowNumber, productoId, message: "cantidad_unidad debe ser >= 0", columnName: "cantidad_unidad" });
                if (stockMinimo < 0) localErrors.push({ rowNumber, productoId, message: "stock_minimo debe ser >= 0", columnName: "stock_minimo" });
                if (!VALID_STATUS.includes(status)) localErrors.push({ rowNumber, productoId, message: "status debe ser 0 (activo) o 1 (obsoleto)", columnName: "status" });

                parsedData.push({
                    producto_id: productoId,
                    nombre,
                    observaciones: getCellStr(row, 3),
                    costo,
                    iva_percentual: ivaPercentual,
                    tipo_unidades: tipoUnidades,
                    cantidad_unidad: cantidadUnidad,
                    stock_minimo: stockMinimo,
                    status,
                    categoria_id: getCellNum(row, 10),
                    foto_url: getCellStr(row, 11),
                    prefijo_lote: getCellStr(row, 12),
                });
            });

            if (localErrors.length > 0) {
                setTableErrors(localErrors);
                return;
            }

            const formData = new FormData();
            formData.append("file", file);
            const response = await axios.post<ValidationResultDTO>(endpoints.carga_masiva_terminados_validar_sin_insumos, formData, {
                withCredentials: true,
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (!response.data.valid && response.data.errors?.length) {
                setTableErrors(response.data.errors);
                toast({
                    title: "Errores de validacion en el servidor",
                    description: `${response.data.errors.length} error(es) encontrado(s). Revise la tabla para corregir filas y columnas.`,
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
                return;
            }

            setTableErrors([]);
            setExcelIsValid(true);
            setLocalExcelData(parsedData);
            setExcelData?.(parsedData);
            toast({
                title: "Validacion exitosa",
                description: `Se validaron ${parsedData.length} fila(s) correctamente`,
                status: "success",
                duration: 5000,
                isClosable: true,
            });
        } catch (error) {
            setExcelIsValid(false);
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const data = error.response?.data as { errors?: ErrorRecord[] } | undefined;
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
                    setValidationErrors([error.message || "Error al validar el archivo Excel"]);
                }
            } else {
                setHttpErrorType(null);
                setTableErrors([]);
                setValidationErrors([error instanceof Error ? error.message : "Error al validar el archivo Excel"]);
            }
        } finally {
            setIsValidating(false);
        }
    };

    return (
        <Box p={4}>
            <VStack align="stretch" spacing={6}>
                <Text fontSize="lg" fontWeight="semibold">Subir y validar archivo Excel</Text>

                <Box p={5} borderWidth="1px" borderRadius="lg">
                    <VStack spacing={4} align="stretch">
                        <HStack spacing={4} alignItems="center">
                            <Button onClick={() => inputRef.current?.click()}>Subir Excel</Button>
                            <Input
                                type="file"
                                ref={inputRef}
                                style={{ display: "none" }}
                                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                onChange={handleFileChange}
                            />
                            <Icon as={excelFile ? FaFileCircleCheck : FaFileCircleQuestion} boxSize="2em" color={excelFile ? "green" : "orange.500"} />
                            {excelFile && <Text fontSize="sm" noOfLines={1} flex={1}>{excelFile.name}</Text>}
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
                            <AlertTitle>Sesion expirada</AlertTitle>
                            <AlertDescription>Su sesion ha expirado o no tiene permisos. Por favor inicie sesion nuevamente.</AlertDescription>
                        </Box>
                    </Alert>
                )}

                {httpErrorType === "server" && (
                    <Alert status="error">
                        <AlertIcon />
                        <Box>
                            <AlertTitle>Error interno del servidor</AlertTitle>
                            <AlertDescription>Intente mas tarde o contacte al administrador.</AlertDescription>
                        </Box>
                    </Alert>
                )}

                {tableErrors.length > 0 && httpErrorType === null && (
                    <Alert status="error">
                        <AlertIcon />
                        <Box width="100%">
                            <AlertTitle>Errores de validacion encontrados:</AlertTitle>
                            <AlertDescription as="div" mt={3}>
                                <TableContainer maxH="300px" overflowY="auto">
                                    <Table size="sm" variant="simple">
                                        <Thead>
                                            <Tr>
                                                <Th>Fila</Th>
                                                <Th>Columna</Th>
                                                <Th>Producto ID</Th>
                                                <Th>Descripcion del error</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {tableErrors.slice(0, 20).map((error, idx) => (
                                                <Tr key={idx}>
                                                    <Td>{error.rowNumber}</Td>
                                                    <Td>{error.columnName || "-"}</Td>
                                                    <Td>{error.productoId || "-"}</Td>
                                                    <Td>{error.message}</Td>
                                                </Tr>
                                            ))}
                                        </Tbody>
                                    </Table>
                                </TableContainer>
                                {tableErrors.length > 20 && <Text fontSize="sm" fontStyle="italic" mt={2}>... y {tableErrors.length - 20} errores mas</Text>}
                            </AlertDescription>
                        </Box>
                    </Alert>
                )}

                {validationErrors.length > 0 && tableErrors.length === 0 && httpErrorType === null && (
                    <Alert status="error">
                        <AlertIcon />
                        <Box>
                            <AlertTitle>Error de validacion</AlertTitle>
                            <AlertDescription>
                                <VStack align="stretch" spacing={1} mt={2}>
                                    {validationErrors.map((error, index) => <Text key={index} fontSize="sm">{error}</Text>)}
                                </VStack>
                            </AlertDescription>
                        </Box>
                    </Alert>
                )}

                {excelIsValid && excelData && (
                    <Alert status="success">
                        <AlertIcon />
                        <AlertDescription>Archivo validado correctamente. Se encontraron {excelData.length} terminado(s) para registrar.</AlertDescription>
                    </Alert>
                )}

                <Flex gap={4} justify="flex-end">
                    <Button variant="outline" onClick={() => setActiveStep(0)}>Atras</Button>
                    <Button colorScheme="blue" onClick={() => setActiveStep(2)} isDisabled={!excelIsValid}>Siguiente</Button>
                </Flex>
            </VStack>
        </Box>
    );
}
