// src/components/CancelarOrdenDialog.tsx
import React, { useEffect, useState } from 'react';
import { Steps, Button, Text, Input, Dialog, Portal } from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import { OrdenCompraMateriales } from '../types.tsx';

interface CancelarOrdenDialogProps {
    isOpen: boolean;
    onClose: () => void;
    orden: OrdenCompraMateriales;
    onOrderCancelled?: () => void;
}

const CancelarOrdenDialog: React.FC<CancelarOrdenDialogProps> = ({ isOpen, onClose, orden, onOrderCancelled }) => {
    const [randomCode, setRandomCode] = useState<string>('');
    const [inputCode, setInputCode] = useState<string>('');
    const [isCancelling, setIsCancelling] = useState<boolean>(false);
    const toast = useAppToast();


    useEffect(() => {
        if (isOpen) {
            // Generate a random 7-digit number as a string.
            const code = Math.floor(1000000 + Math.random() * 9000000).toString();
            setRandomCode(code);
            setInputCode('');
        }
    }, [isOpen]);

    const handleAnularOrden = async () => {
        if (inputCode === randomCode) {
            try {
                setIsCancelling(true);
                // Call the backend endpoint to cancel the order.
                await axios.put(`${EndPointsURL.getDomain()}/compras/orden_compra/${orden.ordenCompraId}/cancel`);
                toast({
                    title: "Orden cancelada",
                    description: "La orden ha sido cancelada exitosamente.",
                    status: "success",
                    duration: 5000,
                    isClosable: true,
                });
                if (onOrderCancelled) {
                    onOrderCancelled();
                }
            } catch (error) {
                console.error(error);
                toast({
                    title: "Error",
                    description: "No se pudo cancelar la orden. Inténtelo de nuevo.",
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
            } finally {
                setIsCancelling(false);
            }
        } else {
            toast({
                title: "Código incorrecto",
                description: "El código ingresado no coincide. La orden no fue cancelada.",
                status: "warning",
                duration: 5000,
                isClosable: true,
            });
        }
        onClose();
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>Confirmar Cancelación de Orden de Compra</Dialog.Header>
                        <Dialog.Body>
                            <Text mb={4}>
                                Para confirmar la cancelación de la orden de compra, digite los 7 dígitos que ve en pantalla y de click en "Anular Orden de Compra".
                            </Text>
                            <Text fontWeight="bold" mb={4}>Código: {randomCode}</Text>
                            <Input
                                placeholder="Ingrese el código aquí"
                                value={inputCode}
                                onValueChange={(e) => setInputCode(e.target.value)}
                            />
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button
                                colorPalette="red"
                                mr={3}
                                onClick={handleAnularOrden}
                                loading={isCancelling}
                                loadingText="Anulando..."
                            >
                                Anular Orden
                            </Button>
                            <Button variant="ghost" onClick={onClose}>Atrás</Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
};

export default CancelarOrdenDialog;
