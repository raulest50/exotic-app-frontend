import React from "react";
import { Navigate } from "react-router-dom";
import { Center, Spinner, Text } from "@chakra-ui/react";
import { useAuth } from "../context/AuthContext";
import type { AccessRule } from "../auth/accessModel.ts";

type AccessRouteProps = {
    children: JSX.Element;
    accessRule?: AccessRule;
};

const AccessRoute: React.FC<AccessRouteProps> = ({ children, accessRule }) => {
    const { user, moduloAccesos, isMasterLike, accesosReady } = useAuth();

    if (!accesosReady) {
        return (
            <Center py={10}>
                <Spinner size="lg" mr={3} />
                <Text>Cargando accesos...</Text>
            </Center>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (accessRule && !accessRule({ isMasterLike, moduloAccesos })) {
        return <div>403 Forbidden: No tienes acceso a este módulo.</div>;
    }

    return children;
};

export default AccessRoute;
