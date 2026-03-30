import { useEffect } from 'react'

import './App.css'
import EndPointsURL from './api/EndPointsURL'

// Silenciar advertencias de deprecación de React Router
window.REACT_ROUTER_SILENT_DEPRECATIONS = true;

import RootLayout from "./pages/RootLayout.tsx";
import { NotificationsProvider } from "./context/NotificationsContext.tsx";
import { MasterDirectivesProvider } from "./context/MasterDirectivesContext.tsx";
import ProductosPage from './pages/Productos/ProductosPage.tsx'
import StockPage from "./pages/Stock/StockPage.tsx";
import ProduccionPage from "./pages/Produccion/ProduccionPage.tsx";

import {createBrowserRouter, createRoutesFromElements, Route, RouterProvider} from "react-router-dom"
import GestionAreasOperativasPage from "./pages/GestionAreasOperativas/GestionAreasOperativasPage.tsx";

import ProveedoresPage from "./pages/Proveedores/ProveedoresPage.tsx";
import ComprasPage from "./pages/Compras/ComprasPage.tsx";
import AccessRoute from "./components/AccessRoute.tsx";
import AppLanding from "./components/AppLanding.tsx";
import AreaResponsableRoute from "./components/AreaResponsableRoute.tsx";
import LoginPanel from "./pages/LoginPage/LoginPanel.tsx";
import ResetPasswordPage from "./pages/LoginPage/ResetPasswordPage.tsx";
import UsuariosPage from "./pages/Usuarios/UsuariosPage.tsx";
import SuperMasterProtectedRoute from "./components/SuperMasterProtectedRoute.tsx";

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
import AreaOperativaPanel from "./pages/AreaOperativaPanel/AreaOperativaPanel.tsx";
import { EnvironmentBadge } from "./components/EnvironmentBadge.tsx";
import { canAccessModule, moduleAccessRule } from "./auth/accessHelpers.ts";

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
                        <AppLanding />
                    }
                />

                <Route
                    path="area-operativa"
                    element={
                        <AreaResponsableRoute>
                            <AreaOperativaPanel />
                        </AreaResponsableRoute>
                    }
                />

                {/* Worker routes */}
                <Route
                    path="gestion_areas_operativas"
                    element={
                        <AccessRoute accessRule={moduleAccessRule(Modulo.SEGUIMIENTO_PRODUCCION)}>
                            <GestionAreasOperativasPage/>
                        </AccessRoute>
                    }
                />

                {/* Módulo Clientes temporalmente oculto */}
                {/* <Route
                    path="clientes"
                    element={
                        <AccessRoute accessRule={moduleAccessRule(Modulo.CLIENTES)}>
                            <ClientesPage/>
                        </AccessRoute>
                    }
                /> */}

                {/* Módulo Ventas temporalmente oculto */}
                {/* <Route
                    path="ventas"
                    element={
                        <AccessRoute accessRule={moduleAccessRule(Modulo.VENTAS)}>
                            <VentasPage/>
                        </AccessRoute>
                    }
                /> */}

                <Route
                    path="transacciones_almacen"
                    element={
                        <AccessRoute accessRule={moduleAccessRule(Modulo.TRANSACCIONES_ALMACEN)}>
                            <TransaccionesAlmacenPage/>
                        </AccessRoute>
                    }
                />

                {/* Master routes */}
                <Route
                    path="producto"
                    element={
                        <AccessRoute accessRule={moduleAccessRule(Modulo.PRODUCTOS)}>
                            <ProductosPage/>
                        </AccessRoute>
                    }
                />
                <Route
                    path="produccion"
                    element={
                        <AccessRoute accessRule={moduleAccessRule(Modulo.PRODUCCION)}>
                            <ProduccionPage/>
                        </AccessRoute>
                    }
                />
                <Route
                    path="stock"
                    element={
                        <AccessRoute accessRule={moduleAccessRule(Modulo.STOCK)}>
                            <StockPage/>
                        </AccessRoute>
                    }
                />
                <Route
                    path="proveedores"
                    element={
                        <AccessRoute accessRule={moduleAccessRule(Modulo.PROVEEDORES)}>
                            <ProveedoresPage/>
                        </AccessRoute>
                    }
                />
                <Route
                    path="compras"
                    element={
                        <AccessRoute accessRule={moduleAccessRule(Modulo.COMPRAS)}>
                            <ComprasPage/>
                        </AccessRoute>
                    }
                />

                <Route
                    path="usuarios"
                    element={
                        <AccessRoute accessRule={moduleAccessRule(Modulo.USUARIOS)}>
                            <UsuariosPage/>
                        </AccessRoute>
                    }
                />

                <Route
                    path="operaciones_criticas_bd"
                    element={
                        <AccessRoute accessRule={(access) => access.isMasterLike && canAccessModule(access.moduloAccesos, Modulo.OPERACIONES_CRITICAS_BD)}>
                            <OperacionesCriticasBDPage/>
                        </AccessRoute>
                    }
                />

                <Route
                    path="administracion_alertas"
                    element={
                        <AccessRoute accessRule={moduleAccessRule(Modulo.ADMINISTRACION_ALERTAS)}>
                            <AdministracionAlertasPage/>
                        </AccessRoute>
                    }
                />

                <Route
                    path="master_directives"
                    element={
                        <AccessRoute accessRule={(access) => canAccessModule(access.moduloAccesos, Modulo.MASTER_DIRECTIVES)}>
                            <SuperMasterProtectedRoute>
                                <MasterDirectivesPage/>
                            </SuperMasterProtectedRoute>
                        </AccessRoute>
                    }
                />

                <Route
                    path="cronograma"
                    element={
                        <AccessRoute accessRule={moduleAccessRule(Modulo.CRONOGRAMA)}>
                            <CronogramaPage/>
                        </AccessRoute>
                    }
                />

                <Route
                    path="organigrama"
                    element={
                        <AccessRoute accessRule={moduleAccessRule(Modulo.ORGANIGRAMA)}>
                            <OrganigramaPage/>
                        </AccessRoute>
                    }
                />

                <Route
                    path="activos"
                    element={
                        <AccessRoute accessRule={moduleAccessRule(Modulo.ACTIVOS)}>
                            <ActivosFijosPage/>
                        </AccessRoute>
                    }
                />

                <Route
                    path="contabilidad"
                    element={
                        <AccessRoute accessRule={moduleAccessRule(Modulo.CONTABILIDAD)}>
                            <ContabilidadPage/>
                        </AccessRoute>
                    }
                />

                <Route
                    path="personal"
                    element={
                        <AccessRoute accessRule={moduleAccessRule(Modulo.PERSONAL_PLANTA)}>
                            <PersonalPage/>
                        </AccessRoute>
                    }
                />

                <Route
                    path="bintelligence"
                    element={
                        <AccessRoute accessRule={moduleAccessRule(Modulo.BINTELLIGENCE)}>
                            <BintelligencePage/>
                        </AccessRoute>
                    }
                />

                {/* Módulo Pagos a Proveedores temporalmente oculto */}
                {/* <Route
                    path="pagos-proveedores"
                    element={
                        <AccessRoute accessRule={moduleAccessRule(Modulo.PAGOS_PROVEEDORES)}>
                            <PagosProveedoresPage/>
                        </AccessRoute>
                    }
                /> */}

            </Route>
        </>
    )
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
