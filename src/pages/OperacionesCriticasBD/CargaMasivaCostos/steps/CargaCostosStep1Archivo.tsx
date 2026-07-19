import {
    Alert,
    AlertDescription,
    AlertIcon,
    AlertTitle,
    Box,
    Button,
    FormControl,
    FormHelperText,
    FormLabel,
    Input,
    Text,
    Textarea,
    VStack,
} from "@chakra-ui/react";
import { ChangeEvent } from "react";
import { CargaCostosErrorFila } from "../types";

interface CargaCostosStep1ArchivoProps {
    file: File | null;
    fileInputKey: number;
    motivo: string;
    validationErrors: CargaCostosErrorFila[];
    busy: boolean;
    onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onMotivoChange: (value: string) => void;
    onPrepare: () => void;
}

export default function CargaCostosStep1Archivo({
    file,
    fileInputKey,
    motivo,
    validationErrors,
    busy,
    onFileChange,
    onMotivoChange,
    onPrepare,
}: CargaCostosStep1ArchivoProps) {
    return (
        <VStack align="stretch" spacing={5}>
            <Alert status="warning">
                <AlertIcon />
                <Box>
                    <AlertTitle>Actualizacion exclusiva de costos</AlertTitle>
                    <AlertDescription>
                        Se leen CODIGO, DESCRIPCION, NOMBRE PROVEEDOR y VLR SIN IVA UNIT.
                        No se modifican existencias, IVA, nombres ni proveedores.
                    </AlertDescription>
                </Box>
            </Alert>

            <FormControl isRequired>
                <FormLabel htmlFor="carga-costos-file">Informe de compras (.xlsx)</FormLabel>
                <Input
                    key={fileInputKey}
                    id="carga-costos-file"
                    type="file"
                    accept=".xlsx"
                    p={1}
                    onChange={onFileChange}
                />
                <FormHelperText>Maximo 10 MB y 5.000 materiales validos.</FormHelperText>
            </FormControl>

            <FormControl isRequired isInvalid={motivo.length > 500}>
                <FormLabel htmlFor="carga-costos-motivo">Motivo del cambio</FormLabel>
                <Textarea
                    id="carga-costos-motivo"
                    maxLength={500}
                    value={motivo}
                    onChange={(event) => onMotivoChange(event.target.value)}
                    placeholder="Ej. Actualizacion de costos segun informe de compras de julio"
                />
                <FormHelperText>{motivo.length}/500 caracteres. Quedara registrado en el historial.</FormHelperText>
            </FormControl>

            {validationErrors.length > 0 && (
                <Alert status="error" alignItems="flex-start">
                    <AlertIcon />
                    <Box w="full">
                        <AlertTitle>Corrija el archivo antes de continuar</AlertTitle>
                        <VStack as="ul" align="stretch" mt={2} spacing={1} maxH="260px" overflowY="auto">
                            {validationErrors.map((error, index) => (
                                <Text as="li" key={`${error.fila}-${error.codigo}-${error.campo}-${index}`} fontSize="sm">
                                    {error.fila > 0 ? `Fila ${error.fila}: ` : ""}
                                    {error.codigo ? `${error.codigo} - ` : ""}
                                    {error.campo ? `${error.campo}: ` : ""}
                                    {error.mensaje}
                                </Text>
                            ))}
                        </VStack>
                    </Box>
                </Alert>
            )}

            <Button
                colorScheme="blue"
                onClick={onPrepare}
                isLoading={busy}
                isDisabled={!file || !motivo.trim() || motivo.length > 500}
            >
                Validar y preparar
            </Button>
        </VStack>
    );
}
