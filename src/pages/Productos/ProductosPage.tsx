/**
 * Componente: ProductosPage
 * 
 * Ubicación en la navegación:
 * Productos (módulo principal)
 * 
 * Descripción:
 * Componente principal del módulo de Productos que gestiona la navegación entre las
 * diferentes secciones: Basic, Definir Terminado/Semiterminado y Definición de Procesos.
 * 
 * Estructura de navegación:
 * - Productos (ProductosPage.tsx)
 *   ├── Basic (BasicOperationsTabs.tsx)
 *   │   ├── Codificar Material (CodificarMaterialesTab.tsx)
 *   │   └── Consulta (InformeProductosTab.tsx)
 *   │       └── Ver Detalle (DetalleProducto.tsx)
 *   │
 *   ├── Definir Terminado/Semiterminado (TerminadosSemiterminadosTabs.tsx)
 *   │   ├── Codificar Terminado/Semiterminado (CodificarSemioTermiTab.tsx)
 *   │   ├── Categorías (CategoriasTab.tsx)
 *   │   └── Modificaciones (InformeProductosTabAdvanced.tsx)
 *   │       └── Ver Detalle (DetalleProductoAdvanced.tsx)
 *   │
 *   └── Definición de Procesos (DefinicionProcesosTabs.tsx)
 *       ├── Definición de Procesos (DefinicionProcesosTab.tsx)
 *       ├── Consultar Procesos de Producción (ConsultaProcesosProduccion.tsx)
 *       ├── Crear Recurso Producción (CrearRecursoProduccion.tsx)
 *       └── Consulta Recursos Producción (ConsultaRecursosProduccion.tsx)
 */

import {useState} from 'react';
import {Container} from '@chakra-ui/react';
import {Modulo} from '../Usuarios/GestionUsuarios/types.tsx';
import {useModuleAccessLevel} from '../../auth/usePermissions';

import MyHeader from '../../components/MyHeader.tsx';
import ProductosMenuSelection from './ProductosMenuSelection';
import BasicOperationsTabs from './Basic/BasicOperationsTabs.tsx';
import TerminadosSemiterminadosTabs from './DefSemiTer/TerminadosSemiterminadosTabs.tsx';
import DefinicionProcesosTabs from './DefProcesses/DefinicionProcesosTabs.tsx';

function ProductosPage() {
    const { nivel: productosAccessLevel } = useModuleAccessLevel(Modulo.PRODUCTOS);

    const [viewMode, setViewMode] = useState<'menu' | 'basic' | 'terminados' | 'procesos'>('menu');

    function renderContent() {
        switch (viewMode) {
            case 'basic':
                return (
                    <BasicOperationsTabs
                        productosAccessLevel={productosAccessLevel}
                        onBack={() => setViewMode('menu')}
                    />
                );
            case 'terminados':
                return (
                    <TerminadosSemiterminadosTabs
                        productosAccessLevel={productosAccessLevel}
                        onBack={() => setViewMode('menu')}
                    />
                );
            case 'procesos':
                return <DefinicionProcesosTabs onBack={() => setViewMode('menu')} />;
            default:
                return (
                    <ProductosMenuSelection
                        setViewMode={setViewMode}
                        productosAccessLevel={productosAccessLevel}
                    />
                );
        }
    }

    return (
        <Container minW={['auto', 'container.lg', 'container.xl']} w="full" h="full">
            <MyHeader title="Productos" />
            {renderContent()}
        </Container>
    );
}

export default ProductosPage;
