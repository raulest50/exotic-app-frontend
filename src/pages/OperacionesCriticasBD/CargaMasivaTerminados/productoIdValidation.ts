const PRODUCTO_ID_ALPHANUMERIC_REGEX = /^[A-Za-z0-9]+$/;

export function validateBulkProductoId(value: string, fieldName = "producto_id"): string | null {
    if (!value) {
        return `${fieldName} es obligatorio`;
    }

    if (value !== value.trim()) {
        return `${fieldName} no puede tener espacios al inicio o al final`;
    }

    if (!PRODUCTO_ID_ALPHANUMERIC_REGEX.test(value)) {
        return `${fieldName} solo puede contener letras y numeros, sin espacios ni caracteres especiales`;
    }

    if (value !== value.toUpperCase()) {
        return `${fieldName} debe usar letras mayusculas`;
    }

    return null;
}
