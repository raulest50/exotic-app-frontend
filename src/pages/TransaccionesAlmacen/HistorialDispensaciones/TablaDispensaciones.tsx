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
        <Box bg='white' borderRadius='md' boxShadow='sm' overflowX='auto'>
            <TableContainer>
                <Table variant="simple" size='sm'>
                    <Thead>
                        <Tr>
                            <Th>ID Transacción</Th>
                            <Th>ID Orden Producción</Th>
                            <Th>Fecha</Th>
                            <Th>Estado Contable</Th>
                            <Th>Observaciones</Th>
                            <Th textAlign='center'>Acciones</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {dispensaciones.map((dispensacion) => (
                            <Tr key={dispensacion.transaccionId}>
                                <Td>{dispensacion.transaccionId}</Td>
                                <Td>
                                    {(dispensacion.tipoEntidadCausante === 'OD' || dispensacion.tipoEntidadCausante === 'OP') && dispensacion.idEntidadCausante > 0
                                        ? dispensacion.idEntidadCausante 
                                        : '-'}
                                </Td>
                                <Td>{formatFecha(dispensacion.fechaTransaccion)}</Td>
                                <Td>{formatEstadoContable(dispensacion.estadoContable)}</Td>
                                <Td>
                                    <Text fontSize="sm">
                                        {truncarTexto(dispensacion.observaciones)}
                                    </Text>
                                </Td>
                                <Td>
                                    <Flex justify='center' gap={2}>
                                        {(dispensacion.tipoEntidadCausante === 'OD' || dispensacion.tipoEntidadCausante === 'OP') && dispensacion.idEntidadCausante > 0 ? (
                                            <>
                                                <Button
                                                    colorScheme='blue'
                                                    size='sm'
                                                    onClick={() => onGenerarPDF(dispensacion)}
                                                    isDisabled={generandoPDF}
                                                    isLoading={generandoPDF}
                                                >
                                                    Generar PDF
                                                </Button>
                                                <Button
                                                    colorScheme='teal'
                                                    size='sm'
                                                    onClick={() => onVerDetalle(dispensacion)}
                                                >
                                                    Ver detalle
                                                </Button>
                                            </>
                                        ) : (
                                            <Text fontSize="sm" color="gray.500">-</Text>
                                        )}
                                    </Flex>
                                </Td>
                            </Tr>
                        ))}
                        {dispensaciones.length === 0 && (
                            <Tr>
                                <Td colSpan={6}>
                                    <Text textAlign='center' py={4}>
                                        No hay dispensaciones disponibles.
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

