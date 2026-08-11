import { Box, Table, Thead, Tbody, Tr, Th, Td, Button, Text } from '@chakra-ui/react';
import { Cliente } from '../../types.tsx';

interface Props{
    clientes: Cliente[];
    onVerDetalle?: (c:Cliente)=>void;
}

export function ListaSearchClientes({clientes,onVerDetalle}:Props){
    return (
        <Box overflowX='auto' width='100%'>
            <Table.Root variant='simple' size='sm'>
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeader>ID</Table.ColumnHeader>
                        <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                        <Table.ColumnHeader>Correo Electrónico</Table.ColumnHeader>
                        <Table.ColumnHeader>Teléfono</Table.ColumnHeader>
                        <Table.ColumnHeader>Ver Detalle</Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {clientes.length===0 ? (
                        <Table.Row><Table.Cell colSpan={5} textAlign='center'><Text py={4}>No se encontraron clientes.</Text></Table.Cell></Table.Row>
                    ) : (
                        clientes.map(c=> (
                            <Table.Row key={c.clienteId} _hover={{bg:'app.rowHoverStrong'}}>
                                <Table.Cell>{c.clienteId}</Table.Cell>
                                <Table.Cell>{c.nombre}</Table.Cell>
                                <Table.Cell>{c.email}</Table.Cell>
                                <Table.Cell>{c.telefono}</Table.Cell>
                                <Table.Cell><Button size='sm' colorPalette='blue' onClick={()=>onVerDetalle&&onVerDetalle(c)}>Ver Detalle</Button></Table.Cell>
                            </Table.Row>
                        ))
                    )}
                </Table.Body>
            </Table.Root>
        </Box>
    );
}
