// src/context/AuthContext.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import EndPointsURL from "../api/EndPointsURL.tsx";
import {
    clearUserCache,
    normalizeModuloAccesosFromMe,
    type MeResponseRaw,
    type User,
} from "../api/UserApi";
import { buildAccesosPorModulo } from "../auth/accessHelpers.ts";
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
    accesosReady: boolean;
    login: (username: string, password: string) => Promise<LoginResponse>;
    logout: () => void;
    refreshAccesos: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    moduloAccesos: [],
    accesosPorModulo: {},
    meProfile: null,
    isMasterLike: false,
    accesosReady: true,
    login: async () => {
        throw new Error('login function not implemented');
    },
    logout: () => {},
    refreshAccesos: async () => {},
});

const endPoints = new EndPointsURL();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<string | null>(null);
    const [moduloAccesos, setModuloAccesos] = useState<ModuloAccesoFE[]>([]);
    const [meProfile, setMeProfile] = useState<User | null>(null);
    const [isMasterLike, setIsMasterLike] = useState(false);
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
            setUser(data.user?.username ?? null);
            setModuloAccesos(normalizeModuloAccesosFromMe(data.accesos));
            setMeProfile(data.user ?? null);
            setIsMasterLike(Boolean(data.isMasterLike));
        } catch {
            setUser(null);
            setModuloAccesos([]);
            setMeProfile(null);
            setIsMasterLike(false);
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
                setAccesosReady(false);
                await refreshAccesos();
            } catch (error) {
                console.error('AuthContext - Error loading /me on init:', error);
                localStorage.removeItem('authToken');
                delete axios.defaults.headers.common['Authorization'];
                setUser(null);
                setModuloAccesos([]);
                setMeProfile(null);
                setIsMasterLike(false);
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
        setModuloAccesos([]);
        setMeProfile(null);
        setIsMasterLike(false);
        setAccesosReady(true);
        clearUserCache();
        delete axios.defaults.headers.common['Authorization'];
        localStorage.removeItem('authToken');
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                moduloAccesos,
                accesosPorModulo,
                meProfile,
                isMasterLike,
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
