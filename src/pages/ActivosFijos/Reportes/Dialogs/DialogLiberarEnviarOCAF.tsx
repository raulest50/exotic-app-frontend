import React, { useEffect, useState } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    Button,
    Box,
    Text,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Input,
    Select,
    useToast,
    VStack,
    HStack
} from '@chakra-ui/react';
import axios from 'axios';
import EndPointsURL from '../../../../api/EndPointsURL';
import { OrdenCompraActivo, getEstadoOCAFText } from '../../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    orden: OrdenCompraActivo;
    onEstadoActualizado?: (orden: OrdenCompraActivo) => void;
}

enum TipoEnvio {
    MANUAL = 'MANUAL',
    EMAIL = 'EMAIL',
    WHATSAPP = 'WHATSAPP'
}

const DialogLiberarEnviarOCAF: React.FC<Props> = ({ isOpen, onClose, orden, onEstadoActualizado }) => {
    const [randomCode, setRandomCode] = useState('');
    const [inputCode, setInputCode] = useState('');
    const [tipoEnvio, setTipoEnvio] = useState<TipoEnvio>(TipoEnvio.MANUAL);
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();

    useEffect(() => {
        if (isOpen) {
            const code = Math.floor(1000 + Math.random() * 9000).toString();
            setRandomCode(code);
            setInputCode('');
            if (hasEmail()) {
                setTipoEnvio(TipoEnvio.EMAIL);
            } else if (hasPhone()) {
                setTipoEnvio(TipoEnvio.WHATSAPP);
            } else {
                setTipoEnvio(TipoEnvio.MANUAL);
            }
        }
    }, [isOpen]);

    const hasEmail = () => {
        return orden.proveedor?.contactos?.some(c => c.email && c.email.trim() !== '') ?? false;
    };

    const hasPhone = () => {
        return orden.proveedor?.contactos?.some(c => c.cel && c.cel.trim() !== '') ?? false;
    };

    const updateEstado = async (newEstado: number) => {
        const formData = new FormData();
        const requestData = newEstado === 2 ? { newEstado, tipoEnvio } : { newEstado };
        formData.append('request', new Blob([JSON.stringify(requestData)], { type: 'application/json' }), 'request');
        try {
            const response = await axios.put(
                `${EndPointsURL.getDomain()}/api/activos-fijos/ocaf/${orden.ordenCompraActivoId}/updateEstado`,
                formData
            );
            if (onEstadoActualizado) onEstadoActualizado(response.data);
            toast({
                title: 'Estado actualizado',
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
        } catch (e) {
            toast({
                title: 'Error',
                description: 'No se pudo actualizar el estado de la orden.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleLiberar = async () => {
        if (inputCode === randomCode) {
            await updateEstado(1);
            onClose();
        } else {
            toast({
                title: 'Código incorrecto',
                status: 'warning',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleEnviar = async () => {
        if (inputCode === randomCode) {
            setIsLoading(true);
            await updateEstado(2);
            setIsLoading(false);
            onClose();
        } else {
            toast({
                title: 'Código incorrecto',
                status: 'warning',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const renderDetails = () => (
        <Box mb={4}>
            <Text><strong>ID:</strong> {orden.ordenCompraActivoId}</Text>
            <Text><strong>Fecha Emisión:</strong> {orden.fechaEmision ? new Date(orden.fechaEmision).toLocaleString() : '-'}</Text>
            <Text><strong>Fecha Vencimiento:</strong> {orden.fechaVencimiento ? new Date(orden.fechaVencimiento).toLocaleDateString() : '-'}</Text>
            <Text><strong>Proveedor:</strong> {orden.proveedor?.nombre ?? '-'}</Text>
            <Text><strong>Total a Pagar:</strong> {orden.totalPagar}</Text>
            <Text><strong>Estado:</strong> {getEstadoOCAFText(orden.estado)}</Text>
            <Text><strong>Condición de Pago:</strong> {orden.condicionPago}</Text>
            <Text><strong>Tiempo de Entrega:</strong> {orden.tiempoEntrega}</Text>
            <Text><strong>Plazo de Pago:</strong> {orden.plazoPago}</Text>
        </Box>
    );

    const renderItems = () => (
        <Box>
            {orden.itemsOrdenCompra && orden.itemsOrdenCompra.length > 0 && (
                <Table variant='simple' size='sm'>
                    <Thead>
                        <Tr>
                            <Th>ID</Th>
                            <Th>Descripción</Th>
                            <Th isNumeric>Cantidad</Th>
                            <Th isNumeric>Precio Unitario</Th>
                            <Th isNumeric>IVA</Th>
                            <Th isNumeric>Subtotal</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {orden.itemsOrdenCompra.map(item => (
                            <Tr key={item.itemOrdenId}>
                                <Td>{item.itemOrdenId}</Td>
                                <Td>{item.nombre}</Td>
                                <Td isNumeric>{item.cantidad}</Td>
                                <Td isNumeric>{item.precioUnitario}</Td>
                                <Td isNumeric>{item.ivaValue}</Td>
                                <Td isNumeric>{item.subTotal}</Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            )}
        </Box>
    );

    const renderContent = () => {
        if (orden.estado === 0) {
            return (
                <>
                    {renderDetails()}
                    {renderItems()}
                    <VStack mt={4} align='center'>
                        <Text fontWeight='bold'>Código: {randomCode}</Text>
                        <Input maxW='200px' value={inputCode} onChange={(e)=>setInputCode(e.target.value)} placeholder='Digite código'/>
                        <Button colorScheme='green' onClick={handleLiberar}>Liberar Orden</Button>
                    </VStack>
                </>
            );
        }
        if (orden.estado === 1) {
            return (
                <>
                    {renderDetails()}
                    {renderItems()}
                    <VStack mt={4} align='center'>
                        <Text fontWeight='bold'>Código: {randomCode}</Text>
                        <HStack>
                            <Select value={tipoEnvio} onChange={e=>setTipoEnvio(e.target.value as TipoEnvio)}>
                                <option value={TipoEnvio.MANUAL}>{TipoEnvio.MANUAL}</option>
                                {hasEmail() && <option value={TipoEnvio.EMAIL}>CORREO ELECTRÓNICO</option>}
                                {hasPhone() && <option value={TipoEnvio.WHATSAPP}>WHATSAPP</option>}
                            </Select>
                            <Input maxW='200px' value={inputCode} onChange={e=>setInputCode(e.target.value)} placeholder='Digite código'/>
                            <Button colorScheme='green' onClick={handleEnviar} isLoading={isLoading} loadingText='Enviando'>Enviar a Proveedor</Button>
                        </HStack>
                    </VStack>
                </>
            );
        }
        return (
            <Box textAlign='center' p='1em'>
                <Text>La orden ya no se puede modificar.</Text>
            </Box>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size={['auto','4xl']} scrollBehavior='inside'>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Actualizar Estado Orden Compra AF</ModalHeader>
                <ModalCloseButton />
                <ModalBody>{renderContent()}</ModalBody>
                <ModalFooter>
                    <Button colorScheme='blue' onClick={onClose}>Cerrar</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default DialogLiberarEnviarOCAF;
