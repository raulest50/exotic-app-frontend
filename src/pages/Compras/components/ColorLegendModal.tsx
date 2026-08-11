import React from 'react';
import { Button, Box, Text, Flex, Dialog, Portal } from '@chakra-ui/react';

interface ColorLegendModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ColorLegendModal: React.FC<ColorLegendModalProps> = ({ isOpen, onClose }) => {
    const colorLegends = [
        { estado: 'Cancelada', color: 'red.200' },
        { estado: 'Pendiente liberación', color: 'yellow.200' },
        { estado: 'Pendiente envío a proveedor', color: 'orange.200' },
        { estado: 'Pendiente recepción en almacén', color: 'blue.200' },
        { estado: 'Cerrada exitosamente', color: 'green.200' },
    ];

    return (
        <Dialog.Root open={isOpen} placement='center' onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header><Dialog.Title>Convención de Colores</Dialog.Title></Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body>
                            <Text mb={4}>
                                La siguiente convención de colores se utiliza para identificar visualmente el estado de las órdenes de compra:
                            </Text>
                            {colorLegends.map((legend, index) => (
                                <Flex key={index} mb={2} alignItems="center">
                                    <Box 
                                        width="20px" 
                                        height="20px" 
                                        bg={legend.color} 
                                        borderRadius="md" 
                                        mr={3} 
                                        border="1px solid" 
                                        borderColor="app.border"
                                    />
                                    <Text>{legend.estado}</Text>
                                </Flex>
                            ))}
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button colorPalette="blue" mr={3} onClick={onClose}>
                                Cerrar
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
};

export default ColorLegendModal;
