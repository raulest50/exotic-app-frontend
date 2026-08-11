import React from "react";
import { Navigate } from "react-router-dom";
import { Center, Spinner, Text } from "@chakra-ui/react";
import { useAuth } from "../context/AuthContext.tsx";

type AreaResponsableRouteProps = {
    children: JSX.Element;
};

const AreaResponsableRoute: React.FC<AreaResponsableRouteProps> = ({ children }) => {
    const { user, isAreaResponsable, accesosReady } = useAuth();

    if (!accesosReady) {
        return (
            <Center py={10}>
                <Spinner size="lg" mr={3} />
                <Text>Cargando acceso al panel operativo...</Text>
            </Center>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!isAreaResponsable) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default AreaResponsableRoute;
