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
import {
    getEmpresaIdentidadDocumentalVigente,
    getEmpresaLogoVersionDataUrl,
    type EmpresaIdentidadDocumento,
} from '../../../../api/EmpresaIdentidadDocumentalApi';
import OCAF_PDF_Generator from '../../OCAF_PDF_Generator';
import { OrdenCompraActivo, getEstadoOCAFText } from '../../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    orden: OrdenCompraActivo;
    onEstadoActualizado?: (orden: OrdenCompraActivo) => void;
}

enum TipoEnvio {
    MANUAL = 'MANUAL',
    EMAIL = 'EMAIL'
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
            } else {
                setTipoEnvio(TipoEnvio.MANUAL);
            }
        }
    }, [isOpen]);

    const hasEmail = () => {
        return orden.proveedor?.contactos?.some(c => c.email && c.email.trim() !== '') ?? false;
    };

    const updateEstado = async (newEstado: number): Promise<boolean> => {
        const formData = new FormData();
        try {
            let identidadLegal: EmpresaIdentidadDocumento | null = null;
            let logoVersionId: number | null = null;

            if (newEstado === 2) {
                const identidadHistorica = orden.empresaIdentidadLegalVersion;
                const logoHistorico = orden.empresaLogoDocumentalVersion;
                if (identidadHistorica || logoHistorico) {
                    if (!identidadHistorica || !logoHistorico?.id) {
                        throw new Error('La OCA tiene una asociación documental histórica incompleta.');
                    }
                    identidadLegal = identidadHistorica;
                    logoVersionId = logoHistorico.id;
                } else {
                    const vigente = await getEmpresaIdentidadDocumentalVigente();
                    identidadLegal = vigente.identidadLegal;
                    logoVersionId = vigente.logo.id;
                }
            }

            const requestData = newEstado === 2
                ? {
                    newEstado,
                    tipoEnvio,
                    empresaIdentidadLegalVersionId: identidadLegal?.id,
                    empresaLogoDocumentalVersionId: logoVersionId,
                }
                : { newEstado };
            formData.append(
                'request',
                new Blob([JSON.stringify(requestData)], { type: 'application/json' }),
                'request'
            );

            if (newEstado === 2 && tipoEnvio === TipoEnvio.EMAIL) {
                if (!identidadLegal || !logoVersionId) {
                    throw new Error('No se definió la identidad documental para generar la OCA.');
                }
                const logoDataUrl = await getEmpresaLogoVersionDataUrl(logoVersionId);
                const generator = new OCAF_PDF_Generator();
                const pdf = await generator.getOCAFpdf_Blob(
                    orden,
                    identidadLegal,
                    { logoDataUrl, logoVersionId }
                );
                formData.append(
                    'OCAFpdf',
                    pdf,
                    `orden-compra-activo-${orden.ordenCompraActivoId}.pdf`
                );
            }

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
            return true;
        } catch (error) {
            const responseData = axios.isAxiosError(error) ? error.response?.data : undefined;
            const backendMessage =
                typeof responseData === 'string'
                    ? responseData
                    : responseData && typeof responseData === 'object'
                        ? [responseData.detail, responseData.error, responseData.message]
                            .find((value): value is string => typeof value === 'string' && value.length > 0)
                        : undefined;
            toast({
                title: 'Error',
                description:
                    backendMessage
                    ?? (error instanceof Error ? error.message : undefined)
                    ?? 'No se pudo actualizar el estado de la orden.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            return false;
        }
    };

    const handleLiberar = async () => {
        if (inputCode === randomCode) {
            const updated = await updateEstado(1);
            if (updated) onClose();
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
            try {
                const updated = await updateEstado(2);
                if (updated) onClose();
            } finally {
                setIsLoading(false);
            }
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
