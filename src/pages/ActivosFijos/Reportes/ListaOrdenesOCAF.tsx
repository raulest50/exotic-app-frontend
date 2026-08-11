import React, { useState } from 'react';
import { useColorModeValue } from "../../../components/ui/color-mode";
import {
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Box,
    Menu,
    IconButton,
    Portal,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import { FiMoreVertical, FiEye, FiXCircle, FiEdit, FiDownload } from 'react-icons/fi';
import { OrdenCompraActivo, getEstadoOCAFText } from '../types';
import { formatCOP } from '../../../utils/formatters';
import { Modulo } from '../../Usuarios/GestionUsuarios/types.tsx';
import { useModuleAccessLevel } from '../../../auth/usePermissions';
import DialogCancelarOCAF from './Dialogs/DialogCancelarOCAF';
import DialogLiberarEnviarOCAF from './Dialogs/DialogLiberarEnviarOCAF';
import OCAF_PDF_Generator from '../OCAF_PDF_Generator';

interface Props {
    ordenes: OrdenCompraActivo[];
    onEditarOrden?: (orden: OrdenCompraActivo) => void;
    onEstadoActualizado?: (orden: OrdenCompraActivo) => void;
}

const ListaOrdenesOCAF: React.FC<Props> = ({ ordenes, onEditarOrden, onEstadoActualizado }) => {
    const hoverBg = useColorModeValue('gray.100', 'gray.700');
    const [ordenToCancel, setOrdenToCancel] = useState<OrdenCompraActivo | null>(null);
    const [ordenToUpdate, setOrdenToUpdate] = useState<OrdenCompraActivo | null>(null);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const { nivel: accessLevel } = useModuleAccessLevel(Modulo.ACTIVOS);
    const toast = useAppToast();

    const handleDownloadPdf = async (orden: OrdenCompraActivo) => {
        if (!orden.ordenCompraActivoId || orden.estado === -1) return;

        setDownloadingId(orden.ordenCompraActivoId);
        try {
            const generator = new OCAF_PDF_Generator();
            await generator.downloadPDF_OCAF(orden);
        } catch (error) {
            toast({
                title: 'No se pudo generar la OCA',
                description: error instanceof Error
                    ? error.message
                    : 'No fue posible obtener la identidad documental.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <>
            <Box overflowX="auto" mt={4}>
                <Table.Root variant="simple">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader>ID</Table.ColumnHeader>
                            <Table.ColumnHeader>Fecha Emisión</Table.ColumnHeader>
                            <Table.ColumnHeader>Fecha Vencimiento</Table.ColumnHeader>
                            <Table.ColumnHeader>Proveedor</Table.ColumnHeader>
                            <Table.ColumnHeader>Total a Pagar</Table.ColumnHeader>
                            <Table.ColumnHeader>Estado</Table.ColumnHeader>
                            <Table.ColumnHeader>Acciones</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {ordenes.map((orden) => (
                            <Table.Row 
                                key={orden.ordenCompraActivoId}
                                _hover={{ bg: hoverBg, transition: 'background-color 0.2s' }}
                            >
                                <Table.Cell>{orden.ordenCompraActivoId}</Table.Cell>
                                <Table.Cell>
                                    {orden.fechaEmision
                                        ? new Date(orden.fechaEmision).toLocaleDateString()
                                        : '-'}
                                </Table.Cell>
                                <Table.Cell>
                                    {orden.fechaVencimiento
                                        ? new Date(orden.fechaVencimiento).toLocaleDateString()
                                        : '-'}
                                </Table.Cell>
                                <Table.Cell>{orden.proveedor ? orden.proveedor.nombre : '-'}</Table.Cell>
                                <Table.Cell>{formatCOP(orden.totalPagar)}</Table.Cell>
                                <Table.Cell>{getEstadoOCAFText(orden.estado)}</Table.Cell>
                                <Table.Cell onClick={(e) => e.stopPropagation()}>
                                    <Menu.Root>
                                        <Menu.Trigger
                                            aria-label='Opciones'
                                            icon={<FiMoreVertical />}
                                            variant='ghost'
                                            size='sm'
                                            asChild><IconButton /></Menu.Trigger>
                                        <Portal><Menu.Positioner><Menu.Content>
                                                    <Menu.Item
                                                        icon={<FiEye />}
                                                        onSelect={() => onEditarOrden && onEditarOrden(orden)}
                                                        value='item-0'>
                                                        Ver detalle
                                                    </Menu.Item>
                                                    {orden.estado !== -1 && (
                                                        <Menu.Item
                                                            icon={<FiDownload />}
                                                            disabled={downloadingId !== null}
                                                            onSelect={() => handleDownloadPdf(orden)}
                                                            value='item-1'>
                                                            {downloadingId === orden.ordenCompraActivoId
                                                                ? 'Generando PDF...'
                                                                : 'Descargar PDF'}
                                                        </Menu.Item>
                                                    )}
                                                    {accessLevel >= 2 && (
                                                        <Menu.Item icon={<FiEdit />} onSelect={() => setOrdenToUpdate(orden)} value='item-2'>
                                                            Liberar / Enviar
                                                        </Menu.Item>
                                                    )}
                                                    {accessLevel >= 2 && (
                                                        <Menu.Item
                                                            icon={<FiXCircle />}
                                                            onSelect={() => setOrdenToCancel(orden)}
                                                            value='item-3'>
                                                            Cancelar orden de compra AF
                                                        </Menu.Item>
                                                    )}
                                                </Menu.Content></Menu.Positioner></Portal>
                                    </Menu.Root>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </Box>

            {ordenToCancel && (
                <DialogCancelarOCAF
                    isOpen={!!ordenToCancel}
                    onClose={() => setOrdenToCancel(null)}
                    orden={ordenToCancel}
                    onOrdenCancelada={() => setOrdenToCancel(null)}
                />
            )}

            {ordenToUpdate && (
                <DialogLiberarEnviarOCAF
                    isOpen={!!ordenToUpdate}
                    onClose={() => setOrdenToUpdate(null)}
                    orden={ordenToUpdate}
                    onEstadoActualizado={(ordenActualizada) => {
                        onEstadoActualizado?.(ordenActualizada);
                        setOrdenToUpdate(null);
                    }}
                />
            )}
        </>
    );
};

export default ListaOrdenesOCAF;
