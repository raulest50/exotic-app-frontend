import {
    Box,
    Button,
    Flex,
    Spinner,
    Table,
    TableContainer,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
} from '@chakra-ui/react';
import { AreaOperativa } from './types';

interface TablaAreasOperativasProps {
    areas: AreaOperativa[];
    loading: boolean;
    onVerDetalle: (area: AreaOperativa) => void;
}

export default function TablaAreasOperativas({ areas, loading, onVerDetalle }: TablaAreasOperativasProps) {
    if (loading) {
        return (
            <Flex justify="center" align="center" py={8}>
                <Spinner size="xl" />
            </Flex>
        );
    }

    if (areas.length === 0) {
        return null;
    }

    return (
        <Box bg="white" borderRadius="md" boxShadow="sm" overflowX="auto">
            <TableContainer>
                <Table variant="simple" size="sm">
                    <Thead>
                        <Tr>
                            <Th>ID</Th>
                            <Th>Nombre</Th>
                            <Th>Descripción</Th>
                            <Th>Responsable</Th>
                            <Th textAlign="center">Acciones</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {areas.map((area) => (
                            <Tr key={area.areaId}>
                                <Td>{area.areaId}</Td>
                                <Td>{area.nombre}</Td>
                                <Td>
                                    <Text noOfLines={1} maxW="250px">
                                        {area.descripcion || '—'}
                                    </Text>
                                </Td>
                                <Td>
                                    {area.responsableArea
                                        ? area.responsableArea.nombreCompleto || area.responsableArea.username
                                        : '—'}
                                </Td>
                                <Td>
                                    <Flex justify="center">
                                        <Button
                                            colorScheme="teal"
                                            size="sm"
                                            onClick={() => onVerDetalle(area)}
                                        >
                                            Ver Detalle
                                        </Button>
                                    </Flex>
                                </Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            </TableContainer>
        </Box>
    );
}
