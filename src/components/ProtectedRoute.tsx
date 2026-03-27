// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isMasterLike } from '../auth/accessHelpers';

type ProtectedRouteProps = {
    children: JSX.Element;  // The actual page we want to render
    requiredModulo?: string;  // e.g. "USUARIOS", "PRODUCTOS", etc.
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredModulo }) => {
    const { user, roles } = useAuth();

    // 1) If no user => not logged in => go to /login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // 2) If a required module is specified, check if user has access to it or is master
    if (requiredModulo) {
        const hasAccess = isMasterLike(roles, user) || roles.includes(requiredModulo);

        if (!hasAccess) {
            return <div>403 Prohibido: No tienes acceso al módulo {requiredModulo}</div>;
        }
    }

    // 3) Otherwise, authorized => render child
    return children;
};
