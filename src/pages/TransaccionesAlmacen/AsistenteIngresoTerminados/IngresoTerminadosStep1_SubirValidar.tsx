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
    SimpleGrid,
    Stat,
    StatLabel,
    StatNumber,
    Text,
    useToast,
    VStack,
} from "@chakra-ui/react";
import { ArrowBackIcon, ArrowForwardIcon } from "@chakra-ui/icons";
import { FaFileCircleCheck, FaFileCircleQuestion } from "react-icons/fa6";
import ExcelJS from "exceljs";
import { ChangeEvent, useRef, useState } from "react";
import { IngresoTerminadoValidado } from "./types";

interface Props {
    fechaReporte: string;
    setActiveStep: (step: number) => void;
    setIngresosValidados: (ingresos: IngresoTerminadoValidado[]) => void;
}

const EXPECTED_HEADERS = [
    "producto_id",
    "producto_nombre",
    "categoria_nombre",
    "cantidad_producida",
];

const SHEET_NAME = "Produccion Diaria PT";
const MAX_VISIBLE_ERRORS = 15;

const numberFormatter = new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
});

function formatNumber(value: number): string {
    return numberFormatter.format(value);
}

function formatDateDisplay(isoDate: string): string {
    if (!isoDate) return "-";
    const [year, month, day] = isoDate.split("-");
    return `${day}/${month}/${year}`;
}

function buildLoteFicticio(fechaReporte: string, sequence: number): string {
    return `FICTICIO-PT-${fechaReporte.replace(/-/g, "")}-${String(sequence).padStart(4, "0")}`;
}

function isFormulaValue(value: ExcelJS.CellValue): boolean {
    return value != null && typeof value === "object" && "formula" in value;
}

function getCellText(cell: ExcelJS.Cell): string {
    const value = cell.value;
    if (value == null || isFormulaValue(value) || typeof value === "object") return "";
    return String(value).trim();
}

function readRequiredText(
    row: ExcelJS.Row,
    col: number,
    fieldName: string,
    rowNumber: number,
    errors: string[]
): string | null {
    const cell = row.getCell(col);
    const value = cell.value;

    if (isFormulaValue(value)) {
        errors.push(`Fila ${rowNumber}: ${fieldName} no puede ser una formula`);
        return null;
    }
    if (value == null || String(value).trim() === "") {
        errors.push(`Fila ${rowNumber}: ${fieldName} esta vacio`);
        return null;
    }
    if (typeof value === "object" || typeof value === "boolean") {
        errors.push(`Fila ${rowNumber}: ${fieldName} tiene un valor no permitido`);
        return null;
    }

    return String(value).trim();
}

function readCantidadProducida(
    row: ExcelJS.Row,
    rowNumber: number,
    productoId: string,
    errors: string[]
): number | null {
    const cell = row.getCell(4);
    const value = cell.value;

    if (value == null) return 0;

    if (isFormulaValue(value)) {
        errors.push(`Fila ${rowNumber} (${productoId}): cantidad_producida no puede ser una formula`);
        return null;
    }

    if (typeof value === "number") {
        if (!Number.isFinite(value)) {
            errors.push(`Fila ${rowNumber} (${productoId}): cantidad_producida no es un numero valido`);
            return null;
        }
        if (value < 0) {
            errors.push(`Fila ${rowNumber} (${productoId}): cantidad_producida no puede ser negativa`);
            return null;
        }
        if (!Number.isInteger(value)) {
            errors.push(`Fila ${rowNumber} (${productoId}): cantidad_producida debe ser un numero entero`);
            return null;
        }
        return value;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return 0;
        if (!/^\d+$/.test(trimmed)) {
            errors.push(`Fila ${rowNumber} (${productoId}): cantidad_producida debe ser un entero mayor o igual a cero`);
            return null;
        }
        return Number(trimmed);
    }

    errors.push(`Fila ${rowNumber} (${productoId}): cantidad_producida tiene un valor no permitido`);
    return null;
}

export default function IngresoTerminadosStep1_SubirValidar({
    fechaReporte,
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

    const totalUnidades = parsedData.reduce((acc, item) => acc + item.cantidadProducida, 0);
    const referenciasProducidas = parsedData.filter((item) => item.cantidadProducida > 0).length;
    const referenciasSinProduccion = parsedData.length - referenciasProducidas;

    const isValidExcelExtension = (file: File): boolean => {
        const lower = file.name.toLowerCase();
        return lower.endsWith(".xlsx");
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!isValidExcelExtension(file)) {
                toast({
                    title: "Tipo de archivo no permitido",
                    description: "Solo se permiten archivos Excel (.xlsx)",
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
                event.target.value = "";
                return;
            }
            setExcelFile(file);
            setExcelIsValid(false);
            setValidationErrors([]);
            setParsedData([]);
            setIngresosValidados([]);
        }
        event.target.value = "";
    };

    const validateExcelFile = async (file: File) => {
        if (!fechaReporte) {
            setValidationErrors(["Debe seleccionar la fecha del reporte antes de validar"]);
            return;
        }

        setIsValidating(true);
        setValidationErrors([]);
        setExcelIsValid(false);
        setParsedData([]);
        setIngresosValidados([]);

        try {
            const data = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(data);

            let worksheet = workbook.getWorksheet(SHEET_NAME);
            if (!worksheet) {
                worksheet = workbook.worksheets[0];
            }

            if (!worksheet) {
                setValidationErrors(["No se encontro ninguna hoja en el archivo"]);
                return;
            }

            if ((worksheet.rowCount ?? 0) < 2) {
                setValidationErrors(["El archivo debe contener encabezados y al menos una fila de producto terminado"]);
                return;
            }

            const errors: string[] = [];
            const validatedRows: IngresoTerminadoValidado[] = [];

            const headerRow = worksheet.getRow(1);
            for (let col = 0; col < EXPECTED_HEADERS.length; col++) {
                const expected = EXPECTED_HEADERS[col];
                const actual = getCellText(headerRow.getCell(col + 1)).toLowerCase();
                if (actual !== expected.toLowerCase()) {
                    errors.push(`Columna ${col + 1} esperada "${expected}", encontrada "${actual || "(vacia)"}"`);
                }
            }
            for (let col = EXPECTED_HEADERS.length + 1; col <= headerRow.cellCount; col++) {
                const extraCell = headerRow.getCell(col);
                const extraHeader = getCellText(extraCell);
                if (extraHeader || extraCell.value != null) {
                    errors.push(`Columna ${col} no esperada "${extraHeader || "(valor no permitido)"}". La plantilla solo debe tener 4 columnas`);
                }
            }

            if (errors.length > 0) {
                setValidationErrors(errors);
                return;
            }

            worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                if (rowNumber === 1) return;

                const productoId = readRequiredText(row, 1, "producto_id", rowNumber, errors);
                const productoNombre = readRequiredText(row, 2, "producto_nombre", rowNumber, errors);
                const categoriaNombre = readRequiredText(row, 3, "categoria_nombre", rowNumber, errors);

                if (!productoId || !productoNombre || !categoriaNombre) {
                    return;
                }

                const cantidadProducida = readCantidadProducida(row, rowNumber, productoId, errors);
                if (cantidadProducida == null) {
                    return;
                }

                validatedRows.push({
                    productoId,
                    productoNombre,
                    categoriaNombre,
                    cantidadProducida,
                    fechaReporte,
                    loteFicticio: buildLoteFicticio(fechaReporte, validatedRows.length + 1),
                });
            });

            if (errors.length > 0) {
                setValidationErrors(errors);
                return;
            }

            if (validatedRows.length === 0) {
                setValidationErrors(["No se encontraron productos terminados en el archivo"]);
                return;
            }

            const referenciasProducidasValidadas = validatedRows.filter(
                (item) => item.cantidadProducida > 0
            ).length;

            setParsedData(validatedRows);
            setIngresosValidados(validatedRows);
            setExcelIsValid(true);

            toast({
                title: "Validacion exitosa",
                description: `Plantilla valida: ${referenciasProducidasValidadas} referencia(s) con produccion.`,
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
            <Text fontSize="sm" color="app.textSubtle" mb={5}>
                Suba la plantilla completada para el reporte del {formatDateDisplay(fechaReporte)}.
            </Text>

            <VStack align="stretch" spacing={5}>
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
                            isDisabled={!excelFile || isValidating || !fechaReporte}
                            isLoading={isValidating}
                            loadingText="Validando..."
                        >
                            Validar Excel
                        </Button>
                    </VStack>
                </Box>

                {validationErrors.length > 0 && (
                    <Alert status="error" borderRadius="md">
                        <AlertIcon />
                        <Box>
                            <AlertTitle>Errores de validacion encontrados:</AlertTitle>
                            <AlertDescription>
                                <VStack align="stretch" spacing={1} mt={2}>
                                    {validationErrors.slice(0, MAX_VISIBLE_ERRORS).map((error, index) => (
                                        <Text key={index} fontSize="sm">
                                            {error}
                                        </Text>
                                    ))}
                                    {validationErrors.length > MAX_VISIBLE_ERRORS && (
                                        <Text fontSize="sm" fontStyle="italic">
                                            ... y {validationErrors.length - MAX_VISIBLE_ERRORS} errores mas
                                        </Text>
                                    )}
                                </VStack>
                            </AlertDescription>
                        </Box>
                    </Alert>
                )}

                {excelIsValid && parsedData.length > 0 && (
                    <Alert status="success" borderRadius="md">
                        <AlertIcon />
                        <AlertDescription>
                            Archivo validado correctamente. Las cantidades vacias fueron interpretadas como cero.
                        </AlertDescription>
                    </Alert>
                )}

                {excelIsValid && parsedData.length > 0 && (
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                        <Box p={4} borderWidth="1px" borderRadius="md">
                            <Stat>
                                <StatLabel color="app.textSubtle">Referencias producidas</StatLabel>
                                <StatNumber color="teal.600">{formatNumber(referenciasProducidas)}</StatNumber>
                            </Stat>
                        </Box>
                        <Box p={4} borderWidth="1px" borderRadius="md">
                            <Stat>
                                <StatLabel color="app.textSubtle">Sin produccion</StatLabel>
                                <StatNumber color="orange.600">{formatNumber(referenciasSinProduccion)}</StatNumber>
                            </Stat>
                        </Box>
                        <Box p={4} borderWidth="1px" borderRadius="md">
                            <Stat>
                                <StatLabel color="app.textSubtle">Unidades reportadas</StatLabel>
                                <StatNumber color="green.600">{formatNumber(totalUnidades)}</StatNumber>
                            </Stat>
                        </Box>
                    </SimpleGrid>
                )}

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
