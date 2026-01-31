import React, { useState, useEffect } from "react";
import { Input, InputProps, useColorModeValue } from "@chakra-ui/react";

export interface CustomDecimalInputProps extends Omit<InputProps, 'value' | 'onChange' | 'type'> {
    /**
     * Valor numérico actual (debe ser > min para ser válido)
     */
    value: number;
    /**
     * Callback que se ejecuta cuando el valor cambia y es válido (solo en blur)
     * @param newValue - Nuevo valor numérico válido
     */
    onChange: (newValue: number) => void;
    /**
     * Valor mínimo permitido (default: 0)
     */
    min?: number;
    /**
     * Número de decimales máximos permitidos (default: sin límite)
     */
    maxDecimals?: number;
    /**
     * Placeholder del input
     */
    placeholder?: string;
    /**
     * Si es true, permite valores vacíos temporalmente durante la edición
     * (default: true)
     */
    allowEmpty?: boolean;
}

/**
 * Input decimal con validación estricta y UX optimizada para cantidades.
 *
 * REGLA DE VALIDACIÓN: Solo se consideran válidos valores donde value > min.
 * Con min=0 (default), acepta únicamente números positivos (> 0). El valor 0
 * se interpreta como "vacío" (sin valor ingresado) y nunca se propaga via onChange.
 *
 * CASOS DE USO:
 * - Rendimiento teórico, cantidades a dispensar, cantidades a producir: min=0.
 * - Cualquier campo donde la cantidad debe ser estrictamente positiva.
 *
 * VENTAJAS UX (vs Input type="number" / NumberInput de Chakra):
 * - Permite borrar el campo completamente durante la edición.
 * - Permite escribir decimales empezando con punto (ej: ".32").
 * - Valida al perder el foco (onBlur), evitando bloqueos al teclear.
 * - Mantiene estados temporales inválidos durante la edición.
 * - inputMode="decimal" mejora el teclado en móviles.
 *
 * LIMITACIÓN: No permite confirmar explícitamente el valor del mínimo (ej: 0).
 * Para "cantidad a dispensar" esto es deseado: 0 = no ingresado; use el botón
 * Eliminar para quitar un lote en lugar de poner 0.
 */
const CustomDecimalInput: React.FC<CustomDecimalInputProps> = ({
    value,
    onChange,
    min = 0,
    maxDecimals,
    placeholder = "0.0000",
    allowEmpty = true,
    ...inputProps
}) => {
    // Estado local para el valor del input (permite strings vacíos y decimales parciales)
    const [inputValue, setInputValue] = useState<string>(
        value > min ? String(value) : ""
    );

    // Sincronizar con el valor del prop cuando cambia externamente
    useEffect(() => {
        if (value > min) {
            setInputValue(String(value));
        } else if (!allowEmpty) {
            setInputValue(String(min));
        } else {
            setInputValue("");
        }
    }, [value, min, allowEmpty]);

    // Función para validar y filtrar la entrada (solo números y punto decimal)
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;

        // Permitir campo vacío si allowEmpty es true
        if (allowEmpty && newValue === "") {
            setInputValue("");
            return;
        }

        // Permitir solo números, punto decimal y un solo punto
        const regex = /^[0-9]*\.?[0-9]*$/;
        if (regex.test(newValue)) {
            // Si hay límite de decimales, validar
            if (maxDecimals !== undefined) {
                const parts = newValue.split('.');
                if (parts.length === 2 && parts[1].length > maxDecimals) {
                    return; // No actualizar si excede el límite de decimales
                }
            }
            setInputValue(newValue);

            // Añadir esta sección para actualizar en tiempo real
            const numValue = parseFloat(newValue);
            if (Number.isFinite(numValue) && numValue > min) {
                onChange(numValue);
            }
        }
    };

    // Validar y actualizar el valor numérico cuando el campo pierde el foco
    const handleBlur = () => {
        const trimmed = inputValue.trim();

        // Si está vacío y allowEmpty es true, mantenerlo vacío
        if (allowEmpty && (trimmed === "" || trimmed === ".")) {
            setInputValue("");
            return;
        }

        // Si está vacío y allowEmpty es false, usar el mínimo
        if (!allowEmpty && (trimmed === "" || trimmed === ".")) {
            const finalValue = min;
            setInputValue(String(finalValue));
            onChange(finalValue);
            return;
        }

        const numValue = parseFloat(trimmed);

        // Si es un número válido y cumple con el mínimo
        if (Number.isFinite(numValue) && numValue > min) {
            onChange(numValue);
        } else if (numValue <= min) {
            // Si no cumple el mínimo, restaurar el último valor válido o el mínimo
            if (value > min) {
                setInputValue(String(value));
            } else {
                const finalValue = allowEmpty ? min : min;
                setInputValue(allowEmpty ? "" : String(finalValue));
                if (!allowEmpty) {
                    onChange(finalValue);
                }
            }
        } else {
            // Si no es válido, restaurar el último valor válido
            if (value > min) {
                setInputValue(String(value));
            } else {
                setInputValue(allowEmpty ? "" : String(min));
            }
        }
    };

    return (
        <Input
            type="text"
            inputMode="decimal"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            textAlign={inputProps.textAlign || "right"}
            {...inputProps}
        />
    );
};

export default CustomDecimalInput;













