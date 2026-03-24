import { useState, useEffect } from 'react';
import axios from 'axios';
import EndPointsURL from './EndPointsURL';
import { useAuth } from '../context/AuthContext';
import { Modulo } from '../pages/Usuarios/GestionUsuarios/types.tsx';

export interface ModuleNotificationDTA {
    modulo: Modulo;
    requireAtention: boolean;
    message: string;
    ordenesPendientesLiberar?: number | null;
    ordenesPendientesEnviar?: number | null;
    materialesEnPuntoReorden?: number | null;
}

/** Respuesta paginada Spring para materiales en punto de reorden */
export interface PageMaterialEnPuntoReorden {
    content: MaterialEnPuntoReordenDTO[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
}

export interface MaterialEnPuntoReordenDTO {
    productoId: string;
    nombre: string;
    tipoMaterial: number;
    tipoMaterialLabel: string;
    stockActual: number;
    puntoReorden: number;
    tipoUnidades: string;
}

// Hook personalizado para obtener notificaciones
export function useModuleNotifications() {
    const { user } = useAuth();
//     console.log('useModuleNotifications - Usuario actual:', user); // Log del usuario

    const [notifications, setNotifications] = useState<ModuleNotificationDTA[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = async () => {
//         console.log('fetchNotifications - Iniciando fetch de notificaciones'); // Log de inicio
        try {
            setLoading(true);
            const endPoints = new EndPointsURL();

            if (user) {
                // Construir la URL
                const url = `${endPoints.module_notifications}?username=${user}`;
//                 console.log('fetchNotifications - URL:', url); // Log de la URL

                // Llamar al endpoint real con el username como parámetro
                const response = await axios.get(url);
//                 console.log('fetchNotifications - Respuesta:', response.data); // Log de la respuesta

                setNotifications(response.data);
            } else {
//                 console.log('fetchNotifications - No hay usuario, estableciendo array vacío');
                // Si no hay usuario, establecer un array vacío de notificaciones
                setNotifications([]);
            }

            setError(null);
        } catch (err) {
            setError('Error al cargar notificaciones');
            console.error('fetchNotifications - Error completo:', err);
            // En caso de error, establecer un array vacío de notificaciones
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
//         console.log('useEffect - Llamando a fetchNotifications inicial');
        fetchNotifications();

        // Opcional: configurar un intervalo para actualizar periódicamente
        const intervalId = setInterval(() => {
//             console.log('Intervalo - Actualizando notificaciones');
            fetchNotifications();
        }, 5 * 60 * 1000); // cada 5 minutos

        return () => clearInterval(intervalId);
    }, [user]); // Agregar user como dependencia

    return { notifications, loading, error, refreshNotifications: fetchNotifications };
}
