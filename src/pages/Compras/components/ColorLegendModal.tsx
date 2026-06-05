import React from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Button,
    Box,
    Text,
    Flex,
} from '@chakra-ui/react';

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
        <Modal isOpen={isOpen} onClose={onClose} isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Convención de Colores</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
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
                </ModalBody>
                <ModalFooter>
                    <Button colorScheme="blue" mr={3} onClick={onClose}>
                        Cerrar
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default ColorLegendModal;
