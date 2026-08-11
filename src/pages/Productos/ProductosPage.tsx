import { useState } from 'react';
import { Container } from '@chakra-ui/react';

import MyHeader from '../../components/MyHeader.tsx';
import ProductosMenuSelection from './ProductosMenuSelection';
import BasicOperationsTabs from './Basic/BasicOperationsTabs.tsx';
import TerminadosSemiterminadosTabs from './DefSemiTer/TerminadosSemiterminadosTabs.tsx';
import DefinicionProcesosTabs from './DefProcesses/DefinicionProcesosTabs.tsx';

function ProductosPage() {
    const [viewMode, setViewMode] = useState<'menu' | 'basic' | 'terminados' | 'procesos'>('menu');

    function renderContent() {
        switch (viewMode) {
            case 'basic':
                return <BasicOperationsTabs onBack={() => setViewMode('menu')} />;
            case 'terminados':
                return <TerminadosSemiterminadosTabs onBack={() => setViewMode('menu')} />;
            case 'procesos':
                return <DefinicionProcesosTabs onBack={() => setViewMode('menu')} />;
            default:
                return <ProductosMenuSelection setViewMode={setViewMode} />;
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
