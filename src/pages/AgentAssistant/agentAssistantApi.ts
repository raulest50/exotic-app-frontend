import axios from "axios";
import EndPointsURL from "../../api/EndPointsURL";

export type AssistantStatus = {
    enabled: boolean;
    available: boolean;
    message: string;
    readOnly: true;
    connectionId: string;
};
export type AssistantHistoryMessage = { role: "user" | "assistant"; content: string };
export type AssistantProposal = { id: string; sql: string; expiresAt: string };
export type AssistantReply = { message: string; proposal?: AssistantProposal };
export type AssistantResult = {
    columns: string[];
    rows: (string | number | boolean | null)[][];
    truncated: boolean;
};
export type AssistantOperation = {
    id: string;
    state: "BACKING_UP" | "COMPLETE" | "FAILED";
    message: string;
    sql: string;
    result?: AssistantResult;
    backupId?: string;
};

export const ASSISTANT_MESSAGE_LIMIT = 2_000;
export const ASSISTANT_HISTORY_MESSAGE_LIMIT = 10; // Up to five user/assistant turns, without database rows.
export const ASSISTANT_HISTORY_CHARACTER_LIMIT = 14_000;
const HISTORY_ENTRY_CHARACTER_LIMIT = 4_000;
const baseUrl = () => `${EndPointsURL.getDomain()}/agent-assistant`;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown, limit = 32_000): value is string => typeof value === "string" && value.length <= limit;
const invalidResponse = () => new Error("El servidor devolvió una respuesta del asistente que no se pudo validar.");

function readStatus(value: unknown): AssistantStatus {
    if (!record(value) || typeof value.enabled !== "boolean" || typeof value.available !== "boolean"
        || value.readOnly !== true || !text(value.message)
        || !text(value.connectionId, 100) || !value.connectionId) {
        throw invalidResponse();
    }
    return { enabled: value.enabled, available: value.available, message: value.message,
        readOnly: true, connectionId: value.connectionId };
}

function readProposal(value: unknown): value is AssistantProposal {
    return record(value) && text(value.id, 200) && value.id.length > 0 && text(value.sql, 32_000)
        && text(value.expiresAt, 100) && Number.isFinite(Date.parse(value.expiresAt));
}

function readResult(value: unknown): value is AssistantResult {
    if (!record(value) || !Array.isArray(value.columns) || value.columns.length > 100
        || !value.columns.every((column) => text(column, 500))
        || !Array.isArray(value.rows) || value.rows.length > 1_000 || typeof value.truncated !== "boolean") return false;
    const columnCount = value.columns.length;
    return value.rows.every((row) => Array.isArray(row) && row.length === columnCount && row.every((cell) =>
        cell === null || typeof cell === "boolean" || (typeof cell === "number" && Number.isFinite(cell)) || text(cell, 32_000)));
}

function readOperation(value: unknown): AssistantOperation {
    if (!record(value) || !text(value.id, 200) || !value.id
        || !["BACKING_UP", "COMPLETE", "FAILED"].includes(String(value.state))
        || !text(value.message) || !text(value.sql, 32_000)
        || (value.result !== undefined && value.result !== null && !readResult(value.result))
        || (value.backupId !== undefined && value.backupId !== null && !text(value.backupId, 200))) throw invalidResponse();
    return {
        id: value.id,
        state: value.state as AssistantOperation["state"],
        message: value.message,
        sql: value.sql,
        ...(value.result ? { result: value.result as AssistantResult } : {}),
        ...(value.backupId ? { backupId: value.backupId as string } : {}),
    };
}

/** Only conversation text is sent. Query results must never be added here. */
export function assistantHistory(messages: AssistantHistoryMessage[]): AssistantHistoryMessage[] {
    const selected: AssistantHistoryMessage[] = [];
    let characters = 0;
    for (const message of messages.slice(-ASSISTANT_HISTORY_MESSAGE_LIMIT).reverse()) {
        if (message.content.length > HISTORY_ENTRY_CHARACTER_LIMIT
            || characters + message.content.length > ASSISTANT_HISTORY_CHARACTER_LIMIT) break;
        selected.unshift({ role: message.role, content: message.content });
        characters += message.content.length;
    }
    // Keep complete turns when the oldest message was removed by the size cap.
    if (selected[0]?.role === "assistant") selected.shift();
    return selected;
}

export async function getAssistantStatus(signal: AbortSignal): Promise<AssistantStatus> {
    const { data } = await axios.get<unknown>(`${baseUrl()}/status`, { signal, timeout: 10_000 });
    return readStatus(data);
}

export async function chatWithAssistant(message: string, history: AssistantHistoryMessage[], signal: AbortSignal): Promise<AssistantReply> {
    if (!message.trim() || message.length > ASSISTANT_MESSAGE_LIMIT) {
        throw new Error(`La pregunta debe contener entre 1 y ${ASSISTANT_MESSAGE_LIMIT} caracteres.`);
    }
    const { data } = await axios.post<unknown>(`${baseUrl()}/chat`, {
        message,
        history: assistantHistory(history),
    }, { signal, timeout: 200_000 });
    if (!record(data) || !text(data.message, HISTORY_ENTRY_CHARACTER_LIMIT)
        || (data.proposal !== undefined && data.proposal !== null && !readProposal(data.proposal))) throw invalidResponse();
    return { message: data.message, ...(data.proposal ? { proposal: data.proposal as AssistantProposal } : {}) };
}

export async function executeAssistantProposal(id: string, signal: AbortSignal): Promise<AssistantOperation> {
    const { data } = await axios.post<unknown>(`${baseUrl()}/proposals/${encodeURIComponent(id)}/execute`, undefined, { signal, timeout: 10_000 });
    return readOperation(data);
}

export async function getAssistantOperation(id: string, signal: AbortSignal, timeout = 10_000): Promise<AssistantOperation> {
    const { data } = await axios.get<unknown>(`${baseUrl()}/operations/${encodeURIComponent(id)}`, { signal, timeout });
    const operation = readOperation(data);
    if (operation.id !== id) throw invalidResponse();
    return operation;
}

function waitForPoll(signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        const abort = () => {
            window.clearTimeout(timer);
            signal.removeEventListener("abort", abort);
            reject(new DOMException("Consulta cancelada", "AbortError"));
        };
        const timer = window.setTimeout(() => {
            signal.removeEventListener("abort", abort);
            resolve();
        }, 2_000);
        signal.addEventListener("abort", abort, { once: true });
        if (signal.aborted) abort();
    });
}

export async function pollAssistantOperation(initial: AssistantOperation, signal: AbortSignal, update: (operation: AssistantOperation) => void): Promise<AssistantOperation> {
    const deadline = Date.now() + 180_000;
    let operation = initial;
    while (operation.state === "BACKING_UP") {
        await waitForPoll(signal);
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw new Error("El seguimiento alcanzó tres minutos. Puedes volver a consultar la misma operación; no vuelvas a ejecutarla.");
        operation = await getAssistantOperation(operation.id, signal, Math.min(10_000, remaining));
        if (signal.aborted) throw new DOMException("Consulta cancelada", "AbortError");
        update(operation);
    }
    return operation;
}

function backupPermissionDenied(error: unknown): boolean {
    return axios.isAxiosError(error) && error.response?.status === 403
        && record(error.response.data) && error.response.data.code === "BACKUP_PERMISSION_REQUIRED";
}

export function assistantAccessDenied(error: unknown): boolean {
    return axios.isAxiosError(error) && (error.response?.status === 401
        || (error.response?.status === 403 && !backupPermissionDenied(error)));
}

export function assistantErrorMessage(error: unknown): string {
    if (backupPermissionDenied(error)) return "La ejecución requiere el permiso independiente de respaldo y exportación de datos. El permiso del asistente no lo concede.";
    if (axios.isAxiosError(error)) {
        const status = error.response?.status ?? 0;
        const body: unknown = error.response?.data;
        // This backend deliberately returns sanitized ProblemDetail messages.
        // Preserve eligibility/usage explanations, without displaying raw provider bodies or HTML.
        if ([400, 404, 409, 410, 422, 429, 502, 503].includes(status) && record(body)
            && text(body.detail, 2_000) && body.detail.trim()) return body.detail;
        if (error.response?.status === 409) return "El servicio o la propuesta cambió. Pulsa Reintentar o solicita una nueva propuesta.";
        if (error.response?.status === 410) return "La propuesta ha caducado. Solicita una nueva antes de ejecutar.";
        if (error.response?.status === 429) return "Se alcanzó un límite temporal. Conserva tu pregunta e inténtalo más tarde.";
        if (error.response?.status === 400 || error.response?.status === 422) return "El servidor no pudo aceptar esta solicitud. Revisa la pregunta y el alcance de lectura de productos y materiales.";
        return "No se pudo completar la solicitud. Tu pregunta sigue en el campo para que puedas reintentarlo.";
    }
    return error instanceof Error ? error.message : "No se pudo completar la solicitud del asistente.";
}
