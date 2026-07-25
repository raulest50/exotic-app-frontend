// src/context/AuthContext.tsx
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import axios from 'axios';
import EndPointsURL from "../api/EndPointsURL.tsx";
import {
    clearUserCache,
    normalizeModuloAccesosFromMe,
    type MeResponseRaw,
    type User,
} from "../api/UserApi";
import type { AreaResponsableSummary } from "../api/userAssignmentStatus.ts";
import { buildAccesosPorModulo } from "../auth/accessHelpers.ts";
import {
    AUTH_TOKEN_STORAGE_KEY,
    SESSION_EVENT_STORAGE_KEY,
    beginSessionTermination,
    clearStoredSessionContext,
    getTokenExpirationMillis,
    isPublicAuthPath,
    isResetPasswordPath,
    parseSessionEvent,
    publishSessionEnd,
    rememberAutomaticSessionEnd,
    resetSessionTerminationGuard,
    type SessionEndReason,
} from "../auth/sessionLifecycle.ts";
import type { ModuloAccesoFE } from "../pages/Usuarios/GestionUsuarios/types.tsx";
import { Modulo } from "../pages/Usuarios/GestionUsuarios/types.tsx";

interface LoginResponse {
    token: string;
    username: string;
}

type AuthContextType = {
    user: string | null;
    moduloAccesos: ModuloAccesoFE[];
    accesosPorModulo: Partial<Record<Modulo, ModuloAccesoFE>>;
    meProfile: User | null;
    isMasterLike: boolean;
    isAreaResponsable: boolean;
    areaResponsable: AreaResponsableSummary | null;
    accesosReady: boolean;
    login: (username: string, password: string) => Promise<LoginResponse>;
    logout: () => void;
    refreshAccesos: () => Promise<void>;
};

type SecurityErrorPayload = {
    code?: string;
};

type TerminateSessionOptions = {
    broadcast?: boolean;
    redirect?: boolean;
};

type AutomaticSessionEndReason = Exclude<SessionEndReason, "MANUAL_LOGOUT">;

const AuthContext = createContext<AuthContextType>({
    user: null,
    moduloAccesos: [],
    accesosPorModulo: {},
    meProfile: null,
    isMasterLike: false,
    isAreaResponsable: false,
    areaResponsable: null,
    accesosReady: true,
    login: async () => {
        throw new Error('login function not implemented');
    },
    logout: () => {},
    refreshAccesos: async () => {},
});

const endPoints = new EndPointsURL();
const MAX_TIMEOUT_MS = 2_147_483_647;

const resolveUnauthorizedReason = (code: unknown): AutomaticSessionEndReason => {
    if (code === "TOKEN_EXPIRED") return "TOKEN_EXPIRED";
    if (code === "INVALID_TOKEN") return "INVALID_TOKEN";
    return "AUTHENTICATION_REQUIRED";
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const initialToken = useMemo(
        () => localStorage.getItem(AUTH_TOKEN_STORAGE_KEY),
        []
    );
    const [sessionToken, setSessionToken] = useState<string | null>(initialToken);
    const [user, setUser] = useState<string | null>(null);
    const [moduloAccesos, setModuloAccesos] = useState<ModuloAccesoFE[]>([]);
    const [meProfile, setMeProfile] = useState<User | null>(null);
    const [isMasterLike, setIsMasterLike] = useState(false);
    const [isAreaResponsable, setIsAreaResponsable] = useState(false);
    const [areaResponsable, setAreaResponsable] = useState<AreaResponsableSummary | null>(null);
    const [accesosReady, setAccesosReady] = useState(() => !initialToken);

    const accesosPorModulo = useMemo(
        () => buildAccesosPorModulo(moduloAccesos),
        [moduloAccesos]
    );

    const clearAuthenticationState = useCallback(() => {
        setUser(null);
        setModuloAccesos([]);
        setMeProfile(null);
        setIsMasterLike(false);
        setIsAreaResponsable(false);
        setAreaResponsable(null);
        setAccesosReady(true);
        clearUserCache();
        delete axios.defaults.headers.common['Authorization'];
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        setSessionToken(null);
    }, []);

    const terminateSession = useCallback((
        reason: SessionEndReason,
        options: TerminateSessionOptions = {}
    ) => {
        if (!beginSessionTermination()) return;

        const { broadcast = true, redirect = true } = options;
        const currentPathname = window.location.pathname;
        const isPasswordResetPage = isResetPasswordPath(currentPathname);

        if (reason === "MANUAL_LOGOUT" || isPasswordResetPage) {
            clearStoredSessionContext();
        } else {
            rememberAutomaticSessionEnd(reason);
        }

        if (broadcast) {
            publishSessionEnd(reason);
        }

        clearAuthenticationState();

        if (redirect && !isPublicAuthPath(currentPathname)) {
            window.location.replace("/login");
        }
    }, [clearAuthenticationState]);

    const refreshAccesos = useCallback(async () => {
        clearUserCache();
        const tokenAtRequest = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

        try {
            const { data } = await axios.get<MeResponseRaw>(endPoints.me, {
                headers: { 'Content-Type': 'application/json' },
            });

            if (localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) !== tokenAtRequest) return;

            setUser(data.user?.username ?? null);
            setModuloAccesos(normalizeModuloAccesosFromMe(data.accesos));
            setMeProfile(data.user ?? null);
            setIsMasterLike(Boolean(data.isMasterLike));
            setIsAreaResponsable(Boolean(data.isAreaResponsable));
            setAreaResponsable(data.areaResponsable ?? null);
        } finally {
            if (localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) === tokenAtRequest) {
                setAccesosReady(true);
            }
        }
    }, []);

    useEffect(() => {
        const interceptorId = axios.interceptors.response.use(
            response => response,
            error => {
                if (
                    error.response?.status === 401
                    && localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
                ) {
                    const payload = error.response.data as SecurityErrorPayload | undefined;
                    terminateSession(resolveUnauthorizedReason(payload?.code));
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.response.eject(interceptorId);
        };
    }, [terminateSession]);

    useEffect(() => {
        const handleStorage = (event: StorageEvent) => {
            if (event.key !== SESSION_EVENT_STORAGE_KEY) return;
            const reason = parseSessionEvent(event.newValue);
            if (reason) {
                terminateSession(reason, { broadcast: false });
            }
        };

        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, [terminateSession]);

    useEffect(() => {
        if (!initialToken) return;

        const expiration = getTokenExpirationMillis(initialToken);
        if (expiration === null) {
            terminateSession("INVALID_TOKEN");
            return;
        }
        if (expiration <= Date.now()) {
            terminateSession("TOKEN_EXPIRED");
            return;
        }

        axios.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`;
        setAccesosReady(false);
        void refreshAccesos().catch(error => {
            if (
                localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) === initialToken
                && (!axios.isAxiosError(error) || error.response?.status !== 401)
            ) {
                console.error('AuthContext - Error loading /me on init:', error);
                terminateSession("SESSION_VALIDATION_FAILED");
            }
        });
    }, [initialToken, refreshAccesos, terminateSession]);

    useEffect(() => {
        if (!sessionToken) return;

        let timeoutId: number | undefined;

        const evaluateExpiration = () => {
            if (timeoutId !== undefined) {
                window.clearTimeout(timeoutId);
            }

            const expiration = getTokenExpirationMillis(sessionToken);
            if (expiration === null) {
                terminateSession("INVALID_TOKEN");
                return;
            }

            const remaining = expiration - Date.now();
            if (remaining <= 0) {
                terminateSession("TOKEN_EXPIRED");
                return;
            }

            timeoutId = window.setTimeout(
                evaluateExpiration,
                Math.min(remaining, MAX_TIMEOUT_MS)
            );
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                evaluateExpiration();
            }
        };

        evaluateExpiration();
        window.addEventListener("focus", evaluateExpiration);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            if (timeoutId !== undefined) {
                window.clearTimeout(timeoutId);
            }
            window.removeEventListener("focus", evaluateExpiration);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [sessionToken, terminateSession]);

    const login = async (username: string, password: string) => {
        let installedToken: string | null = null;

        try {
            resetSessionTerminationGuard();
            clearUserCache();

            const response = await fetch(endPoints.login, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                console.error('AuthContext - Login fallido, respuesta no OK:', response.status);
                throw new Error('Login failed');
            }

            const authData = (await response.json()) as LoginResponse;
            installedToken = authData.token;
            const expiration = getTokenExpirationMillis(installedToken);
            if (expiration === null || expiration <= Date.now()) {
                throw new Error('Login returned an invalid or expired token');
            }

            axios.defaults.headers.common['Authorization'] = `Bearer ${installedToken}`;
            localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, installedToken);
            setSessionToken(installedToken);
            setAccesosReady(false);
            await refreshAccesos();

            return authData;
        } catch (error) {
            if (
                installedToken
                && localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) === installedToken
            ) {
                clearAuthenticationState();
                resetSessionTerminationGuard();
            }
            console.error('AuthContext - Login error completo:', error);
            throw error;
        }
    };

    const logout = useCallback(() => {
        terminateSession("MANUAL_LOGOUT");
    }, [terminateSession]);

    return (
        <AuthContext.Provider
            value={{
                user,
                moduloAccesos,
                accesosPorModulo,
                meProfile,
                isMasterLike,
                isAreaResponsable,
                areaResponsable,
                accesosReady,
                login,
                logout,
                refreshAccesos,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
