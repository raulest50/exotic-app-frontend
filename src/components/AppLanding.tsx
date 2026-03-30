import React from "react";
import { Navigate } from "react-router-dom";
import { Center, Spinner, Text } from "@chakra-ui/react";
import { useAuth } from "../context/AuthContext.tsx";
import Home from "../pages/Home.tsx";

const AppLanding: React.FC = () => {
    const { user, isAreaResponsable, accesosReady } = useAuth();

    if (!accesosReady) {
        return (
            <Center py={10}>
                <Spinner size="lg" mr={3} />
                <Text>Cargando sesion...</Text>
            </Center>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // La raiz decide el destino inicial para separar por completo el Home normal
    // del flujo de responsables de area operativa.
    if (isAreaResponsable) {
        return <Navigate to="/area-operativa" replace />;
    }

    return <Home />;
};

export default AppLanding;
