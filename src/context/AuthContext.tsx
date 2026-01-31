// src/context/AuthContext.tsx
import React, {createContext, useContext, useEffect, useState} from 'react';
import axios from 'axios';
import EndPointsURL from "../api/EndPointsURL.tsx";
// IMPORTANT: Install jwt-decode package with: bun add jwt-decode
import { jwtDecode } from 'jwt-decode';
import { clearUserCache } from "../api/UserApi";

// 1) Describe each authority object
/*interface Authority {
    authority: string;
}*/

// 2) Describe the JWT token payload structure
interface JwtPayload {
    sub: string;
    accesos: string; // Changed from authorities: Authority[] to match backend
    exp: number;
    iat: number;
    // Add other JWT claims as needed
}

// 3) Describe the login response
interface LoginResponse {
    token: string;
    username: string;
}

/**
 * IMPORTANTE: En este sistema, el username (nombre de usuario) es único y debe usarse como 
 * identificador en las integraciones con API en lugar del ID numérico del usuario.
 * 
 * Cuando se envían datos a endpoints del backend que requieren identificar al usuario,
 * use siempre el campo 'username' en lugar de 'usuarioId' para evitar confusiones.
 * 
 * El backend está diseñado para buscar usuarios por su nombre de usuario único,
 * no por un ID numérico, aunque algunos DTOs puedan tener campos llamados 'usuarioId'.
 */
// Our AuthContext type
type AuthContextType = {
    user: string | null; // Contiene el username (nombre de usuario único), NO un ID numérico
    roles: string[];
    login: (username: string, password: string) => Promise<LoginResponse>;
    logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    roles: [],
    login: async () => {
        throw new Error('login function not implemented');
    },
    logout: () => {},
});

const endPoints = new EndPointsURL();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<string | null>(null);
    const [roles, setRoles] = useState<string[]>([]);

    useEffect(() => {
//         console.log('AuthContext - Inicializando contexto de autenticación');
        const token = localStorage.getItem('authToken');
//         console.log('AuthContext - Token encontrado:', Boolean(token));

        if (token) {
            // Configurar el header de autorización con el token guardado
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
//             console.log('AuthContext - Header de autorización configurado');

            // Decodificar el token para obtener el usuario y los roles
            try {
                const decodedToken = jwtDecode<JwtPayload>(token);
//                 console.log('AuthContext - Token decodificado:', decodedToken);

                // Establecer el usuario si está disponible en el token
                if (decodedToken.sub) {
//                     console.log('AuthContext - Usuario encontrado en token:', decodedToken.sub);
                    setUser(decodedToken.sub);
                }

                // Extraer los roles del token
                if (decodedToken.accesos) {
                    // Split the comma-separated string into an array of role strings
                    const userRoles = decodedToken.accesos.split(',');
//                     console.log('AuthContext - Roles encontrados en token:', userRoles);
                    setRoles(userRoles);
                } else if (decodedToken.sub === 'master' || decodedToken.sub === 'super_master') {
                    // Si el usuario es 'master' o 'super_master', darle acceso a todo incondicionalmente
                    setRoles(['ROLE_MASTER']);
                } else {
                    // Sin accesos asignados, no debe tener acceso a ningún módulo
//                     console.log('AuthContext - No se encontraron accesos en el token');
                    setRoles([]);
                }
            } catch (error) {
                console.error('AuthContext - Error decoding token on init:', error);
                // Si hay un error al decodificar, probablemente el token es inválido
                // Limpiar el token y forzar un nuevo login
                localStorage.removeItem('authToken');
                delete axios.defaults.headers.common['Authorization'];
            }
        } else {
//             console.log('AuthContext - No se encontró token, usuario no autenticado');
        }
    }, []);

    // Login with JWT authentication
    const login = async (username: string, password: string) => {
//         console.log('AuthContext - Iniciando proceso de login para usuario:', username);
        try {
            // Limpiar caché del usuario previo (si existía)
            clearUserCache();

            // Usar el nuevo endpoint de autenticación JWT
//             console.log('AuthContext - Enviando solicitud a:', endPoints.login);
            const response = await fetch(endPoints.login, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                console.error('AuthContext - Login fallido, respuesta no OK:', response.status);
                throw new Error('Login failed');
            }

            const authData = await response.json() as LoginResponse;
//             console.log('AuthContext - Login exitoso, datos recibidos:', { username: authData.username, tokenRecibido: Boolean(authData.token) });

            // Guardar el token JWT
            const token = authData.token;

            // Establecer el usuario desde la respuesta
            setUser(authData.username);
//             console.log('AuthContext - Usuario establecido:', authData.username);

            // Decodificar el token JWT para obtener los roles
            try {
                const decodedToken = jwtDecode<JwtPayload>(token);
//                 console.log('AuthContext - Token decodificado en login:', decodedToken);

                if (decodedToken.accesos) {
                    // Split the comma-separated string into an array of role strings
                    const userRoles = decodedToken.accesos.split(',');
//                     console.log('AuthContext - Roles encontrados en login:', userRoles);
                    setRoles(userRoles);
                } else if (authData.username === 'master' || authData.username === 'super_master') {
                    setRoles(['ROLE_MASTER']);
                } else {
                    setRoles([]);
                }
            } catch (error) {
                console.error('AuthContext - Error decoding token en login:', error);
                if (authData.username === 'master' || authData.username === 'super_master') {
                    setRoles(['ROLE_MASTER']);
                } else {
                    // Sin accesos asignados en caso de error, no debe tener acceso a ningún módulo
//                     console.log('AuthContext - No se asignan roles en caso de error');
                    setRoles([]);
                }
            }

            // Configurar el header de autorización para futuras peticiones
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
//             console.log('AuthContext - Header de autorización configurado en login');

            // Opcional: Guardar el token en localStorage para persistencia
            localStorage.setItem('authToken', token);
//             console.log('AuthContext - Token guardado en localStorage');

            return authData;
        } catch (error) {
            console.error('AuthContext - Login error completo:', error);
            throw error;
        }
    };

    const logout = () => {
//         console.log('AuthContext - Iniciando proceso de logout');
        setUser(null);
//         console.log('AuthContext - Usuario establecido a null');
        setRoles([]);
//         console.log('AuthContext - Roles establecidos a array vacío');
        // Limpiar caché del usuario actual para evitar datos stale tras relogin
        clearUserCache();
        // Eliminar el header de autorización
        delete axios.defaults.headers.common['Authorization'];
//         console.log('AuthContext - Header de autorización eliminado');
        // Eliminar el token del localStorage
        localStorage.removeItem('authToken');
//         console.log('AuthContext - Token eliminado de localStorage');
    };

    return (
        <AuthContext.Provider value={{ user, roles, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// Helper hook to use the AuthContext in other components
export const useAuth = () => useContext(AuthContext);
