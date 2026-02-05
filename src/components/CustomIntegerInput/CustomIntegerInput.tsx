import React, { useState, useEffect } from "react";
import { Input, InputProps } from "@chakra-ui/react";

export interface CustomIntegerInputProps extends Omit<InputProps, 'value' | 'onChange' | 'type'> {
    /**
     * Valor numérico actual (entero >= min)
     */
    value: number;
    /**
     * Callback que se ejecuta cuando el valor cambia y es válido
     * @param newValue - Nuevo valor entero válido
     */
    onChange: (newValue: number) => void;
    /**
     * Valor mínimo permitido (default: 0)
     */
    min?: number;
    /**
     * Placeholder del input
     */
    placeholder?: string;
    /**
     * Si es true, permite valores vacíos temporalmente durante la edición
     * (default: false)
     */
    allowEmpty?: boolean;
}

/**
 * Input de enteros con validación estricta.
 *
 * REGLA DE VALIDACIÓN: Solo dígitos, sin decimales. Valor válido cuando value >= min.
 * Permite 0 cuando min=0 (a diferencia de CustomDecimalInput que trata 0 como vacío).
 *
 * CASOS DE USO:
 * - Tamaño de lote, cantidades enteras, IDs.
 */
const CustomIntegerInput: React.FC<CustomIntegerInputProps> = ({
    value,
    onChange,
    min = 0,
    placeholder = "0",
    allowEmpty = false,
    ...inputProps
}) => {
    const [inputValue, setInputValue] = useState<string>(
        value >= min ? String(Math.floor(value)) : (allowEmpty ? "" : String(min))
    );

    useEffect(() => {
        if (value >= min) {
            setInputValue(String(Math.floor(value)));
        } else if (!allowEmpty) {
            setInputValue(String(min));
        } else {
            setInputValue("");
        }
    }, [value, min, allowEmpty]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;

        if (allowEmpty && newValue === "") {
            setInputValue("");
            return;
        }

        const regex = /^[0-9]*$/;
        if (regex.test(newValue)) {
            setInputValue(newValue);
            const numValue = parseInt(newValue, 10);
            if (Number.isFinite(numValue) && numValue >= min) {
                onChange(numValue);
            }
        }
    };

    const handleBlur = () => {
        const trimmed = inputValue.trim();

        if (allowEmpty && trimmed === "") {
            setInputValue("");
            return;
        }

        if (!allowEmpty && trimmed === "") {
            const finalValue = min;
            setInputValue(String(finalValue));
            onChange(finalValue);
            return;
        }

        const numValue = parseInt(trimmed, 10);

        if (Number.isFinite(numValue) && numValue >= min) {
            setInputValue(String(numValue));
            onChange(numValue);
        } else {
            if (value >= min) {
                setInputValue(String(value));
            } else {
                setInputValue(allowEmpty ? "" : String(min));
                if (!allowEmpty) {
                    onChange(min);
                }
            }
        }
    };

    return (
        <Input
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            textAlign={inputProps.textAlign || "right"}
            {...inputProps}
        />
    );
};

export default CustomIntegerInput;
