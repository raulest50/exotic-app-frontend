import { Box, Table, Thead, Tbody, Tr, Th, Td, Button, Text } from '@chakra-ui/react';
import { Cliente } from '../../types.tsx';

interface Props{
    clientes: Cliente[];
    onVerDetalle?: (c:Cliente)=>void;
}

export function ListaSearchClientes({clientes,onVerDetalle}:Props){
    return (
        <Box overflowX='auto' width='100%'>
            <Table variant='simple' size='sm'>
                <Thead>
                    <Tr>
                        <Th>ID</Th>
                        <Th>Nombre</Th>
                        <Th>Correo Electrónico</Th>
                        <Th>Teléfono</Th>
                        <Th>Ver Detalle</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {clientes.length===0 ? (
                        <Tr><Td colSpan={5} textAlign='center'><Text py={4}>No se encontraron clientes.</Text></Td></Tr>
                    ) : (
                        clientes.map(c=> (
                            <Tr key={c.clienteId} _hover={{bg:'gray.100'}}>
                                <Td>{c.clienteId}</Td>
                                <Td>{c.nombre}</Td>
                                <Td>{c.email}</Td>
                                <Td>{c.telefono}</Td>
                                <Td><Button size='sm' colorScheme='blue' onClick={()=>onVerDetalle&&onVerDetalle(c)}>Ver Detalle</Button></Td>
                            </Tr>
                        ))
                    )}
                </Tbody>
            </Table>
        </Box>
    );
}
