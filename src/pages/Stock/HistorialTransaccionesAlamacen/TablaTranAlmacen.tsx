import { Box, Table, Text, Button, Spinner, Flex } from '@chakra-ui/react';
import { TransaccionAlmacen } from '../../TransaccionesAlmacen/HistorialDispensaciones/types';
import { causaAjusteLabel } from '../../TransaccionesAlmacen/AjustesInventario/causasAjuste';

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
        <Box bg='app.surface' borderRadius='md' boxShadow='sm' overflowX='auto'>
            <Table.ScrollArea>
                <Table.Root variant="line" size='sm'>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader>ID Transacción</Table.ColumnHeader>
                            <Table.ColumnHeader>{getColumnHeader(tipoEntidadCausante)}</Table.ColumnHeader>
                            <Table.ColumnHeader>Tipo</Table.ColumnHeader>
                            <Table.ColumnHeader>Fecha</Table.ColumnHeader>
                            <Table.ColumnHeader>Estado Contable</Table.ColumnHeader>
                            {tipoEntidadCausante === 'OAA' && <Table.ColumnHeader>Causa del ajuste</Table.ColumnHeader>}
                            <Table.ColumnHeader>Observaciones</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign='center'>Acciones</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {transacciones.map((t) => (
                            <Table.Row key={t.transaccionId}>
                                <Table.Cell>{t.transaccionId}</Table.Cell>
                                <Table.Cell>{getCellValue(t, tipoEntidadCausante)}</Table.Cell>
                                <Table.Cell>{formatTipoEntidad(t.tipoEntidadCausante)}</Table.Cell>
                                <Table.Cell>{formatFecha(t.fechaTransaccion)}</Table.Cell>
                                <Table.Cell>{formatEstadoContable(t.estadoContable)}</Table.Cell>
                                {tipoEntidadCausante === 'OAA' && (
                                    <Table.Cell>{causaAjusteLabel(t.causaAjuste)}</Table.Cell>
                                )}
                                <Table.Cell>
                                    <Text fontSize="sm">
                                        {truncarTexto(t.observaciones)}
                                    </Text>
                                </Table.Cell>
                                <Table.Cell>
                                    <Flex justify='center'>
                                        <Button
                                            colorPalette='teal'
                                            size='sm'
                                            onClick={() => onVerDetalle(t)}
                                        >
                                            Ver detalle
                                        </Button>
                                    </Flex>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                        {transacciones.length === 0 && (
                            <Table.Row>
                                <Table.Cell colSpan={tipoEntidadCausante === 'OAA' ? 8 : 7}>
                                    <Text textAlign='center' py={4}>
                                        No hay transacciones disponibles.
                                    </Text>
                                </Table.Cell>
                            </Table.Row>
                        )}
                    </Table.Body>
                </Table.Root>
            </Table.ScrollArea>
        </Box>
    );
}
