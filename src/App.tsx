import { useEffect } from 'react'

import './App.css'
import EndPointsURL from './api/EndPointsURL'

// Silenciar advertencias de deprecación de React Router
window.REACT_ROUTER_SILENT_DEPRECATIONS = true;

import RootLayout from "./pages/RootLayout.tsx";
import Home from "./pages/Home.tsx"
import { NotificationsProvider } from "./context/NotificationsContext.tsx";
import { MasterDirectivesProvider } from "./context/MasterDirectivesContext.tsx";
import ProductosPage from './pages/Productos/ProductosPage.tsx'
import StockPage from "./pages/Stock/StockPage.tsx";
import ProduccionPage from "./pages/Produccion/ProduccionPage.tsx";

import {createBrowserRouter, createRoutesFromElements, Route, RouterProvider} from "react-router-dom"
import Responsable_1 from "./pages/Operarios/Responsable_1.tsx";

import ProveedoresPage from "./pages/Proveedores/ProveedoresPage.tsx";
import ComprasPage from "./pages/Compras/ComprasPage.tsx";
import {ProtectedRoute} from "./components/ProtectedRoute.tsx";
import LoginPanel from "./pages/LoginPage/LoginPanel.tsx";
import ResetPasswordPage from "./pages/LoginPage/ResetPasswordPage.tsx";
import InformesPage from "./pages/Informes/InformesPage.tsx";
import UsuariosPage from "./pages/Usuarios/UsuariosPage.tsx";
import MultiRoleProtectedRoute from "./components/MultiRoleProtectedRoute.tsx";

import { Modulo } from "./pages/Usuarios/GestionUsuarios/types.tsx";
import OperacionesCriticasBDPage from "./pages/OperacionesCriticasBD/OperacionesCriticasBDPage.tsx";
import ActivosFijosPage from "./pages/ActivosFijos/ActivosFijosPage.tsx";
import ContabilidadPage from "./pages/Contabilidad/ContabilidadPage.tsx";
import PersonalPage from "./pages/Personal/PersonalPage.tsx";
import BintelligencePage from "./pages/Bintelligence/BintelligencePage.tsx";
import AdministracionAlertasPage from "./pages/AdministracionAlertas/AdministracionAlertasPage.tsx";
import MasterDirectivesPage from "./pages/MasterDirectives/MasterDirectivesPage.tsx";
import CronogramaPage from "./pages/Cronograma/CronogramaPage.tsx";
import OrganigramaPage from "./pages/Organigrama/OrganigramaPage.tsx";
import TransaccionesAlmacenPage from "./pages/TransaccionesAlmacen/TransaccionesAlmacenPage.tsx";
import ClientesPage from "./pages/Clientes/ClientesPage.tsx";
import VentasPage from "./pages/Ventas/VentasPage.tsx";
import PagosProveedoresPage from "./pages/PagosProveedores/PagosProveedoresPage.tsx";
import { EnvironmentBadge } from "./components/EnvironmentBadge.tsx";

const router = createBrowserRouter(
    createRoutesFromElements(
        <>
            {/* Public login route (outside RootLayout if you like) */}
            <Route path="/login" element={<LoginPanel />} />

            {/* Public reset password route */}
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route path="/" element={<RootLayout />}>
                {/* Home is protected => if not logged in => go to /login */}
                <Route
                    index
                    element={
                        <ProtectedRoute>
                            <Home />
                        </ProtectedRoute>
                    }
                />

                {/* Worker routes */}
                <Route
                    path="asistente_produccion"
                    element={
                        <MultiRoleProtectedRoute supportedModules={[Modulo.SEGUIMIENTO_PRODUCCION]}>
                            <Responsable_1/>
                        </MultiRoleProtectedRoute>
                    }
                />

                <Route
                    path="clientes"
                    element={
                        <MultiRoleProtectedRoute supportedModules={[Modulo.CLIENTES]}>
                            <ClientesPage/>
                        </MultiRoleProtectedRoute>
                    }
                />

                <Route
                    path="ventas"
                    element={
                        <MultiRoleProtectedRoute supportedModules={[Modulo.VENTAS]}>
                            <VentasPage/>
                        </MultiRoleProtectedRoute>
                    }
                />

                <Route
                    path="transacciones_almacen"
                    element={
                        <MultiRoleProtectedRoute supportedModules={[Modulo.TRANSACCIONES_ALMACEN]}>
                            <TransaccionesAlmacenPage/>
                        </MultiRoleProtectedRoute>
                    }
                />

                {/* Master routes */}
                <Route
                    path="producto"
                    element={
                        <MultiRoleProtectedRoute supportedModules={[Modulo.PRODUCTOS]}>
                            <ProductosPage/>
                        </MultiRoleProtectedRoute>
                    }
                />
                <Route
                    path="produccion"
                    element={
                        <MultiRoleProtectedRoute supportedModules={[Modulo.PRODUCCION]}>
                            <ProduccionPage/>
                        </MultiRoleProtectedRoute>
                    }
                />
                <Route
                    path="stock"
                    element={
                        <MultiRoleProtectedRoute supportedModules={[Modulo.STOCK]}>
                            <StockPage/>
                        </MultiRoleProtectedRoute>
                    }
                />
                <Route
                    path="proveedores"
                    element={
                        <MultiRoleProtectedRoute supportedModules={[Modulo.PROVEEDORES]}>
                            <ProveedoresPage/>
                        </MultiRoleProtectedRoute>
                    }
                />
                <Route
                    path="compras"
                    element={
                        <MultiRoleProtectedRoute supportedModules={[Modulo.COMPRAS]}>
                            <ComprasPage/>
                        </MultiRoleProtectedRoute>
                    }
                />
                <Route
                    path="informes"
                    element={
                        <MultiRoleProtectedRoute supportedModules={[Modulo.PRODUCCION, Modulo.COMPRAS]}>
                            <InformesPage/>
                        </MultiRoleProtectedRoute>
                    }
                />

                <Route
                    path="usuarios"
                    element={
                        <ProtectedRoute requiredModulo={Modulo.USUARIOS}>
                            <UsuariosPage/>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="operaciones_criticas_bd"
                    element={
                        <ProtectedRoute requiredModulo={""}>
                            <OperacionesCriticasBDPage/>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="administracion_alertas"
                    element={
                        <MultiRoleProtectedRoute supportedModules={[Modulo.ADMINISTRACION_ALERTAS]}>
                            <AdministracionAlertasPage/>
                        </MultiRoleProtectedRoute>
                    }
                />

                <Route
                    path="master_directives"
                    element={
                        <MultiRoleProtectedRoute supportedModules={[""]}>
                            <MasterDirectivesPage/>
                        </MultiRoleProtectedRoute>
                    }
                />

                <Route
                    path="cronograma"
                    element={
                        <MultiRoleProtectedRoute supportedModules={[Modulo.CRONOGRAMA]}>
                            <CronogramaPage/>
                        </MultiRoleProtectedRoute>
                    }
                />

                <Route
                    path="organigrama"
                    element={
                        <MultiRoleProtectedRoute supportedModules={[Modulo.ORGANIGRAMA]}>
                            <OrganigramaPage/>
                        </MultiRoleProtectedRoute>
                    }
                />

                <Route
                    path="activos"
                    element={
                        <MultiRoleProtectedRoute supportedModules={[Modulo.ACTIVOS]}>
                            <ActivosFijosPage/>
                        </MultiRoleProtectedRoute>
                    }
                />

                <Route
                    path="contabilidad"
                    element={
                        <MultiRoleProtectedRoute supportedModules={[Modulo.CONTABILIDAD]}>
                            <ContabilidadPage/>
                        </MultiRoleProtectedRoute>
                    }
                />

                <Route
                    path="personal"
                    element={
                        <MultiRoleProtectedRoute supportedModules={[Modulo.PERSONAL_PLANTA]}>
                            <PersonalPage/>
                        </MultiRoleProtectedRoute>
                    }
                />

                <Route
                    path="bintelligence"
                    element={
                        <MultiRoleProtectedRoute supportedModules={[Modulo.BINTELLIGENCE]}>
                            <BintelligencePage/>
                        </MultiRoleProtectedRoute>
                    }
                />

                <Route
                    path="pagos-proveedores"
                    element={
                        <MultiRoleProtectedRoute supportedModules={[Modulo.PAGOS_PROVEEDORES]}>
                            <PagosProveedoresPage/>
                        </MultiRoleProtectedRoute>
                    }
                />

            </Route>
        </>
    ),
    {
        future: {
            v7_startTransition: true
        }
    }
)

function App() {
    useEffect(() => {
        const env = EndPointsURL.getEnvironment();
        const titles: Record<string, string> = {
            local: 'Exotic (Local)',
            staging: 'Exotic (Pruebas)',
            production: 'Exotic'
        };
        document.title = titles[env];
    }, []);

    return (
        <MasterDirectivesProvider>
            <NotificationsProvider>
                <RouterProvider router={router} />
                <EnvironmentBadge />
            </NotificationsProvider>
        </MasterDirectivesProvider>
    )
}

export default App
