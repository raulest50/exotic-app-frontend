
import { Button, List, Text, Dialog, Portal } from '@chakra-ui/react';

interface ItemCompra {
    itemCompraId: number;
    materiaPrima: {
        nombre: string;
    };
    cantidad: number;
    precioCompra: number;
}

interface CompraItemsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    itemsCompra: ItemCompra[];
}

function CompraItemsDialog({ isOpen, onClose, itemsCompra }: CompraItemsDialogProps) {
    return (
        <Dialog.Root open={isOpen} size='lg' onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header><Dialog.Title>Items de la Compra</Dialog.Title></Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body>
                            <List.Root gap={3}>
                                {itemsCompra.map((item) => (
                                    <List.Item key={item.itemCompraId}>
                                        <Text>
                                            <strong>Materia Prima:</strong> {item.materiaPrima.nombre}
                                        </Text>
                                        <Text>
                                            <strong>Cantidad:</strong> {item.cantidad}
                                        </Text>
                                        <Text>
                                            <strong>Precio de Compra:</strong> {item.precioCompra}
                                        </Text>
                                    </List.Item>
                                ))}
                            </List.Root>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button colorPalette="teal" mr={3} onClick={onClose}>
                                Cerrar
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
}

export default CompraItemsDialog;
