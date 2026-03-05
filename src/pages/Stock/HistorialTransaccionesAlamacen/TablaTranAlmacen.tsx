import {
    Box,
    Table,
    TableContainer,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    Button,
    Spinner,
    Flex,
} from '@chakra-ui/react';
import { TransaccionAlmacen } from '../../TransaccionesAlmacen/HistorialDispensaciones/types';

interface TablaTranAlmacenProps {
    transacciones: TransaccionAlmacen[];
    loading: boolean;
    onVerDetalle: (transaccion: TransaccionAlmacen) => void;
    tipoEntidadCausante?: string;
}

const formatFecha = (fecha?: string) => {
    if (!fecha) return 'N/A';
    try {
        const parsed = new Date(fecha);
        return isNaN(parsed.getTime()) ? fecha : parsed.toLocaleString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return fecha;
    }
};

const formatEstadoContable = (estado?: string) => {
    if (!estado) return 'N/A';
    const estados: Record<string, string> = {
        'PENDIENTE': 'Pendiente',
        'CONTABILIZADA': 'Contabilizada',
        'NO_APLICA': 'No Aplica',
    };
    return estados[estado] || estado;
};

const formatTipoEntidad = (tipo?: string) => {
    if (!tipo) return 'N/A';
    const tipos: Record<string, string> = {
        'OCM': 'Ingreso Materiales',
        'OP': 'Orden Producción',
        'OAA': 'Ajuste Almacén',
        'OD': 'Dispensación',
        'CM': 'Carga Masiva',
        'RA': 'Reporte Avería',
    };
    return tipos[tipo] || tipo;
};

const truncarTexto = (texto: string | undefined, maxLength: number = 50) => {
    if (!texto) return '-';
    if (texto.length <= maxLength) return texto;
    return texto.substring(0, maxLength) + '...';
};

const getColumnHeader = (tipo?: string) => {
    switch (tipo) {
        case 'OCM': return 'ID OCM';
        case 'OD': return 'Lote Producción';
        default: return 'ID Entidad Causante';
    }
};

const getCellValue = (t: TransaccionAlmacen, tipo?: string) => {
    if (tipo === 'OD') return t.loteAsignado || '-';
    return t.idEntidadCausante > 0 ? t.idEntidadCausante : '-';
};

export default function TablaTranAlmacen({
    transacciones,
    loading,
    onVerDetalle,
    tipoEntidadCausante,
}: TablaTranAlmacenProps) {
    if (loading) {
        return (
            <Flex justify="center" align="center" py={8}>
                <Spinner size="xl" />
            </Flex>
        );
    }

    return (
        <Box bg='white' borderRadius='md' boxShadow='sm' overflowX='auto'>
            <TableContainer>
                <Table variant="simple" size='sm'>
                    <Thead>
                        <Tr>
                            <Th>ID Transacción</Th>
                            <Th>{getColumnHeader(tipoEntidadCausante)}</Th>
                            <Th>Tipo</Th>
                            <Th>Fecha</Th>
                            <Th>Estado Contable</Th>
                            <Th>Observaciones</Th>
                            <Th textAlign='center'>Acciones</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {transacciones.map((t) => (
                            <Tr key={t.transaccionId}>
                                <Td>{t.transaccionId}</Td>
                                <Td>{getCellValue(t, tipoEntidadCausante)}</Td>
                                <Td>{formatTipoEntidad(t.tipoEntidadCausante)}</Td>
                                <Td>{formatFecha(t.fechaTransaccion)}</Td>
                                <Td>{formatEstadoContable(t.estadoContable)}</Td>
                                <Td>
                                    <Text fontSize="sm">
                                        {truncarTexto(t.observaciones)}
                                    </Text>
                                </Td>
                                <Td>
                                    <Flex justify='center'>
                                        <Button
                                            colorScheme='teal'
                                            size='sm'
                                            onClick={() => onVerDetalle(t)}
                                        >
                                            Ver detalle
                                        </Button>
                                    </Flex>
                                </Td>
                            </Tr>
                        ))}
                        {transacciones.length === 0 && (
                            <Tr>
                                <Td colSpan={7}>
                                    <Text textAlign='center' py={4}>
                                        No hay transacciones disponibles.
                                    </Text>
                                </Td>
                            </Tr>
                        )}
                    </Tbody>
                </Table>
            </TableContainer>
        </Box>
    );
}
