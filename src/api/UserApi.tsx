// src/api/UserApi.tsx
// Centralized API for getting current user information

import axios from 'axios';
import EndPointsURL from './EndPointsURL';

/**
 * User interface matching the backend User.java model
 */
export interface User {
    id: number;
    cedula: number;
    username: string;
    nombreCompleto?: string;
    email?: string;
    cel?: string;
    direccion?: string;
    fechaNacimiento?: string; // ISO format date string
    estado: number; // 1: activo, 2: inactivo
}

/**
 * Acceso interface matching the backend Acceso.java model
 */
export interface Acceso {
    id: number;
    nivel: number; // nivel de acceso al modulo desde 1 en adelante
    moduloAcceso: string; // Modulo enum as string (e.g., "PRODUCCION", "USUARIOS")
}

/**
 * ExpandedUser interface that encapsulates User + accesos with access levels
 */
export interface ExpandedUser {
    user: User;
    accesos: Acceso[];
    authorities?: Array<{
        authority: string;
        nivel: string;
    }>;
}

/**
 * Response structure from /api/auth/me endpoint
 */
interface MeResponse {
    user: User;
    accesos: Acceso[];
    authorities: Array<{
        authority: string;
        nivel: string;
    }>;
}

// Cache for the current user to avoid multiple API calls
let currentUserCache: ExpandedUser | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Clears the user cache (useful after logout or user updates)
 */
export function clearUserCache(): void {
    currentUserCache = null;
    cacheTimestamp = 0;
}

/**
 * Gets the current logged-in user with complete information
 * Uses caching to avoid multiple API calls
 * 
 * @returns Promise<ExpandedUser> The current user with accesos
 * @throws Error if user is not authenticated or API call fails
 */
export async function getCurrentUserWithAccess(): Promise<ExpandedUser> {
    const now = Date.now();
    
    // Return cached user if still valid
    if (currentUserCache && (now - cacheTimestamp) < CACHE_DURATION) {
        return currentUserCache;
    }

    const endPoints = new EndPointsURL();
    
    try {
        const response = await axios.get<MeResponse>(endPoints.me, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const expandedUser: ExpandedUser = {
            user: response.data.user,
            accesos: response.data.accesos,
            authorities: response.data.authorities
        };

        // Update cache
        currentUserCache = expandedUser;
        cacheTimestamp = now;

        return expandedUser;
    } catch (error) {
        console.error('Error fetching current user:', error);
        // Clear cache on error
        clearUserCache();
        throw error;
    }
}

/**
 * Gets only the current user information (without accesos)
 * 
 * @returns Promise<User> The current user
 * @throws Error if user is not authenticated or API call fails
 */
export async function getCurrentUser(): Promise<User> {
    const expandedUser = await getCurrentUserWithAccess();
    return expandedUser.user;
}

/**
 * Gets the access level for a specific module
 * 
 * @param modulo The module name (e.g., "PRODUCCION", "USUARIOS")
 * @returns Promise<number | null> The access level (1+) or null if no access
 */
export async function getAccessLevel(modulo: string): Promise<number | null> {
    const expandedUser = await getCurrentUserWithAccess();
    const acceso = expandedUser.accesos.find(a => a.moduloAcceso === modulo);
    return acceso ? acceso.nivel : null;
}

/**
 * Checks if the current user has access to a specific module
 * 
 * @param modulo The module name (e.g., "PRODUCCION", "USUARIOS")
 * @param minLevel Optional minimum access level (default: 1)
 * @returns Promise<boolean> True if user has access with at least minLevel
 */
export async function hasAccess(modulo: string, minLevel: number = 1): Promise<boolean> {
    const level = await getAccessLevel(modulo);
    return level !== null && level >= minLevel;
}

