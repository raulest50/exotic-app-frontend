import { useState } from 'react';
import TerminadoPicker, { TerminadoPickerResult } from './TerminadoPicker.tsx';
import { Button, Box, Text, VStack, Badge, HStack } from '@chakra-ui/react';

export const Default = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedTerminado, setSelectedTerminado] = useState<TerminadoPickerResult | null>(null);

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    const handleSelectTerminado = (terminado: TerminadoPickerResult) => {
        setSelectedTerminado(terminado);
        console.log('Selected terminado:', terminado);
    };

    return (
        <VStack spacing={4} align="start" p={5}>
            <Button colorScheme="blue" onClick={handleOpen}>
                Abrir Selector de Producto Terminado
            </Button>

            {selectedTerminado && (
                <Box p={4} borderWidth="1px" borderRadius="md" bg="gray.50" width="100%">
                    <Text fontWeight="bold">Producto Seleccionado:</Text>
                    <Text>ID: {selectedTerminado.productoId}</Text>
                    <HStack>
                        <Text>Nombre: {selectedTerminado.nombre}</Text>
                        {selectedTerminado.tipo_producto && (
                            <Badge colorScheme="purple">{selectedTerminado.tipo_producto}</Badge>
                        )}
                    </HStack>
                </Box>
            )}

            <TerminadoPicker
                isOpen={isOpen}
                onClose={handleClose}
                onSelectTerminado={handleSelectTerminado}
            />
        </VStack>
    );
};

export default {
    title: 'Components/TerminadoPicker',
    component: TerminadoPicker,
};
