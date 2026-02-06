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
} from "@chakra-ui/react";
import { useRef, useState, useMemo } from "react";
import { FaFileCircleCheck, FaFileCircleQuestion } from "react-icons/fa6";
import ExcelJS from "exceljs";
import axios from "axios";
import EndPointsURL from "../../../../api/EndPointsURL";

interface CargaMasivaMaterialesStep1SubirValidarProps {
    setActiveStep: (step: number) => void;
    setExcelFile: (file: File | null) => void;
    setExcelData?: (data: unknown[] | null) => void;
}

const EXPECTED_HEADERS = [
    "producto_id", "nombre", "observaciones", "costo", "iva_percentual", "tipo_unidades",
    "cantidad_unidad", "stock_minimo", "ficha_tecnica_url", "tipo_material", "punto_reorden",
];

const VALID_IVA = [0, 5, 19];
const VALID_TIPO_UNIDADES = ["L", "KG", "U"];
const VALID_TIPO_MATERIAL = [1, 2];

interface ValidationResultDTO {
    valid: boolean;
    errors: { rowNumber: number; productoId: string; message: string }[];
    rowCount: number;
}

export default function CargaMasivaMaterialesStep1SubirValidar({
    setActiveStep,
    setExcelFile,
    setExcelData,
}: CargaMasivaMaterialesStep1SubirValidarProps) {
    const toast = useToast();
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const inputRef = useRef<HTMLInputElement>(null);
    const [excelFile, setLocalExcelFile] = useState<File | null>(null);
    const [excel_is_valid, setExcel_is_valid] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [backendErrors, setBackendErrors] = useState<{ rowNumber: number; productoId: string; message: string }[]>([]);
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
            setBackendErrors([]);
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
        setBackendErrors([]);
        setExcel_is_valid(false);

        try {
            const data = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(data);

            const worksheet = workbook.getWorksheet("Carga masiva materiales") || workbook.worksheets[0];
            if (!worksheet) {
                setValidationErrors(["No se encontró ninguna hoja en el archivo"]);
                setIsValidating(false);
                return;
            }

            if ((worksheet.rowCount ?? 0) < 2) {
                setValidationErrors(["El archivo debe contener al menos una fila de encabezados y una fila de datos"]);
                setIsValidating(false);
                return;
            }

            const errors: string[] = [];
            const parsedData: unknown[] = [];
            const headerRow = worksheet.getRow(1);
            for (let c = 0; c < EXPECTED_HEADERS.length; c++) {
                const expected = EXPECTED_HEADERS[c];
                const actual = getCellStr(headerRow, c + 1).toLowerCase();
                if (actual !== expected.toLowerCase()) {
                    errors.push(`Columna ${c + 1} esperada "${expected}", encontrada "${actual || "(vacía)"}"`);
                }
            }
            if (errors.length > 0) {
                setValidationErrors(errors);
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
                const tipo_material = getCellNum(row, 10);

                if (!producto_id) {
                    errors.push(`Fila ${rowNumber}: producto_id está vacío`);
                    return;
                }
                if (seenProductoIds.has(producto_id)) {
                    errors.push(`Fila ${rowNumber}: producto_id "${producto_id}" duplicado en el archivo`);
                    return;
                }
                seenProductoIds.add(producto_id);

                if (!nombre) errors.push(`Fila ${rowNumber}: nombre es obligatorio`);
                if (costo < 0) errors.push(`Fila ${rowNumber}: costo debe ser >= 0`);
                if (!VALID_IVA.includes(iva_percentual)) errors.push(`Fila ${rowNumber}: iva_percentual debe ser 0, 5 o 19`);
                if (!tipo_unidades || !VALID_TIPO_UNIDADES.includes(tipo_unidades)) {
                    errors.push(`Fila ${rowNumber}: tipo_unidades debe ser L, KG o U`);
                }
                if (cantidad_unidad < 0) errors.push(`Fila ${rowNumber}: cantidad_unidad debe ser >= 0`);
                if (!VALID_TIPO_MATERIAL.includes(tipo_material)) {
                    errors.push(`Fila ${rowNumber}: tipo_material debe ser 1 (Materia Prima) o 2 (Material de Empaque)`);
                }
                const stock_minimo = getCellNum(row, 8);
                if (stock_minimo < 0) errors.push(`Fila ${rowNumber}: stock_minimo debe ser >= 0`);

                parsedData.push({
                    producto_id,
                    nombre,
                    observaciones: getCellStr(row, 3),
                    costo,
                    iva_percentual,
                    tipo_unidades,
                    cantidad_unidad,
                    stock_minimo,
                    ficha_tecnica_url: getCellStr(row, 9),
                    tipo_material,
                    punto_reorden: getCellNum(row, 11),
                });
            });

            if (errors.length > 0) {
                setValidationErrors(errors);
                setIsValidating(false);
                return;
            }

            const formData = new FormData();
            formData.append("file", file);
            const response = await axios.post<ValidationResultDTO>(endpoints.carga_masiva_materiales_validar, formData, {
                withCredentials: true,
                headers: { "Content-Type": "multipart/form-data" },
            });

            const result = response.data;
            if (!result.valid && result.errors && result.errors.length > 0) {
                setBackendErrors(result.errors);
                setValidationErrors(result.errors.map((e) => `Fila ${e.rowNumber} (${e.productoId}): ${e.message}`));
                setExcel_is_valid(false);
                toast({
                    title: "Errores de validación en el servidor",
                    description: `${result.errors.length} error(es) encontrado(s)`,
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
            } else {
                setBackendErrors([]);
                setValidationErrors([]);
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
            const message = error instanceof Error ? error.message : "Error al validar el archivo Excel";
            if (axios.isAxiosError(error) && error.response?.data) {
                const data = error.response.data as { errors?: { rowNumber: number; productoId: string; message: string }[] };
                if (data.errors?.length) {
                    setBackendErrors(data.errors);
                    setValidationErrors(data.errors.map((e) => `Fila ${e.rowNumber} (${e.productoId}): ${e.message}`));
                } else {
                    setValidationErrors([message]);
                }
            } else {
                setValidationErrors([message]);
            }
            setExcel_is_valid(false);
            toast({
                title: "Error de validación",
                description: message,
                status: "error",
                duration: 5000,
                isClosable: true,
            });
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

                {(validationErrors.length > 0 || backendErrors.length > 0) && (
                    <Alert status="error">
                        <AlertIcon />
                        <Box>
                            <AlertTitle>Errores de validación encontrados:</AlertTitle>
                            <AlertDescription>
                                <VStack align="stretch" spacing={1} mt={2}>
                                    {validationErrors.slice(0, 15).map((error, index) => (
                                        <Text key={index} fontSize="sm">
                                            {error}
                                        </Text>
                                    ))}
                                    {validationErrors.length > 15 && (
                                        <Text fontSize="sm" fontStyle="italic">
                                            ... y {validationErrors.length - 15} errores más
                                        </Text>
                                    )}
                                </VStack>
                            </AlertDescription>
                        </Box>
                    </Alert>
                )}

                {excel_is_valid && excelData && (
                    <Alert status="success">
                        <AlertIcon />
                        <AlertDescription>
                            Archivo validado correctamente. Se encontraron {excelData.length} material(es) para registrar.
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
