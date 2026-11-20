import { Box, Button, Flex, Spinner, Table, Text } from '@chakra-ui/react';
import { type AreaOperativa, isAlmacenGeneralArea } from './types';
import { ALCANCE_EJECUCION_LABELS } from '../../../api/mpsAreaConfig';

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
        <Box bg="app.surface" borderRadius="md" boxShadow="sm" overflowX="auto">
            <Table.ScrollArea>
                <Table.Root variant="line" size="sm">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader>ID</Table.ColumnHeader>
                            <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                            <Table.ColumnHeader>Descripción</Table.ColumnHeader>
                            <Table.ColumnHeader>Responsable</Table.ColumnHeader>
                            <Table.ColumnHeader>Ejecución</Table.ColumnHeader>
                            <Table.ColumnHeader>Equipo en salida OF</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign="center">Acciones</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {areas.map((area) => (
                            <Table.Row key={area.areaId}>
                                <Table.Cell>{area.areaId}</Table.Cell>
                                <Table.Cell>{area.nombre}</Table.Cell>
                                <Table.Cell>
                                    <Text lineClamp={1} maxW="250px">
                                        {area.descripcion || '—'}
                                    </Text>
                                </Table.Cell>
                                <Table.Cell>
                                    {area.responsableArea
                                        ? area.responsableArea.nombreCompleto || area.responsableArea.username
                                        : '—'}
                                </Table.Cell>
                                <Table.Cell>
                                    {ALCANCE_EJECUCION_LABELS[isAlmacenGeneralArea(area) ? 'AMBOS' : area.alcanceEjecucion ?? 'AMBOS']}
                                </Table.Cell>
                                <Table.Cell>{isAlmacenGeneralArea(area) || area.alcanceEjecucion === 'SOLO_OP' ? '—' : area.requiereEquipoLoteOf ? 'Obligatorio' : 'Opcional'}</Table.Cell>
                                <Table.Cell>
                                    <Flex justify="center">
                                        <Button
                                            colorPalette="teal"
                                            size="sm"
                                            onClick={() => onVerDetalle(area)}
                                        >
                                            Ver Detalle
                                        </Button>
                                    </Flex>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </Table.ScrollArea>
        </Box>
    );
}
