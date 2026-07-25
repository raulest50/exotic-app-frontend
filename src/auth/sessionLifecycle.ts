import { jwtDecode } from "jwt-decode";

export const AUTH_TOKEN_STORAGE_KEY = "authToken";
export const SESSION_EVENT_STORAGE_KEY = "auth.session.event.v1";

const SESSION_NOTICE_STORAGE_KEY = "auth.session.notice.v1";
const SESSION_RETURN_TO_STORAGE_KEY = "auth.session.returnTo.v1";

export type SessionEndReason =
    | "TOKEN_EXPIRED"
    | "INVALID_TOKEN"
    | "AUTHENTICATION_REQUIRED"
    | "SESSION_VALIDATION_FAILED"
    | "MANUAL_LOGOUT";

type SessionEvent = {
    reason: SessionEndReason;
    emittedAt: number;
};

type JwtPayload = {
    exp?: number;
};

let sessionTerminationStarted = false;

const isSessionEndReason = (value: unknown): value is SessionEndReason =>
    value === "TOKEN_EXPIRED"
    || value === "INVALID_TOKEN"
    || value === "AUTHENTICATION_REQUIRED"
    || value === "SESSION_VALIDATION_FAILED"
    || value === "MANUAL_LOGOUT";

export const beginSessionTermination = (): boolean => {
    if (sessionTerminationStarted) return false;
    sessionTerminationStarted = true;
    return true;
};

export const resetSessionTerminationGuard = (): void => {
    sessionTerminationStarted = false;
};

export const getTokenExpirationMillis = (token: string): number | null => {
    try {
        const { exp } = jwtDecode<JwtPayload>(token);
        return typeof exp === "number" && Number.isFinite(exp) && exp > 0
            ? exp * 1000
            : null;
    } catch {
        return null;
    }
};

export const sanitizeInternalReturnTo = (candidate: string | null): string | null => {
    if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
        return null;
    }

    try {
        const parsed = new URL(candidate, window.location.origin);
        if (parsed.origin !== window.location.origin) return null;
        if (parsed.pathname === "/login" || parsed.pathname === "/reset-password") return null;
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
        return null;
    }
};

export const getCurrentReturnTo = (): string | null =>
    sanitizeInternalReturnTo(
        `${window.location.pathname}${window.location.search}${window.location.hash}`
    );

export const rememberAutomaticSessionEnd = (
    reason: Exclude<SessionEndReason, "MANUAL_LOGOUT">
): void => {
    sessionStorage.setItem(SESSION_NOTICE_STORAGE_KEY, reason);

    const returnTo = getCurrentReturnTo();
    if (returnTo) {
        sessionStorage.setItem(SESSION_RETURN_TO_STORAGE_KEY, returnTo);
    } else {
        sessionStorage.removeItem(SESSION_RETURN_TO_STORAGE_KEY);
    }
};

export const clearStoredSessionContext = (): void => {
    sessionStorage.removeItem(SESSION_NOTICE_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_RETURN_TO_STORAGE_KEY);
};

export const consumeSessionNotice = (): SessionEndReason | null => {
    const value = sessionStorage.getItem(SESSION_NOTICE_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_NOTICE_STORAGE_KEY);
    return isSessionEndReason(value) ? value : null;
};

export const consumeReturnTo = (): string | null => {
    const value = sessionStorage.getItem(SESSION_RETURN_TO_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_RETURN_TO_STORAGE_KEY);
    return sanitizeInternalReturnTo(value);
};

export const publishSessionEnd = (reason: SessionEndReason): void => {
    const event: SessionEvent = {
        reason,
        emittedAt: Date.now(),
    };
    localStorage.setItem(SESSION_EVENT_STORAGE_KEY, JSON.stringify(event));
};

export const parseSessionEvent = (value: string | null): SessionEndReason | null => {
    if (!value) return null;

    try {
        const parsed = JSON.parse(value) as Partial<SessionEvent>;
        return isSessionEndReason(parsed.reason) ? parsed.reason : null;
    } catch {
        return null;
    }
};
