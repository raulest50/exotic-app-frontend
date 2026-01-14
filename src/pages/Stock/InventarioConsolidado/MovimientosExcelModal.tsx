import { useState, useEffect } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    FormControl,
    FormLabel,
    Input,
    Button
} from '@chakra-ui/react';

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
        <Modal isOpen={isOpen} onClose={onClose} isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Seleccionar rango de fechas</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <FormControl>
                        <FormLabel>Fecha inicio</FormLabel>
                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </FormControl>
                    <FormControl mt={4}>
                        <FormLabel>Fecha fin</FormLabel>
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </FormControl>
                </ModalBody>
                <ModalFooter>
                    <Button mr={3} onClick={onClose}>Cancelar</Button>
                    <Button colorScheme="teal" onClick={handleConfirm} isDisabled={isDownloadDisabled}>
                        Descargar
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

export default MovimientosExcelModal;

