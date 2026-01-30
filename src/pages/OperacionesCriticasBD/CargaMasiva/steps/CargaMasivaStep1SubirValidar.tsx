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
import { useRef, useState } from "react";
import { FaFileCircleCheck, FaFileCircleQuestion } from "react-icons/fa6";
import ExcelJS from "exceljs";

interface ExcelRowData {
    productoid: string;
    nombre: string;
    costo: number;
    cantidad_consolidada: number;
    cantidad_a_sumar: number | string;
    nuevo_costo: number | string;
}

interface CargaMasivaStep1SubirValidarProps {
    setActiveStep: (step: number) => void;
    setExcelFile: (file: File | null) => void;
    setExcelData?: (data: ExcelRowData[] | null) => void;
}

const EXPECTED_HEADERS = ["productoid", "nombre", "costo", "cantidad_consolidada", "cantidad_a_sumar", "nuevo_costo"];

export default function CargaMasivaStep1SubirValidar({
    setActiveStep,
    setExcelFile,
    setExcelData,
}: CargaMasivaStep1SubirValidarProps) {
    const toast = useToast();
    const inputRef = useRef<HTMLInputElement>(null);
    const [excelFile, setLocalExcelFile] = useState<File | null>(null);
    const [excel_is_valid, setExcel_is_valid] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [excelData, setLocalExcelData] = useState<ExcelRowData[] | null>(null);

    const isValidExcelExtension = (file: File): boolean => {
        const lower = file.name.toLowerCase();
        return lower.endsWith(".xlsx") || lower.endsWith(".xls");
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log("[CargaMasiva Step1] handleFileChange invoked", {
            type: e.type,
            target: e.target,
            filesLength: e.target.files?.length ?? 0,
        });
        const file = e.target.files?.[0];
        if (file) {
            const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : "";
            console.log("[CargaMasiva Step1] file received", {
                name: file.name,
                size: file.size,
                type: file.type,
                extension: ext,
            });
            const extensionValid = isValidExcelExtension(file);
            console.log("[CargaMasiva Step1] isValidExcelExtension result", extensionValid, "file.name:", file.name);
            if (!extensionValid) {
                console.log("[CargaMasiva Step1] Extension invalid, showing toast");
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
            console.log("[CargaMasiva Step1] File accepted, updating state", file.name);
            setLocalExcelFile(file);
            setExcelFile(file);
            setExcel_is_valid(false);
            setValidationErrors([]);
            setLocalExcelData(null);
        } else {
            console.log("[CargaMasiva Step1] No file in event");
        }
    };

    const validateExcelFile = async (file: File) => {
        setIsValidating(true);
        setValidationErrors([]);
        setExcel_is_valid(false);

        try {
            const data = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(data);

            const worksheet = workbook.getWorksheet("Carga masiva") || workbook.worksheets[0];
            if (!worksheet) {
                throw new Error("No se encontró ninguna hoja en el archivo");
            }

            if (worksheet.rowCount < 2) {
                throw new Error("El archivo debe contener al menos una fila de encabezados y una fila de datos");
            }

            const errors: string[] = [];
            const parsedData: ExcelRowData[] = [];

            const headerRow = worksheet.getRow(1);
            const headers: string[] = [];
            for (let col = 1; col <= 6; col++) {
                const cellValue = headerRow.getCell(col).value;
                headers.push(cellValue?.toString()?.toLowerCase().trim() || "");
            }

            for (let i = 0; i < EXPECTED_HEADERS.length; i++) {
                if (headers[i] !== EXPECTED_HEADERS[i]) {
                    errors.push(
                        `Columna ${i + 1} esperada "${EXPECTED_HEADERS[i]}", encontrada "${headers[i] || "(vacía)"}"`
                    );
                }
            }

            if (errors.length > 0) {
                setValidationErrors(errors);
                setIsValidating(false);
                return;
            }

            worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                if (rowNumber === 1) return;

                const productoidCell = row.getCell(1);
                const nombreCell = row.getCell(2);
                const costoCell = row.getCell(3);
                const cantidadConsolidadaCell = row.getCell(4);
                const cantidadASumarCell = row.getCell(5);
                const nuevoCostoCell = row.getCell(6);

                const productoid = productoidCell.value?.toString()?.trim() || "";
                const nombre = nombreCell.value?.toString()?.trim() || "";
                const costo = typeof costoCell.value === "number" ? costoCell.value : parseFloat(costoCell.value?.toString() || "0");
                const cantidadConsolidada =
                    typeof cantidadConsolidadaCell.value === "number"
                        ? cantidadConsolidadaCell.value
                        : parseFloat(cantidadConsolidadaCell.value?.toString() || "0");

                let cantidadASumar: number | string = "";
                if (cantidadASumarCell.value !== null && cantidadASumarCell.value !== undefined) {
                    if (typeof cantidadASumarCell.value === "number") {
                        cantidadASumar = cantidadASumarCell.value;
                    } else {
                        const strValue = cantidadASumarCell.value.toString().trim();
                        cantidadASumar = strValue === "" ? "" : parseFloat(strValue) || "";
                    }
                }

                let nuevoCosto: number | string = "";
                if (nuevoCostoCell.value !== null && nuevoCostoCell.value !== undefined) {
                    if (typeof nuevoCostoCell.value === "number") {
                        nuevoCosto = nuevoCostoCell.value;
                    } else {
                        const strValue = nuevoCostoCell.value.toString().trim();
                        nuevoCosto = strValue === "" ? "" : parseFloat(strValue) || "";
                    }
                }

                if (!productoid) {
                    errors.push(`Fila ${rowNumber}: productoid está vacío`);
                    return;
                }

                if (cantidadASumar === "") {
                    errors.push(`Fila ${rowNumber}: cantidad_a_sumar está vacío (debe tener un valor)`);
                    return;
                }

                if (nuevoCosto === "") {
                    errors.push(`Fila ${rowNumber}: nuevo_costo está vacío (debe tener un valor)`);
                    return;
                }

                if (typeof cantidadASumar !== "number" || isNaN(cantidadASumar)) {
                    errors.push(`Fila ${rowNumber}: cantidad_a_sumar tiene un valor inválido (debe ser un número)`);
                    return;
                }

                const cantidadValida = cantidadASumar >= 0 || cantidadASumar === -1 || cantidadASumar === -7;
                if (!cantidadValida) {
                    errors.push(`Fila ${rowNumber}: cantidad_a_sumar inválido (solo se permiten números positivos, -1 o -7)`);
                    return;
                }

                if (typeof nuevoCosto !== "number" || isNaN(nuevoCosto) || nuevoCosto < 0) {
                    errors.push(`Fila ${rowNumber}: nuevo_costo tiene un valor inválido (debe ser un número >= 0)`);
                    return;
                }

                parsedData.push({
                    productoid,
                    nombre,
                    costo,
                    cantidad_consolidada: cantidadConsolidada,
                    cantidad_a_sumar: cantidadASumar,
                    nuevo_costo: nuevoCosto,
                });
            });

            if (errors.length > 0) {
                setValidationErrors(errors);
                setExcel_is_valid(false);
            } else {
                setValidationErrors([]);
                setExcel_is_valid(true);
                setLocalExcelData(parsedData);
                if (setExcelData) {
                    setExcelData(parsedData);
                }
                toast({
                    title: "Validación exitosa",
                    description: `Se validaron ${parsedData.length} filas correctamente`,
                    status: "success",
                    duration: 5000,
                    isClosable: true,
                });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Error al validar el archivo Excel";
            setValidationErrors([message]);
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
                            <Button
                                onClick={() => {
                                    console.log("[CargaMasiva Step1] Subir Excel clicked, inputRef.current:", inputRef.current != null);
                                    inputRef.current?.click();
                                }}
                            >
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

                {validationErrors.length > 0 && (
                    <Alert status="error">
                        <AlertIcon />
                        <Box>
                            <AlertTitle>Errores de validación encontrados:</AlertTitle>
                            <AlertDescription>
                                <VStack align="stretch" spacing={1} mt={2}>
                                    {validationErrors.slice(0, 10).map((error, index) => (
                                        <Text key={index} fontSize="sm">
                                            {error}
                                        </Text>
                                    ))}
                                    {validationErrors.length > 10 && (
                                        <Text fontSize="sm" fontStyle="italic">
                                            ... y {validationErrors.length - 10} errores más
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
                            Archivo validado correctamente. Se encontraron {excelData.length} materiales para actualizar.
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
