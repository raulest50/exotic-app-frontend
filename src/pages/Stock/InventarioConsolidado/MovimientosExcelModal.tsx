import { useState, useEffect } from 'react';
import { Input, Button, Field, Dialog, Portal } from '@chakra-ui/react';

/**
 * Modal for selecting a date range before exporting product movements.
 *
 * Validates that both dates are provided and that the start date is not
 * greater than the end date before enabling the confirmation button.
 */
interface MovimientosExcelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (startDate: string, endDate: string) => void;
}

function MovimientosExcelModal({ isOpen, onClose, onConfirm }: MovimientosExcelModalProps) {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const isDownloadDisabled = !startDate || !endDate || startDate > endDate;

    // Reset the date fields each time the modal is opened to provide a clean state.
    useEffect(() => {
        if (isOpen) {
            setStartDate('');
            setEndDate('');
        }
    }, [isOpen]);

    const handleConfirm = () => {
        onConfirm(startDate, endDate);
        onClose();
    };

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
                        <Dialog.Header><Dialog.Title>Seleccionar rango de fechas</Dialog.Title></Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body>
                            <Field.Root>
                                <Field.Label>Fecha inicio</Field.Label>
                                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            </Field.Root>
                            <Field.Root mt={4}>
                                <Field.Label>Fecha fin</Field.Label>
                                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                            </Field.Root>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button mr={3} onClick={onClose}>Cancelar</Button>
                            <Button colorPalette="teal" onClick={handleConfirm} disabled={isDownloadDisabled}>
                                Descargar
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
}

export default MovimientosExcelModal;

