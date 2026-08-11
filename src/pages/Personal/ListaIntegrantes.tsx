import React from 'react';
import { Table, Thead, Tbody, Tr, Th, Td, Box, IconButton } from '@chakra-ui/react';
import { Tooltip } from '@/components/ui/tooltip';
import { IntegrantePersonalResumen, getEstadoIntegranteText } from './types';
import { LuEye } from 'react-icons/lu';

interface Props {
    integrantes: IntegrantePersonalResumen[];
    onVerDetalle: (id: number) => void;
}

const ListaIntegrantes: React.FC<Props> = ({ integrantes, onVerDetalle }) => {
    return (
        <Box overflowX="auto" mt={4}>
            <Table.Root variant="simple">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeader>ID</Table.ColumnHeader>
                        <Table.ColumnHeader>Nombres</Table.ColumnHeader>
                        <Table.ColumnHeader>Apellidos</Table.ColumnHeader>
                        <Table.ColumnHeader>Cargo</Table.ColumnHeader>
                        <Table.ColumnHeader>Departamento</Table.ColumnHeader>
                        <Table.ColumnHeader>Estado</Table.ColumnHeader>
                        <Table.ColumnHeader>Acciones</Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {integrantes.map((intg) => (
                        <Table.Row key={intg.id}>
                            <Table.Cell>{intg.id}</Table.Cell>
                            <Table.Cell>{intg.nombres}</Table.Cell>
                            <Table.Cell>{intg.apellidos}</Table.Cell>
                            <Table.Cell>{intg.cargo ?? '-'}</Table.Cell>
                            <Table.Cell>{intg.departamento ?? '-'}</Table.Cell>
                            <Table.Cell>{getEstadoIntegranteText(intg.estado)}</Table.Cell>
                            <Table.Cell>
                                <Tooltip content="Ver y editar detalle">
                                    <IconButton
                                        aria-label="Ver detalle"
                                        size="sm"
                                        colorPalette="blue"
                                        variant="outline"
                                        onClick={() => onVerDetalle(intg.id)}><LuEye /></IconButton>
                                </Tooltip>
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>
        </Box>
    );
};

export default ListaIntegrantes;
