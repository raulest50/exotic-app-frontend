import { Box, Table, Text, Button } from '@chakra-ui/react';
import { Proveedor } from '../../types.tsx';

type Props = {
    proveedores: Proveedor[];
    onVerDetalle?: (proveedor: Proveedor) => void;
};

export function ListaSearchProveedores({ proveedores, onVerDetalle }: Props) {
    return (
        <Box overflowX="auto" width="100%">
            <Table.Root variant="line" size="sm">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeader>ID</Table.ColumnHeader>
                        <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                        <Table.ColumnHeader>Ciudad</Table.ColumnHeader>
                        <Table.ColumnHeader>Departamento</Table.ColumnHeader>
                        <Table.ColumnHeader>Ver Detalle</Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {proveedores.length === 0 ? (
                        <Table.Row>
                            <Table.Cell colSpan={5} textAlign="center">
                                <Text py={4}>No se encontraron proveedores con los criterios de búsqueda.</Text>
                            </Table.Cell>
                        </Table.Row>
                    ) : (
                        proveedores.map((proveedor) => (
                            <Table.Row 
                                key={proveedor.id}
                                _hover={{ bg: "app.rowHoverStrong" }}
                            >
                                <Table.Cell>{proveedor.id}</Table.Cell>
                                <Table.Cell>{proveedor.nombre}</Table.Cell>
                                <Table.Cell>{proveedor.ciudad || '-'}</Table.Cell>
                                <Table.Cell>{proveedor.departamento || '-'}</Table.Cell>
                                <Table.Cell>
                                    <Button 
                                        size="sm" 
                                        colorPalette="blue"
                                        onClick={() => onVerDetalle && onVerDetalle(proveedor)}
                                    >
                                        Ver Detalle
                                    </Button>
                                </Table.Cell>
                            </Table.Row>
                        ))
                    )}
                </Table.Body>
            </Table.Root>
        </Box>
    );
}

