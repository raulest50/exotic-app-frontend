import { useState, useEffect } from 'react';
import { Steps, Button, Input, Text, useToast, Field, Dialog, Portal } from '@chakra-ui/react';
import { OrdenCompra } from '../../types';
import { closeOrdenCompraOcm } from '../ocmIngresoApi';

interface CerrarOrdenDialogProps {
    isOpen: boolean;
    onClose: () => void;
    orden: OrdenCompra | null;
    setActiveStep: (step: number) => void;
}

export function CerrarOrdenDialog({ isOpen, onClose, orden, setActiveStep }: CerrarOrdenDialogProps) {
    const toast = useToast();
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
            await closeOrdenCompraOcm(orden.ordenCompraId);

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
        <Dialog.Root open={isOpen} placement='center' onOpenChange={e => {
            if (!e.open) {
                handleClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header fontFamily="Comfortaa Variable">
                            Cerrar Orden de Compra
                        </Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body>
                            <Text fontFamily="Comfortaa Variable" mb={4}>
                                Está a punto de cerrar la orden de compra <strong>#{orden?.ordenCompraId}</strong>.
                                Para confirmar esta acción, ingrese el token de verificación mostrado a continuación.
                            </Text>
                            
                            <Field.Root mb={4}>
                                <Field.Label fontFamily="Comfortaa Variable">Token de verificación</Field.Label>
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
                                    onValueChange={(e) => setInputToken(e.target.value)}
                                    maxLength={4}
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                />
                            </Field.Root>

                            <Text fontFamily="Comfortaa Variable" fontSize="sm" color="app.textMuted">
                                Ingrese el token de 4 dígitos mostrado arriba para habilitar el botón de cierre.
                            </Text>
                        </Dialog.Body>

                        <Dialog.Footer>
                            <Button 
                                variant="ghost" 
                                mr={3} 
                                onClick={handleClose}
                                disabled={isLoading}
                            >
                                Cancelar
                            </Button>
                            <Button
                                colorPalette="red"
                                onClick={handleCerrarOrden}
                                disabled={!isTokenValid}
                                loading={isLoading}
                                loadingText="Cerrando..."
                            >
                                Cerrar Orden de Compra
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
}
