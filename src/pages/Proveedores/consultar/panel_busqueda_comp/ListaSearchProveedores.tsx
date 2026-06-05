import { Box, Table, Thead, Tbody, Tr, Th, Td, Text, Button } from '@chakra-ui/react';
import { Proveedor } from '../../types.tsx';

type Props = {
    proveedores: Proveedor[];
    onVerDetalle?: (proveedor: Proveedor) => void;
};

export function ListaSearchProveedores({ proveedores, onVerDetalle }: Props) {
    return (
        <Box overflowX="auto" width="100%">
            <Table variant="simple" size="sm">
                <Thead>
                    <Tr>
                        <Th>ID</Th>
                        <Th>Nombre</Th>
                        <Th>Ciudad</Th>
                        <Th>Departamento</Th>
                        <Th>Ver Detalle</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {proveedores.length === 0 ? (
                        <Tr>
                            <Td colSpan={5} textAlign="center">
                                <Text py={4}>No se encontraron proveedores con los criterios de búsqueda.</Text>
                            </Td>
                        </Tr>
                    ) : (
                        proveedores.map((proveedor) => (
                            <Tr 
                                key={proveedor.id}
                                _hover={{ bg: "app.rowHoverStrong" }}
                            >
                                <Td>{proveedor.id}</Td>
                                <Td>{proveedor.nombre}</Td>
                                <Td>{proveedor.ciudad || '-'}</Td>
                                <Td>{proveedor.departamento || '-'}</Td>
                                <Td>
                                    <Button 
                                        size="sm" 
                                        colorScheme="blue"
                                        onClick={() => onVerDetalle && onVerDetalle(proveedor)}
                                    >
                                        Ver Detalle
                                    </Button>
                                </Td>
                            </Tr>
                        ))
                    )}
                </Tbody>
            </Table>
        </Box>
    );
}

