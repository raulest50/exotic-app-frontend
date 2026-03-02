import {
    Box,
    Button,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    VStack,
    SimpleGrid,
} from '@chakra-ui/react';
import { AreaOperativa } from './types';

interface DetalleAreaOperativaDialogProps {
    isOpen: boolean;
    onClose: () => void;
    area: AreaOperativa | null;
}

export default function DetalleAreaOperativaDialog({ isOpen, onClose, area }: DetalleAreaOperativaDialogProps) {
    if (!area) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader fontFamily="Comfortaa Variable">
                    Detalle del Área Operativa
                </ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack align="stretch" spacing={4}>
                        <Box>
                            <Text fontWeight="bold" mb={2} fontSize="md">Información del Área</Text>
                            <SimpleGrid columns={2} spacing={2}>
                                <Text fontWeight="semibold">ID:</Text>
                                <Text>{area.areaId}</Text>
                                <Text fontWeight="semibold">Nombre:</Text>
                                <Text>{area.nombre}</Text>
                                <Text fontWeight="semibold">Descripción:</Text>
                                <Text>{area.descripcion || '—'}</Text>
                            </SimpleGrid>
                        </Box>

                        <Box>
                            <Text fontWeight="bold" mb={2} fontSize="md">Responsable</Text>
                            {area.responsableArea ? (
                                <SimpleGrid columns={2} spacing={2}>
                                    <Text fontWeight="semibold">Cédula:</Text>
                                    <Text>{area.responsableArea.cedula}</Text>
                                    <Text fontWeight="semibold">Nombre:</Text>
                                    <Text>{area.responsableArea.nombreCompleto || area.responsableArea.username}</Text>
                                    <Text fontWeight="semibold">Correo:</Text>
                                    <Text>{area.responsableArea.username}</Text>
                                </SimpleGrid>
                            ) : (
                                <Text color="gray.500">Sin responsable asignado</Text>
                            )}
                        </Box>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button colorScheme="blue" onClick={onClose}>
                        Cerrar
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
