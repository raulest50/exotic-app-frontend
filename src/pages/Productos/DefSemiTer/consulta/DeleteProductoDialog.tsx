import { Steps, Button, Text, Input, Dialog, Portal } from '@chakra-ui/react';
import { useEffect, useState } from 'react';

interface DeleteProductoDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<boolean | void> | boolean | void;
}

export default function DeleteProductoDialog({ isOpen, onClose, onConfirm }: DeleteProductoDialogProps) {
    const [randomCode, setRandomCode] = useState('');
    const [inputCode, setInputCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleClose = () => {
        setIsLoading(false);
        onClose();
    };

    useEffect(() => {
        if (isOpen) {
            setRandomCode(Math.floor(1000 + Math.random() * 9000).toString());
            setInputCode('');
        } else {
            setIsLoading(false);
        }
    }, [isOpen]);

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            const shouldClose = await onConfirm();
            if (shouldClose !== false) {
                handleClose();
                return;
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={e => {
            if (!e.open) {
                handleClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>Confirmar Eliminación</Dialog.Header>
                        <Dialog.Body>
                            <Text mb={4}>
                                Para confirmar la eliminación del producto, ingrese el siguiente código:
                            </Text>
                            <Text fontWeight="bold" mb={4}>Código: {randomCode}</Text>
                            <Input
                                placeholder="Ingrese el código aquí"
                                value={inputCode}
                                onValueChange={(e) => setInputCode(e.target.value)}
                                disabled={isLoading}
                            />
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button
                                colorPalette="red"
                                mr={3}
                                onClick={handleConfirm}
                                disabled={inputCode !== randomCode || isLoading}
                                loading={isLoading}
                            >
                                Eliminar
                            </Button>
                            <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
                                Cancelar
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
}

