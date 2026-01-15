/**
 * UserApi.tsx
 * 
 * API centralizada para obtener información del usuario actual logueado.
 * 
 * Este módulo proporciona una abstracción sobre la obtención del usuario actual,
 * encapsulando la complejidad de hacer llamadas al endpoint /api/auth/me y
 * gestionando un sistema de caché para evitar múltiples llamadas innecesarias.
 * 
 * Uso típico:
 *   import { getCurrentUser } from './api/UserApi';
 *   const user = await getCurrentUser();
 *   console.log(user.nombreCompleto);
 */

import axios from 'axios';
import EndPointsURL from './EndPointsURL';

/**
 * Interfaz User - Representa los datos básicos de un usuario
 * 
 * Esta interfaz coincide exactamente con el modelo User.java del backend.
 * Todos los campos opcionales (marcados con ?) pueden ser null/undefined.
 * 
 * @property id - Identificador único del usuario en la base de datos
 * @property cedula - Número de cédula del usuario (único)
 * @property username - Nombre de usuario para login (único)
 * @property nombreCompleto - Nombre completo del usuario (opcional)
 * @property email - Correo electrónico del usuario (opcional)
 * @property cel - Número de celular (opcional)
 * @property direccion - Dirección física (opcional)
 * @property fechaNacimiento - Fecha de nacimiento en formato ISO string (opcional)
 * @property estado - Estado del usuario: 1 = activo, 2 = inactivo
 */
export interface User {
    id: number;
    cedula: number;
    username: string;
    nombreCompleto?: string;
    email?: string;
    cel?: string;
    direccion?: string;
    fechaNacimiento?: string; // ISO format date string (ej: "1990-01-15")
    estado: number; // 1: activo, 2: inactivo
}

/**
 * Interfaz Acceso - Representa un permiso de acceso a un módulo específico
 * 
 * Cada usuario puede tener múltiples accesos, uno por cada módulo al que tiene permiso.
 * El nivel determina qué tan alto es el permiso (1 = básico, números mayores = más permisos).
 * 
 * @property id - Identificador único del acceso
 * @property nivel - Nivel de acceso al módulo (1 = mínimo, números mayores = más permisos)
 * @property moduloAcceso - Nombre del módulo al que se tiene acceso (ej: "PRODUCCION", "USUARIOS")
 */
export interface Acceso {
    id: number;
    nivel: number; // nivel de acceso al modulo desde 1 en adelante (1 = básico, mayor = más permisos)
    moduloAcceso: string; // Nombre del módulo como string (ej: "PRODUCCION", "USUARIOS", "COMPRAS")
}

/**
 * Interfaz ExpandedUser - Usuario completo con sus permisos y accesos
 * 
 * Esta interfaz combina los datos del usuario con su lista de accesos y autoridades.
 * Es útil cuando necesitas tanto la información del usuario como sus permisos.
 * 
 * @property user - Datos completos del usuario
 * @property accesos - Lista de accesos/permisos que tiene el usuario
 * @property authorities - Lista de autoridades en formato legacy (opcional, para compatibilidad)
 */
export interface ExpandedUser {
    user: User;
    accesos: Acceso[];
    authorities?: Array<{
        authority: string; // Formato: "ACCESO_MODULO" (ej: "ACCESO_PRODUCCION")
        nivel: string; // Nivel como string (ej: "3")
    }>;
}

/**
 * Interfaz MeResponse - Estructura de respuesta del endpoint /api/auth/me
 * 
 * Esta es la estructura exacta que retorna el backend cuando llamas a /api/auth/me.
 * No se exporta porque es solo para uso interno de este módulo.
 */
interface MeResponse {
    user: User;
    accesos: Acceso[];
    authorities: Array<{
        authority: string;
        nivel: string;
    }>;
}

// ============================================================================
// SISTEMA DE CACHÉ
// ============================================================================

/**
 * Variable de caché para almacenar el usuario actual
 * 
 * Almacena el último usuario obtenido para evitar llamadas repetidas al servidor.
 * Se inicializa como null cuando no hay usuario en caché.
 */
let currentUserCache: ExpandedUser | null = null;

/**
 * Timestamp de cuándo se guardó el usuario en caché
 * 
 * Se usa para determinar si el caché sigue siendo válido comparándolo con CACHE_DURATION.
 */
let cacheTimestamp: number = 0;

/**
 * Duración del caché en milisegundos
 * 
 * El caché es válido por 5 minutos. Después de este tiempo, se hace una nueva
 * llamada al servidor para obtener datos actualizados.
 */
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos en milisegundos

// ============================================================================
// FUNCIONES PÚBLICAS
// ============================================================================

/**
 * Limpia el caché del usuario actual
 * 
 * Útil cuando:
 * - El usuario hace logout
 * - Se actualiza la información del usuario
 * - Necesitas forzar una nueva obtención de datos
 * 
 * Ejemplo de uso:
 *   import { clearUserCache } from './api/UserApi';
 *   // Después de logout
 *   clearUserCache();
 */
export function clearUserCache(): void {
    currentUserCache = null;
    cacheTimestamp = 0;
}

/**
 * Obtiene el usuario actual con TODA su información (incluyendo accesos y permisos)
 * 
 * Esta función:
 * 1. Verifica si hay un usuario válido en caché (menos de 5 minutos)
 * 2. Si hay caché válido, lo retorna sin hacer llamada al servidor
 * 3. Si no hay caché o está expirado, hace una llamada a /api/auth/me
 * 4. Guarda el resultado en caché para futuras llamadas
 * 5. Retorna el usuario completo con accesos
 * 
 * @returns Promise que resuelve con ExpandedUser (usuario + accesos + autoridades)
 * @throws Error si el usuario no está autenticado o si falla la llamada al servidor
 * 
 * Ejemplo de uso:
 *   import { getCurrentUserWithAccess } from './api/UserApi';
 *   try {
 *     const expandedUser = await getCurrentUserWithAccess();
 *     console.log('Usuario:', expandedUser.user.nombreCompleto);
 *     console.log('Tiene acceso a PRODUCCION:', expandedUser.accesos.some(a => a.moduloAcceso === 'PRODUCCION'));
 *   } catch (error) {
 *     console.error('No se pudo obtener el usuario:', error);
 *   }
 */
export async function getCurrentUserWithAccess(): Promise<ExpandedUser> {
    const now = Date.now();
    
    // Verificar si hay un usuario en caché y si aún es válido (menos de 5 minutos)
    if (currentUserCache && (now - cacheTimestamp) < CACHE_DURATION) {
        // Retornar el usuario desde caché (más rápido, no hace llamada al servidor)
        return currentUserCache;
    }

    // Si no hay caché válido, obtener el endpoint y hacer la llamada al servidor
    const endPoints = new EndPointsURL();
    
    try {
        // Hacer la llamada GET al endpoint /api/auth/me
        // El Bearer token se envía automáticamente por axios si está configurado en AuthContext
        const response = await axios.get<MeResponse>(endPoints.me, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Construir el objeto ExpandedUser con los datos recibidos
        const expandedUser: ExpandedUser = {
            user: response.data.user,
            accesos: response.data.accesos,
            authorities: response.data.authorities
        };

        // Guardar en caché para futuras llamadas
        currentUserCache = expandedUser;
        cacheTimestamp = now;

        return expandedUser;
    } catch (error) {
        // Si hay un error, limpiar el caché y relanzar el error
        console.error('Error fetching current user:', error);
        clearUserCache();
        throw error;
    }
}

/**
 * Obtiene SOLO los datos básicos del usuario actual (sin accesos ni permisos)
 * 
 * Esta es la función más comúnmente usada cuando solo necesitas información básica
 * del usuario (nombre, email, etc.) y no te importan los permisos.
 * 
 * Internamente llama a getCurrentUserWithAccess() pero solo retorna la parte del usuario.
 * 
 * @returns Promise que resuelve con User (solo datos básicos del usuario)
 * @throws Error si el usuario no está autenticado o si falla la llamada al servidor
 * 
 * Ejemplo de uso:
 *   import { getCurrentUser } from './api/UserApi';
 *   const user = await getCurrentUser();
 *   console.log('Hola', user.nombreCompleto);
 *   console.log('Tu email es:', user.email);
 */
export async function getCurrentUser(): Promise<User> {
    // Obtener el usuario completo y retornar solo la parte del usuario (sin accesos)
    const expandedUser = await getCurrentUserWithAccess();
    return expandedUser.user;
}

/**
 * Obtiene el nivel de acceso que tiene el usuario actual para un módulo específico
 * 
 * Esta función es útil para verificar permisos específicos. Retorna el número
 * del nivel de acceso o null si el usuario no tiene acceso a ese módulo.
 *
 * moduloAcceso disponibles (según Home.tsx / Modulo):
 * USUARIOS, PRODUCTOS, PRODUCCION, STOCK, PROVEEDORES, COMPRAS, SEGUIMIENTO_PRODUCCION,
 * CLIENTES, VENTAS, TRANSACCIONES_ALMACEN, ACTIVOS, CONTABILIDAD, PERSONAL_PLANTA,
 * BINTELLIGENCE, ADMINISTRACION_ALERTAS, CRONOGRAMA, ORGANIGRAMA, PAGOS_PROVEEDORES.
 * 
 * @param modulo - Nombre del módulo a verificar (ej: "PRODUCCION", "USUARIOS", "COMPRAS")
 * @returns Promise que resuelve con el nivel de acceso (número >= 1) o null si no tiene acceso
 * 
 * Ejemplo de uso:
 *   import { getAccessLevel } from './api/UserApi';
 *   const nivel = await getAccessLevel('PRODUCCION');
 *   if (nivel && nivel >= 3) {
 *     console.log('Tienes acceso de nivel alto a PRODUCCION');
 *   }
 */
export async function getAccessLevel(modulo: string): Promise<number | null> {
    // Obtener el usuario completo con accesos
    const expandedUser = await getCurrentUserWithAccess();
    
    // Buscar el acceso específico para el módulo solicitado
    const acceso = expandedUser.accesos.find(a => a.moduloAcceso === modulo);
    
    // Retornar el nivel si existe, o null si no tiene acceso
    return acceso ? acceso.nivel : null;
}

/**
 * Verifica si el usuario actual tiene acceso a un módulo con un nivel mínimo requerido
 * 
 * Esta función es útil para controlar el acceso a funcionalidades basado en permisos.
 * Por defecto, verifica si tiene al menos nivel 1 (acceso básico).
 * 
 * @param modulo - Nombre del módulo a verificar (ej: "PRODUCCION", "USUARIOS")
 * @param minLevel - Nivel mínimo requerido (por defecto: 1 = acceso básico)
 * @returns Promise que resuelve con true si tiene acceso suficiente, false si no
 * 
 * Ejemplo de uso:
 *   import { hasAccess } from './api/UserApi';
 *   const puedeCrearOrdenes = await hasAccess('PRODUCCION', 3);
 *   if (puedeCrearOrdenes) {
 *     // Mostrar botón para crear órdenes de producción
 *   }
 */
export async function hasAccess(modulo: string, minLevel: number = 1): Promise<boolean> {
    // Obtener el nivel de acceso del usuario para el módulo
    const level = await getAccessLevel(modulo);
    
    // Retornar true solo si tiene acceso Y el nivel es suficiente
    return level !== null && level >= minLevel;
}
