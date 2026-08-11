import React, { useEffect, useState } from 'react';
import {
    CloseButton,
    Button,
    Box,
    Text,
    Table,
    Input,
    NativeSelect,
    VStack,
    HStack,
    Dialog,
    Portal,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
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
    const toast = useAppToast();

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
                <Table.Root variant='line' size='sm'>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader>ID</Table.ColumnHeader>
                            <Table.ColumnHeader>Descripción</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign='end'>Cantidad</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign='end'>Precio Unitario</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign='end'>IVA</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign='end'>Subtotal</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {orden.itemsOrdenCompra.map(item => (
                            <Table.Row key={item.itemOrdenId}>
                                <Table.Cell>{item.itemOrdenId}</Table.Cell>
                                <Table.Cell>{item.nombre}</Table.Cell>
                                <Table.Cell textAlign='end'>{item.cantidad}</Table.Cell>
                                <Table.Cell textAlign='end'>{item.precioUnitario}</Table.Cell>
                                <Table.Cell textAlign='end'>{item.ivaValue}</Table.Cell>
                                <Table.Cell textAlign='end'>{item.subTotal}</Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
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
                        <Button colorPalette='green' onClick={handleLiberar}>Liberar Orden</Button>
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
                            <NativeSelect.Root>
                                <NativeSelect.Field
                                    value={tipoEnvio}
                                    onChange={e=>setTipoEnvio(e.target.value as TipoEnvio)}>
                                    <option value={TipoEnvio.MANUAL}>{TipoEnvio.MANUAL}</option>
                                    {hasEmail() && <option value={TipoEnvio.EMAIL}>CORREO ELECTRÓNICO</option>}
                                </NativeSelect.Field>
                                <NativeSelect.Indicator />
                            </NativeSelect.Root>
                            <Input maxW='200px' value={inputCode} onChange={e=>setInputCode(e.target.value)} placeholder='Digite código'/>
                            <Button colorPalette='green' onClick={handleEnviar} loading={isLoading} loadingText='Enviando'>Enviar a Proveedor</Button>
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
        <Dialog.Root open={isOpen} size="xl" scrollBehavior='inside' onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header><Dialog.Title>Actualizar Estado Orden Compra AF</Dialog.Title></Dialog.Header>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton aria-label="Cerrar" size="sm" />
                        </Dialog.CloseTrigger>
                        <Dialog.Body>{renderContent()}</Dialog.Body>
                        <Dialog.Footer>
                            <Button colorPalette='blue' onClick={onClose}>Cerrar</Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
};

export default DialogLiberarEnviarOCAF;
