import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type SuperMasterProtectedRouteProps = {
    children: JSX.Element;
};

/**
 * Protects routes so only the super_master user can access them.
 * master and other users get 403 / redirect.
 */
const SuperMasterProtectedRoute: React.FC<SuperMasterProtectedRouteProps> = ({ children }) => {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user !== "super_master") {
        return <div>403 Forbidden: Solo super_master puede acceder a este módulo.</div>;
    }

    return children;
};

export default SuperMasterProtectedRoute;
