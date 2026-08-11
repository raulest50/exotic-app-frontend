import {
    Steps,
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
import { TransaccionAlmacen } from './types';

interface TablaDispensacionesProps {
    dispensaciones: TransaccionAlmacen[];
    loading: boolean;
    onGenerarPDF: (transaccion: TransaccionAlmacen) => void;
    onVerDetalle: (transaccion: TransaccionAlmacen) => void;
    generandoPDF?: boolean;
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

const truncarTexto = (texto: string | undefined, maxLength: number = 50) => {
    if (!texto) return '-';
    if (texto.length <= maxLength) return texto;
    return texto.substring(0, maxLength) + '...';
};

export default function TablaDispensaciones({
    dispensaciones,
    loading,
    onGenerarPDF,
    onVerDetalle,
    generandoPDF = false,
}: TablaDispensacionesProps) {
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
                <Table.Root variant="simple" size='sm'>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader>ID Transacción</Table.ColumnHeader>
                            <Table.ColumnHeader>ID Orden Producción</Table.ColumnHeader>
                            <Table.ColumnHeader>Lote Producción</Table.ColumnHeader>
                            <Table.ColumnHeader>Fecha</Table.ColumnHeader>
                            <Table.ColumnHeader>Estado Contable</Table.ColumnHeader>
                            <Table.ColumnHeader>Observaciones</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign='center'>Acciones</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {dispensaciones.map((dispensacion) => (
                            <Table.Row key={dispensacion.transaccionId}>
                                <Table.Cell>{dispensacion.transaccionId}</Table.Cell>
                                <Table.Cell>
                                    {(dispensacion.tipoEntidadCausante === 'OD' || dispensacion.tipoEntidadCausante === 'OP') && dispensacion.idEntidadCausante > 0
                                        ? dispensacion.idEntidadCausante 
                                        : '-'}
                                </Table.Cell>
                                <Table.Cell>{dispensacion.loteAsignado || '-'}</Table.Cell>
                                <Table.Cell>{formatFecha(dispensacion.fechaTransaccion)}</Table.Cell>
                                <Table.Cell>{formatEstadoContable(dispensacion.estadoContable)}</Table.Cell>
                                <Table.Cell>
                                    <Text fontSize="sm">
                                        {truncarTexto(dispensacion.observaciones)}
                                    </Text>
                                </Table.Cell>
                                <Table.Cell>
                                    <Flex justify='center' gap={2}>
                                        {(dispensacion.tipoEntidadCausante === 'OD' || dispensacion.tipoEntidadCausante === 'OP') && dispensacion.idEntidadCausante > 0 ? (
                                            <>
                                                <Button
                                                    colorPalette='blue'
                                                    size='sm'
                                                    onClick={() => onGenerarPDF(dispensacion)}
                                                    disabled={generandoPDF}
                                                    loading={generandoPDF}
                                                >
                                                    Generar PDF
                                                </Button>
                                                <Button
                                                    colorPalette='teal'
                                                    size='sm'
                                                    onClick={() => onVerDetalle(dispensacion)}
                                                >
                                                    Ver detalle
                                                </Button>
                                            </>
                                        ) : (
                                            <Text fontSize="sm" color="app.textSubtle">-</Text>
                                        )}
                                    </Flex>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                        {dispensaciones.length === 0 && (
                            <Table.Row>
                                <Table.Cell colSpan={7}>
                                    <Text textAlign='center' py={4}>
                                        No hay dispensaciones disponibles.
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
