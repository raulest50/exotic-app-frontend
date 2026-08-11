import { Alert, Box, Button, Input, Text, Textarea, VStack, Field } from "@chakra-ui/react";
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
        <VStack align="stretch" gap={5}>
            <Alert.Root status="warning">
                <Alert.Indicator />
                <Box>
                    <Alert.Title>Actualizacion exclusiva de costos</Alert.Title>
                    <Alert.Description>
                        Se leen CODIGO, DESCRIPCION, NOMBRE PROVEEDOR y VLR SIN IVA UNIT.
                        No se modifican existencias, IVA, nombres ni proveedores.
                    </Alert.Description>
                </Box>
            </Alert.Root>

            <Field.Root required>
                <Field.Label htmlFor="carga-costos-file">Informe de compras (.xlsx)</Field.Label>
                <Input
                    key={fileInputKey}
                    id="carga-costos-file"
                    type="file"
                    accept=".xlsx"
                    p={1}
                    onChange={onFileChange}
                />
                <Field.HelperText>Maximo 10 MB y 5.000 materiales validos.</Field.HelperText>
            </Field.Root>

            <Field.Root required invalid={motivo.length > 500}>
                <Field.Label htmlFor="carga-costos-motivo">Motivo del cambio</Field.Label>
                <Textarea
                    id="carga-costos-motivo"
                    maxLength={500}
                    value={motivo}
                    onChange={(event) => onMotivoChange(event.target.value)}
                    placeholder="Ej. Actualizacion de costos segun informe de compras de julio"
                />
                <Field.HelperText>{motivo.length}/500 caracteres. Quedara registrado en el historial.</Field.HelperText>
            </Field.Root>

            {validationErrors.length > 0 && (
                <Alert.Root status="error" alignItems="flex-start">
                    <Alert.Indicator />
                    <Box w="full">
                        <Alert.Title>Corrija el archivo antes de continuar</Alert.Title>
                        <VStack as="ul" align="stretch" mt={2} gap={1} maxH="260px" overflowY="auto">
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
                </Alert.Root>
            )}

            <Button
                colorPalette="blue"
                onClick={onPrepare}
                loading={busy}
                disabled={!file || !motivo.trim() || motivo.length > 500}
            >
                Validar y preparar
            </Button>
        </VStack>
    );
}
