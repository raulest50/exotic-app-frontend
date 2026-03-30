import {
    Alert,
    AlertDescription,
    AlertIcon,
    AlertTitle,
    Box,
    Button,
    Flex,
    Heading,
    HStack,
    Icon,
    Input,
    Text,
    useToast,
    VStack,
} from "@chakra-ui/react";
import { ArrowBackIcon, ArrowForwardIcon } from "@chakra-ui/icons";
import { FaFileCircleCheck, FaFileCircleQuestion } from "react-icons/fa6";
import ExcelJS from "exceljs";
import { useRef, useState } from "react";
import { IngresoTerminadoValidado } from "./types";

interface Props {
    setActiveStep: (step: number) => void;
    setIngresosValidados: (ingresos: IngresoTerminadoValidado[]) => void;
}

const EXPECTED_HEADERS = [
    "lote_asignado",
    "orden_id",
    "producto_id",
    "producto_nombre",
    "categoria_nombre",
    "cantidad_esperada",
    "cantidad_ingresada",
    "fecha_vencimiento",
];

const SHEET_NAME = "Ingreso Producto Terminado";

export default function IngresoTerminadosStep1_SubirValidar({
    setActiveStep,
    setIngresosValidados,
}: Props) {
    const toast = useToast();
    const inputRef = useRef<HTMLInputElement>(null);

    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [excelIsValid, setExcelIsValid] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [parsedData, setParsedData] = useState<IngresoTerminadoValidado[]>([]);

    const isValidExcelExtension = (file: File): boolean => {
        const lower = file.name.toLowerCase();
        return lower.endsWith(".xlsx");
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!isValidExcelExtension(file)) {
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
            setExcelFile(file);
            setExcelIsValid(false);
            setValidationErrors([]);
            setParsedData([]);
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

    const getCellDate = (row: ExcelJS.Row, col: number): string => {
        const cell = row.getCell(col);
        const v = cell?.value;
        if (v == null) return "";

        // Si es un objeto Date de JavaScript
        if (v instanceof Date) {
            const year = v.getFullYear();
            const month = String(v.getMonth() + 1).padStart(2, "0");
            const day = String(v.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        }

        // Si es un string, intentar parsearlo
        const str = String(v).trim();
        // Formato YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            return str;
        }
        // Formato DD/MM/YYYY
        const match = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (match) {
            return `${match[3]}-${match[2]}-${match[1]}`;
        }

        return str;
    };

    const isValidDate = (dateStr: string): boolean => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
        const date = new Date(dateStr);
        return !isNaN(date.getTime());
    };

    const isFutureDate = (dateStr: string): boolean => {
        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date > today;
    };

    const validateExcelFile = async (file: File) => {
        setIsValidating(true);
        setValidationErrors([]);
        setExcelIsValid(false);
        setParsedData([]);

        try {
            const data = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(data);

            // Buscar la hoja por nombre o usar la primera
            let worksheet = workbook.getWorksheet(SHEET_NAME);
            if (!worksheet) {
                worksheet = workbook.worksheets[0];
            }

            if (!worksheet) {
                setValidationErrors(["No se encontro ninguna hoja en el archivo"]);
                setIsValidating(false);
                return;
            }

            if ((worksheet.rowCount ?? 0) < 2) {
                setValidationErrors(["El archivo debe contener al menos una fila de encabezados y una fila de datos"]);
                setIsValidating(false);
                return;
            }

            const errors: string[] = [];
            const validatedRows: IngresoTerminadoValidado[] = [];

            // Validar headers
            const headerRow = worksheet.getRow(1);
            for (let c = 0; c < EXPECTED_HEADERS.length; c++) {
                const expected = EXPECTED_HEADERS[c];
                const actual = getCellStr(headerRow, c + 1).toLowerCase();
                if (actual !== expected.toLowerCase()) {
                    errors.push(`Columna ${c + 1} esperada "${expected}", encontrada "${actual || "(vacia)"}"`);
                }
            }

            if (errors.length > 0) {
                setValidationErrors(errors);
                setIsValidating(false);
                return;
            }

            // Validar cada fila de datos
            worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                if (rowNumber === 1) return; // Saltar header

                const loteAsignado = getCellStr(row, 1);
                const ordenId = getCellNum(row, 2);
                const productoId = getCellStr(row, 3);
                const productoNombre = getCellStr(row, 4);
                const categoriaNombre = getCellStr(row, 5);
                const cantidadEsperada = getCellNum(row, 6);
                const cantidadIngresada = getCellNum(row, 7);
                const fechaVencimiento = getCellDate(row, 8);

                // Validar campos obligatorios de referencia
                if (!loteAsignado) {
                    errors.push(`Fila ${rowNumber}: lote_asignado esta vacio`);
                    return;
                }
                if (!ordenId || ordenId <= 0) {
                    errors.push(`Fila ${rowNumber} (${loteAsignado}): orden_id invalido`);
                    return;
                }

                // Validar cantidad_ingresada
                if (!cantidadIngresada || cantidadIngresada < 1) {
                    errors.push(`Fila ${rowNumber} (${loteAsignado}): cantidad_ingresada debe ser un entero >= 1`);
                    return;
                }
                if (!Number.isInteger(cantidadIngresada)) {
                    errors.push(`Fila ${rowNumber} (${loteAsignado}): cantidad_ingresada debe ser un numero entero`);
                    return;
                }

                // Validar rango ±20%
                const minAllowed = cantidadEsperada * 0.8;
                const maxAllowed = cantidadEsperada * 1.2;
                if (cantidadIngresada < minAllowed || cantidadIngresada > maxAllowed) {
                    errors.push(
                        `Fila ${rowNumber} (${loteAsignado}): cantidad_ingresada (${cantidadIngresada}) fuera del rango permitido (${Math.ceil(minAllowed)}-${Math.floor(maxAllowed)})`
                    );
                    return;
                }

                // Validar fecha_vencimiento
                if (!fechaVencimiento) {
                    errors.push(`Fila ${rowNumber} (${loteAsignado}): fecha_vencimiento esta vacia`);
                    return;
                }
                if (!isValidDate(fechaVencimiento)) {
                    errors.push(`Fila ${rowNumber} (${loteAsignado}): fecha_vencimiento debe ser formato YYYY-MM-DD`);
                    return;
                }
                if (!isFutureDate(fechaVencimiento)) {
                    errors.push(`Fila ${rowNumber} (${loteAsignado}): fecha_vencimiento debe ser posterior a hoy`);
                    return;
                }

                // Calcular diferencia porcentual
                const diferenciaPorcentaje = ((cantidadIngresada - cantidadEsperada) / cantidadEsperada) * 100;

                validatedRows.push({
                    ordenId,
                    loteAsignado,
                    productoId,
                    productoNombre,
                    categoriaNombre,
                    cantidadEsperada,
                    cantidadIngresada,
                    fechaVencimiento,
                    diferenciaPorcentaje,
                });
            });

            if (errors.length > 0) {
                setValidationErrors(errors);
                setIsValidating(false);
                return;
            }

            if (validatedRows.length === 0) {
                setValidationErrors(["No se encontraron filas de datos validas en el archivo"]);
                setIsValidating(false);
                return;
            }

            // Validacion exitosa
            setParsedData(validatedRows);
            setIngresosValidados(validatedRows);
            setExcelIsValid(true);

            toast({
                title: "Validacion exitosa",
                description: `Se validaron ${validatedRows.length} orden(es) correctamente`,
                status: "success",
                duration: 5000,
                isClosable: true,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Error al validar el archivo Excel";
            setValidationErrors([message]);
            toast({
                title: "Error de validacion",
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
        <Box>
            <Heading size="md" mb={4}>Subir y Validar Excel</Heading>
            <Text fontSize="sm" color="gray.500" mb={5}>
                Suba el archivo Excel completado con las cantidades reales de producto terminado.
            </Text>

            <VStack align="stretch" spacing={5}>
                {/* Seccion de subida */}
                <Box p={5} borderWidth="1px" borderRadius="lg">
                    <VStack spacing={4} align="stretch">
                        <HStack spacing={4} alignItems="center">
                            <Button onClick={() => inputRef.current?.click()}>
                                Seleccionar Excel
                            </Button>
                            <Input
                                type="file"
                                ref={inputRef}
                                style={{ display: "none" }}
                                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                onChange={handleFileChange}
                            />
                            <Icon
                                as={excelFile ? FaFileCircleCheck : FaFileCircleQuestion}
                                boxSize="2em"
                                color={excelFile ? "green.500" : "orange.500"}
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

                {/* Errores de validacion */}
                {validationErrors.length > 0 && (
                    <Alert status="error" borderRadius="md">
                        <AlertIcon />
                        <Box>
                            <AlertTitle>Errores de validacion encontrados:</AlertTitle>
                            <AlertDescription>
                                <VStack align="stretch" spacing={1} mt={2}>
                                    {validationErrors.slice(0, 15).map((error, index) => (
                                        <Text key={index} fontSize="sm">
                                            {error}
                                        </Text>
                                    ))}
                                    {validationErrors.length > 15 && (
                                        <Text fontSize="sm" fontStyle="italic">
                                            ... y {validationErrors.length - 15} errores mas
                                        </Text>
                                    )}
                                </VStack>
                            </AlertDescription>
                        </Box>
                    </Alert>
                )}

                {/* Mensaje de exito */}
                {excelIsValid && parsedData.length > 0 && (
                    <Alert status="success" borderRadius="md">
                        <AlertIcon />
                        <AlertDescription>
                            Archivo validado correctamente. Se encontraron <strong>{parsedData.length}</strong> orden(es)
                            de produccion para registrar ingreso.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Botones de navegacion */}
                <Flex gap={4} justify="space-between">
                    <Button
                        leftIcon={<ArrowBackIcon />}
                        variant="outline"
                        onClick={() => setActiveStep(0)}
                    >
                        Atras
                    </Button>
                    <Button
                        rightIcon={<ArrowForwardIcon />}
                        colorScheme="blue"
                        onClick={() => setActiveStep(2)}
                        isDisabled={!excelIsValid}
                    >
                        Siguiente
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
