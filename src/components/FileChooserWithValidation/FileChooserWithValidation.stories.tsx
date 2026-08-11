import { Box } from "@chakra-ui/react";
import FileChooserWithValidation from "./FileChooserWithValidation";

export const Default = () => (
    <Box p={6} maxW="800px">
        <FileChooserWithValidation
            allowedExtensions={[".xls", ".xlsx", ".xlsm", ".xlsb"]}
            validateFile={() => true}
            instructionText="Seleccione un archivo de Excel para continuar."
            onNext={() => alert("Siguiente clicked")}
        />
    </Box>
);

export const ValidationFails = () => (
    <Box p={6} maxW="800px">
        <FileChooserWithValidation
            allowedExtensions={[".xls", ".xlsx", ".xlsm", ".xlsb"]}
            validateFile={() => ({
                valid: false,
                errors: [
                    'Columna 11: se esperaba "CODIGO", se encontró "(vacía)"',
                    'Columna 13: se esperaba "CANTIDAD VENDIDA", se encontró "QTY"',
                    'Columna 16: se esperaba "VALOR TOTAL", se encontró "TOTAL"',
                ],
            })}
            instructionText="En esta historia, la validación siempre falla con errores de ejemplo."
        />
    </Box>
);

export const AsyncValidation = () => (
    <Box p={6} maxW="800px">
        <FileChooserWithValidation
            allowedExtensions={[".pdf", ".xls", ".xlsx"]}
            validateFile={async () => {
                await new Promise((r) => setTimeout(r, 1500));
                return true;
            }}
            instructionText="Simulación de validación asíncrona (1.5s de espera)."
            onNext={() => alert("Siguiente clicked")}
        />
    </Box>
);

export const WithoutNextButton = () => (
    <Box p={6} maxW="800px">
        <FileChooserWithValidation
            allowedExtensions={[".csv", ".xls", ".xlsx"]}
            validateFile={() => true}
            instructionText="Componente sin botón Siguiente."
            showNextButton={false}
            onValidationSuccess={(file) => alert(`Archivo válido: ${file.name}`)}
        />
    </Box>
);
