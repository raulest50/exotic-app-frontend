export type ProductIdValidationError = "required" | "alphanumeric" | "uppercase";

const PRODUCT_ID_ALPHANUMERIC_REGEX = /^[a-zA-Z0-9]+$/;

export function normalizeProductId(value: string): string {
    return value.toUpperCase();
}

export function validateProductId(value: string): ProductIdValidationError | null {
    if (!value.trim()) {
        return "required";
    }

    if (!PRODUCT_ID_ALPHANUMERIC_REGEX.test(value)) {
        return "alphanumeric";
    }

    if (value !== normalizeProductId(value)) {
        return "uppercase";
    }

    return null;
}
