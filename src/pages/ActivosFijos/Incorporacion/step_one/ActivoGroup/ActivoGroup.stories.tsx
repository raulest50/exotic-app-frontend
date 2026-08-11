import React, { useState } from 'react';
import { Box } from '@chakra-ui/react';
import { ActivoGroup } from './ActivoGroup';
import { ActivoFijo, TIPO_INCORPORACION } from '../../../types';

// Sample item for the stories
const sampleItem = {
    itemOrdenId: 1,
    ordenCompraActivoId: 100,
    nombre: "Laptop Dell XPS 15",
    cantidad: 3,
    precioUnitario: 1500,
    ivaPercentage: 19,
    ivaValue: 285,
    subTotal: 1785
};

// Default story - CON_OC (add button disabled, remove enabled when there are items)
export const ConOrdenCompra = () => {
    const [activoGroup, setActivoGroup] = useState<ActivoFijo[]>([]);

    return (
        <Box maxWidth="1000px" margin="0 auto" padding="20px">
            <h2>Grupo de Activos - Con Orden de Compra</h2>
            <ActivoGroup 
                itemOrdenCompraActivo={sampleItem}
                setActivoFijoGroup={setActivoGroup}
                tipoIncorporacion={TIPO_INCORPORACION.CON_OC}
            />
            
            <Box mt={6} p={4} borderWidth="1px" borderRadius="lg" bg="gray.50">
                <h3>Estado actual:</h3>
                <pre>{JSON.stringify(activoGroup, null, 2)}</pre>
            </Box>
        </Box>
    );
};

// Story with SIN_OC (add button enabled, remove disabled)
export const SinOrdenCompra = () => {
    const [activoGroup, setActivoGroup] = useState<ActivoFijo[]>([]);

    return (
        <Box maxWidth="1000px" margin="0 auto" padding="20px">
            <h2>Grupo de Activos - Sin Orden de Compra</h2>
            <ActivoGroup 
                itemOrdenCompraActivo={sampleItem}
                setActivoFijoGroup={setActivoGroup}
                tipoIncorporacion={TIPO_INCORPORACION.SIN_OC}
            />
            
            <Box mt={6} p={4} borderWidth="1px" borderRadius="lg" bg="gray.50">
                <h3>Estado actual:</h3>
                <pre>{JSON.stringify(activoGroup, null, 2)}</pre>
            </Box>
        </Box>
    );
};

// Story with AF_EXISTENTE (add button enabled, remove disabled)
export const ActivoExistente = () => {
    const [activoGroup, setActivoGroup] = useState<ActivoFijo[]>([]);

    return (
        <Box maxWidth="1000px" margin="0 auto" padding="20px">
            <h2>Grupo de Activos - Activo Existente</h2>
            <ActivoGroup 
                itemOrdenCompraActivo={sampleItem}
                setActivoFijoGroup={setActivoGroup}
                tipoIncorporacion={TIPO_INCORPORACION.AF_EXISTENTE}
            />
            
            <Box mt={6} p={4} borderWidth="1px" borderRadius="lg" bg="gray.50">
                <h3>Estado actual:</h3>
                <pre>{JSON.stringify(activoGroup, null, 2)}</pre>
            </Box>
        </Box>
    );
};