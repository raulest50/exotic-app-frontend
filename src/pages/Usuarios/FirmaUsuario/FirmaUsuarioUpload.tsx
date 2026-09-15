import { Box, Field, Input, Text } from "@chakra-ui/react";
import { useRef } from "react";
import type { ChangeEvent } from "react";
import type { FirmaVisualSeleccionada } from "./firmaUsuario.types";
import { validarFirmaImagen } from "./firmaCanvasUtils";

interface FirmaUsuarioUploadProps {
    disabled?: boolean;
    onChange: (firma: FirmaVisualSeleccionada | null) => void;
    onError: (message: string) => void;
}

export default function FirmaUsuarioUpload({
    disabled = false,
    onChange,
    onError,
}: FirmaUsuarioUploadProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        onChange(null);
        if (!file) return;

        try {
            onChange(await validarFirmaImagen(file));
        } catch (error) {
            if (inputRef.current) inputRef.current.value = "";
            onError(error instanceof Error ? error.message : "No se pudo validar la firma visual.");
        }
    };

    return (
        <Box>
            <Field.Root disabled={disabled}>
                <Field.Label>Archivo PNG o JPG/JPEG</Field.Label>
                <Input
                    ref={inputRef}
                    type="file"
                    accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    p={1}
                />
                <Field.HelperText>
                    Máximo 1 MB y 2000 x 1000 px. La imagen se almacenará normalizada como PNG.
                </Field.HelperText>
            </Field.Root>
            <Text fontSize="xs" color="app.textMuted" mt={2}>
                Se recomienda una imagen horizontal con fondo transparente o blanco.
            </Text>
        </Box>
    );
}
