import { useState, useEffect } from 'react';
import axios from 'axios';
import EndPointsURL from './EndPointsURL';
import { useAuth } from '../context/AuthContext';
import { Modulo } from '../pages/Usuarios/GestionUsuarios/types.tsx';

export interface OrdenCompraAlertaCampanaDTO {
    ordenCompraId: number;
    fechaEmision: string | null;
}

export interface ModuleNotificationDTA {
    modulo: Modulo;
    requireAtention: boolean;
    message: string;
    ordenesPendientesLiberar?: number | null;
    ordenesPendientesEnviar?: number | null;
    materialesEnPuntoReorden?: number | null;
    detalleOrdenesPendientesLiberar?: OrdenCompraAlertaCampanaDTO[];
    detalleOrdenesPendientesEnviar?: OrdenCompraAlertaCampanaDTO[];
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

export interface OcmPendienteIngresoDTO {
    ordenCompraId: number;
    fechaEmision: string | null;
}

export interface MaterialEnPuntoReordenConOcmDTO extends MaterialEnPuntoReordenDTO {
    ocmsPendientesIngreso: OcmPendienteIngresoDTO[];
}

export interface PuntoReordenEvaluacionResult {
    pendientesOrdenar: MaterialEnPuntoReordenDTO[];
    pendientesIngresoAlmacen: MaterialEnPuntoReordenConOcmDTO[];
    sinPuntoReorden: MaterialEnPuntoReordenDTO[];
    totalPendientesOrdenar: number;
    totalPendientesIngresoAlmacen: number;
    totalSinPuntoReorden: number;
    totalEnAlerta: number;
}

export function useModuleNotifications() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<ModuleNotificationDTA[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const endPoints = new EndPointsURL();

            if (user) {
                const url = `${endPoints.module_notifications}?username=${user}`;
                const response = await axios.get(url);
                setNotifications(response.data);
            } else {
                setNotifications([]);
            }

            setError(null);
        } catch (err) {
            setError('Error al cargar notificaciones');
            console.error('fetchNotifications - Error completo:', err);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();

        const intervalId = setInterval(() => {
            fetchNotifications();
        }, 5 * 60 * 1000);

        return () => clearInterval(intervalId);
    }, [user]);

    return { notifications, loading, error, refreshNotifications: fetchNotifications };
}
