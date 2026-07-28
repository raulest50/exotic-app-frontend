import React, { useState } from 'react';
import {
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Box,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    IconButton,
    useColorModeValue,
    useToast
} from '@chakra-ui/react';
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
    const toast = useToast();

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
            <Table variant="simple">
                <Thead>
                    <Tr>
                        <Th>ID</Th>
                        <Th>Fecha Emisión</Th>
                        <Th>Fecha Vencimiento</Th>
                        <Th>Proveedor</Th>
                        <Th>Total a Pagar</Th>
                        <Th>Estado</Th>
                        <Th>Acciones</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {ordenes.map((orden) => (
                        <Tr 
                            key={orden.ordenCompraActivoId}
                            _hover={{ bg: hoverBg, transition: 'background-color 0.2s' }}
                        >
                            <Td>{orden.ordenCompraActivoId}</Td>
                            <Td>
                                {orden.fechaEmision
                                    ? new Date(orden.fechaEmision).toLocaleDateString()
                                    : '-'}
                            </Td>
                            <Td>
                                {orden.fechaVencimiento
                                    ? new Date(orden.fechaVencimiento).toLocaleDateString()
                                    : '-'}
                            </Td>
                            <Td>{orden.proveedor ? orden.proveedor.nombre : '-'}</Td>
                            <Td>{formatCOP(orden.totalPagar)}</Td>
                            <Td>{getEstadoOCAFText(orden.estado)}</Td>
                            <Td onClick={(e) => e.stopPropagation()}>
                                <Menu>
                                    <MenuButton
                                        as={IconButton}
                                        aria-label='Opciones'
                                        icon={<FiMoreVertical />}
                                        variant='ghost'
                                        size='sm'
                                    />
                                    <MenuList>
                                        <MenuItem icon={<FiEye />} onClick={() => onEditarOrden && onEditarOrden(orden)}>
                                            Ver detalle
                                        </MenuItem>
                                        {orden.estado !== -1 && (
                                            <MenuItem
                                                icon={<FiDownload />}
                                                isDisabled={downloadingId !== null}
                                                onClick={() => handleDownloadPdf(orden)}
                                            >
                                                {downloadingId === orden.ordenCompraActivoId
                                                    ? 'Generando PDF...'
                                                    : 'Descargar PDF'}
                                            </MenuItem>
                                        )}
                                        {accessLevel >= 2 && (
                                            <MenuItem icon={<FiEdit />} onClick={() => setOrdenToUpdate(orden)}>
                                                Liberar / Enviar
                                            </MenuItem>
                                        )}
                                        {accessLevel >= 2 && (
                                            <MenuItem icon={<FiXCircle />} onClick={() => setOrdenToCancel(orden)}>
                                                Cancelar orden de compra AF
                                            </MenuItem>
                                        )}
                                    </MenuList>
                                </Menu>
                            </Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>
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
