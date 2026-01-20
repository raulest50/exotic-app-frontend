import { useState, useEffect } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalCloseButton,
    Button,
    FormControl,
    FormLabel,
    Input,
    Text,
    useToast,
} from '@chakra-ui/react';
import axios from 'axios';
import { OrdenCompra } from '../../types';
import EndPointsURL from '../../../../api/EndPointsURL';

interface CerrarOrdenDialogProps {
    isOpen: boolean;
    onClose: () => void;
    orden: OrdenCompra | null;
    setActiveStep: (step: number) => void;
}

export function CerrarOrdenDialog({ isOpen, onClose, orden, setActiveStep }: CerrarOrdenDialogProps) {
    const toast = useToast();
    const endpoints = new EndPointsURL();
    const [token, setToken] = useState<string>('');
    const [inputToken, setInputToken] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    // Generar token aleatorio de 4 dígitos cada vez que se abre el modal
    useEffect(() => {
        if (isOpen) {
            const newToken = Math.floor(1000 + Math.random() * 9000).toString();
            setToken(newToken);
            setInputToken(''); // Limpiar input al abrir
        }
    }, [isOpen]);

    // Limpiar estados al cerrar el modal
    const handleClose = () => {
        setInputToken('');
        setToken('');
        onClose();
    };

    const handleCerrarOrden = async () => {
        if (!orden?.ordenCompraId) {
            toast({
                title: 'Error',
                description: 'No se puede cerrar la orden: ID no válido.',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        if (inputToken !== token) {
            toast({
                title: 'Token incorrecto',
                description: 'El token ingresado no coincide.',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setIsLoading(true);
        try {
            const url = endpoints.close_orden_compra.replace('{ordenCompraId}', orden.ordenCompraId.toString());
            await axios.put(url, {}, {
                withCredentials: true,
            });

            toast({
                title: 'Orden cerrada exitosamente',
                description: `La orden de compra ${orden.ordenCompraId} ha sido cerrada correctamente.`,
                status: 'success',
                duration: 4000,
                isClosable: true,
            });

            handleClose();
            setActiveStep(0); // Retornar a IngresoOCMStep0SelectPurchaseOrder
        } catch (error: any) {
            console.error('Error al cerrar la orden:', error);
            const errorMessage = error.response?.data?.error || 
                                error.response?.data?.message ||
                                error.message || 
                                'No se pudo cerrar la orden de compra. Intente nuevamente.';
            
            toast({
                title: 'Error al cerrar la orden',
                description: errorMessage,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const isTokenValid = inputToken === token && inputToken.length === 4;

    return (
        <Modal isOpen={isOpen} onClose={handleClose} isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader fontFamily="Comfortaa Variable">
                    Cerrar Orden de Compra
                </ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <Text fontFamily="Comfortaa Variable" mb={4}>
                        Está a punto de cerrar la orden de compra <strong>#{orden?.ordenCompraId}</strong>.
                        Para confirmar esta acción, ingrese el token de verificación mostrado a continuación.
                    </Text>
                    
                    <FormControl mb={4}>
                        <FormLabel fontFamily="Comfortaa Variable">Token de verificación</FormLabel>
                        <Text 
                            fontFamily="Comfortaa Variable" 
                            fontSize="xl" 
                            fontWeight="bold" 
                            color="teal.600"
                            mb={2}
                        >
                            {token}
                        </Text>
                        <Input
                            placeholder="Ingrese el token"
                            value={inputToken}
                            onChange={(e) => setInputToken(e.target.value)}
                            maxLength={4}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                        />
                    </FormControl>

                    <Text fontFamily="Comfortaa Variable" fontSize="sm" color="gray.600">
                        Ingrese el token de 4 dígitos mostrado arriba para habilitar el botón de cierre.
                    </Text>
                </ModalBody>

                <ModalFooter>
                    <Button 
                        variant="ghost" 
                        mr={3} 
                        onClick={handleClose}
                        isDisabled={isLoading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        colorScheme="red"
                        onClick={handleCerrarOrden}
                        isDisabled={!isTokenValid}
                        isLoading={isLoading}
                        loadingText="Cerrando..."
                    >
                        Cerrar Orden de Compra
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
