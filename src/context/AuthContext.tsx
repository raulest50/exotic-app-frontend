// src/context/AuthContext.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import EndPointsURL from "../api/EndPointsURL.tsx";
import { jwtDecode } from 'jwt-decode';
import {
    clearUserCache,
    normalizeModuloAccesosFromMe,
    type AuthorityEntry,
    type MeResponseRaw,
    type User,
} from "../api/UserApi";
import { buildAccesosPorModulo } from "../auth/accessHelpers.ts";
import type { ModuloAccesoFE } from "../pages/Usuarios/GestionUsuarios/types.tsx";
import { Modulo } from "../pages/Usuarios/GestionUsuarios/types.tsx";

interface JwtPayload {
    sub: string;
    accesos: string;
    exp: number;
    iat: number;
}

interface LoginResponse {
    token: string;
    username: string;
}

type AuthContextType = {
    user: string | null;
    roles: string[];
    moduloAccesos: ModuloAccesoFE[];
    accesosPorModulo: Partial<Record<Modulo, ModuloAccesoFE>>;
    authorities: AuthorityEntry[];
    meProfile: User | null;
    accesosReady: boolean;
    login: (username: string, password: string) => Promise<LoginResponse>;
    logout: () => void;
    refreshAccesos: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    roles: [],
    moduloAccesos: [],
    accesosPorModulo: {},
    authorities: [],
    meProfile: null,
    accesosReady: true,
    login: async () => {
        throw new Error('login function not implemented');
    },
    logout: () => {},
    refreshAccesos: async () => {},
});

const endPoints = new EndPointsURL();

function rolesFromTokenPayload(decoded: JwtPayload, usernameFallback?: string): string[] {
    const u = decoded.sub ?? usernameFallback;
    if (u === 'master' || u === 'super_master') {
        return ['ROLE_MASTER'];
    }
    if (decoded.accesos) {
        return decoded.accesos.split(',').filter(Boolean);
    }
    return [];
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<string | null>(null);
    const [roles, setRoles] = useState<string[]>([]);
    const [moduloAccesos, setModuloAccesos] = useState<ModuloAccesoFE[]>([]);
    const [authorities, setAuthorities] = useState<AuthorityEntry[]>([]);
    const [meProfile, setMeProfile] = useState<User | null>(null);
    const [accesosReady, setAccesosReady] = useState(() => !localStorage.getItem('authToken'));

    const accesosPorModulo = useMemo(
        () => buildAccesosPorModulo(moduloAccesos),
        [moduloAccesos]
    );

    const refreshAccesos = useCallback(async () => {
        clearUserCache();
        try {
            const { data } = await axios.get<MeResponseRaw>(endPoints.me, {
                headers: { 'Content-Type': 'application/json' },
            });
            setModuloAccesos(normalizeModuloAccesosFromMe(data.accesos));
            setAuthorities(Array.isArray(data.authorities) ? data.authorities : []);
            setMeProfile(data.user ?? null);
        } catch {
            setModuloAccesos([]);
            setAuthorities([]);
            setMeProfile(null);
        } finally {
            setAccesosReady(true);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        (async () => {
            try {
                const decodedToken = jwtDecode<JwtPayload>(token);
                if (decodedToken.sub) {
                    setUser(decodedToken.sub);
                }
                setRoles(rolesFromTokenPayload(decodedToken));
                await refreshAccesos();
            } catch (error) {
                console.error('AuthContext - Error decoding token on init:', error);
                localStorage.removeItem('authToken');
                delete axios.defaults.headers.common['Authorization'];
                setModuloAccesos([]);
                setAuthorities([]);
                setMeProfile(null);
                setAccesosReady(true);
            }
        })();
    }, [refreshAccesos]);

    const login = async (username: string, password: string) => {
        try {
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
            const token = authData.token;

            setUser(authData.username);

            try {
                const decodedToken = jwtDecode<JwtPayload>(token);
                setRoles(rolesFromTokenPayload(decodedToken, authData.username));
            } catch (error) {
                console.error('AuthContext - Error decoding token en login:', error);
                if (authData.username === 'master' || authData.username === 'super_master') {
                    setRoles(['ROLE_MASTER']);
                } else {
                    setRoles([]);
                }
            }

            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            localStorage.setItem('authToken', token);

            setAccesosReady(false);
            await refreshAccesos();

            return authData;
        } catch (error) {
            console.error('AuthContext - Login error completo:', error);
            throw error;
        }
    };

    const logout = () => {
        setUser(null);
        setRoles([]);
        setModuloAccesos([]);
        setAuthorities([]);
        setMeProfile(null);
        setAccesosReady(true);
        clearUserCache();
        delete axios.defaults.headers.common['Authorization'];
        localStorage.removeItem('authToken');
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                roles,
                moduloAccesos,
                accesosPorModulo,
                authorities,
                meProfile,
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
