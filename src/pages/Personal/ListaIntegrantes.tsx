import React from 'react';
import {
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Box,
    IconButton,
    Tooltip
} from '@chakra-ui/react';
import { ViewIcon } from '@chakra-ui/icons';
import { IntegrantePersonalResumen, getEstadoIntegranteText } from './types';

interface Props {
    integrantes: IntegrantePersonalResumen[];
    onVerDetalle: (id: number) => void;
}

const ListaIntegrantes: React.FC<Props> = ({ integrantes, onVerDetalle }) => {
    return (
        <Box overflowX="auto" mt={4}>
            <Table variant="simple">
                <Thead>
                    <Tr>
                        <Th>ID</Th>
                        <Th>Nombres</Th>
                        <Th>Apellidos</Th>
                        <Th>Cargo</Th>
                        <Th>Departamento</Th>
                        <Th>Estado</Th>
                        <Th>Acciones</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {integrantes.map((intg) => (
                        <Tr key={intg.id}>
                            <Td>{intg.id}</Td>
                            <Td>{intg.nombres}</Td>
                            <Td>{intg.apellidos}</Td>
                            <Td>{intg.cargo ?? '-'}</Td>
                            <Td>{intg.departamento ?? '-'}</Td>
                            <Td>{getEstadoIntegranteText(intg.estado)}</Td>
                            <Td>
                                <Tooltip label="Ver y editar detalle">
                                    <IconButton
                                        aria-label="Ver detalle"
                                        icon={<ViewIcon />}
                                        size="sm"
                                        colorScheme="blue"
                                        variant="outline"
                                        onClick={() => onVerDetalle(intg.id)}
                                    />
                                </Tooltip>
                            </Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>
        </Box>
    );
};

export default ListaIntegrantes;
