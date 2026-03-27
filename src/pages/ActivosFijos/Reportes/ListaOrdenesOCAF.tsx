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
    useColorModeValue
} from '@chakra-ui/react';
import { FiMoreVertical, FiEye, FiXCircle, FiEdit } from 'react-icons/fi';
import { OrdenCompraActivo, getEstadoOCAFText } from '../types';
import { formatCOP } from '../../../utils/formatters';
import { Modulo } from '../../Usuarios/GestionUsuarios/types.tsx';
import { useModuleAccessLevel } from '../../../auth/usePermissions';
import DialogCancelarOCAF from './Dialogs/DialogCancelarOCAF';
import DialogLiberarEnviarOCAF from './Dialogs/DialogLiberarEnviarOCAF';

interface Props {
    ordenes: OrdenCompraActivo[];
    onEditarOrden?: (orden: OrdenCompraActivo) => void;
}

const ListaOrdenesOCAF: React.FC<Props> = ({ ordenes, onEditarOrden }) => {
    const hoverBg = useColorModeValue('gray.100', 'gray.700');
    const [ordenToCancel, setOrdenToCancel] = useState<OrdenCompraActivo | null>(null);
    const [ordenToUpdate, setOrdenToUpdate] = useState<OrdenCompraActivo | null>(null);
    const { nivel: accessLevel } = useModuleAccessLevel(Modulo.ACTIVOS);

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
                onEstadoActualizado={() => setOrdenToUpdate(null)}
            />
        )}
        </>
    );
};

export default ListaOrdenesOCAF;
