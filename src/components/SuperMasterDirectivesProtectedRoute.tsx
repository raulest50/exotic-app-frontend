import React from "react";
import { Center, Spinner, Text } from "@chakra-ui/react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMasterDirectives } from "../context/MasterDirectivesContext";
import {
    ENABLE_MASTER_SUPERMASTER_DIRECTIVES_ACCESS_DEFAULT,
    MASTER_DIRECTIVE_KEYS,
} from "../context/masterDirectiveConstants";

type SuperMasterDirectivesProtectedRouteProps = {
    children: JSX.Element;
};

const SuperMasterDirectivesProtectedRoute: React.FC<SuperMasterDirectivesProtectedRouteProps> = ({ children }) => {
    const { user, accesosReady } = useAuth();
    const { loading: directivesLoading, getBooleanDirective } = useMasterDirectives();

    if (!accesosReady || (user === "master" && directivesLoading)) {
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

    if (user === "super_master") {
        return children;
    }

    const masterAccessEnabled = getBooleanDirective(
        MASTER_DIRECTIVE_KEYS.ENABLE_MASTER_SUPERMASTER_DIRECTIVES_ACCESS,
        ENABLE_MASTER_SUPERMASTER_DIRECTIVES_ACCESS_DEFAULT
    );

    if (user === "master" && masterAccessEnabled) {
        return children;
    }

    return <div>403 Forbidden: No tienes acceso a este modulo.</div>;
};

export default SuperMasterDirectivesProtectedRoute;
