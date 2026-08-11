import {
    Steps,
    Box,
    Card,
    Grid,
    GridItem,
    Heading,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
} from '@chakra-ui/react';
import type { CasePack, Insumo, Material, Producto } from '../../types.tsx';

type PackagingInsumo = Insumo & {
    cantidad?: number;
    uom?: string;
    material?: Producto | Material;
};

type Props = {
    casePack?: CasePack;
};

const renderValue = (value: string | number | boolean | undefined | null) => {
    if (value === undefined || value === null || value === '') {
        return '—';
    }
    if (typeof value === 'boolean') {
        return value ? 'Sí' : 'No';
    }
    return String(value);
};

const getInsumoMaterial = (insumo: PackagingInsumo) => {
    return insumo.material ?? insumo.producto;
};

const getInsumoCantidad = (insumo: PackagingInsumo) => {
    if (typeof insumo.cantidad === 'number') {
        return insumo.cantidad;
    }
    return insumo.cantidadRequerida ?? 0;
};

export default function CardPackagingInfo({ casePack }: Props) {
    if (!casePack) {
        return (
            <Card.Root mb={5} variant="outline" boxShadow="md">
                <Card.Header bg="app.stepperBlue">
                    <Heading size="md">Packaging</Heading>
                </Card.Header>
                <Card.Body>
                    <Text color="app.textMuted">Sin packaging definido.</Text>
                </Card.Body>
            </Card.Root>
        );
    }

    const insumosEmpaque = (casePack.insumosEmpaque ?? []) as PackagingInsumo[];

    return (
        <Card.Root mb={5} variant="outline" boxShadow="md">
            <Card.Header bg="app.stepperBlue">
                <Heading size="md">Packaging</Heading>
            </Card.Header>
            <Card.Body>
                <Grid templateColumns="repeat(2, 1fr)" gap={6} mb={6}>
                    <GridItem>
                        <Box>
                            <Text fontWeight="bold">Unidades por caja:</Text>
                            <Text>{renderValue(casePack.unitsPerCase)}</Text>
                        </Box>
                        <Box mt={3}>
                            <Text fontWeight="bold">EAN14 / ITF-14:</Text>
                            <Text>{renderValue(casePack.ean14)}</Text>
                        </Box>
                        <Box mt={3}>
                            <Text fontWeight="bold">Despacho por defecto:</Text>
                            <Text>{renderValue(casePack.defaultForShipping)}</Text>
                        </Box>
                    </GridItem>
                    <GridItem>
                        <Box>
                            <Text fontWeight="bold">Dimensiones (cm):</Text>
                            <Text>
                                {renderValue(casePack.largoCm)} x {renderValue(casePack.anchoCm)} x {renderValue(casePack.altoCm)}
                            </Text>
                        </Box>
                        <Box mt={3}>
                            <Text fontWeight="bold">Peso bruto (kg):</Text>
                            <Text>{renderValue(casePack.grossWeightKg)}</Text>
                        </Box>
                    </GridItem>
                </Grid>

                <Box>
                    <Text fontWeight="bold" mb={2}>
                        Insumos de empaque
                    </Text>
                    {insumosEmpaque.length === 0 ? (
                        <Text color="app.textMuted">Sin insumos de empaque registrados.</Text>
                    ) : (
                        <Table.Root size="sm">
                            <Table.Header>
                                <Table.Row>
                                    <Table.ColumnHeader>Código</Table.ColumnHeader>
                                    <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                    <Table.ColumnHeader>Unidad</Table.ColumnHeader>
                                    <Table.ColumnHeader>Cantidad</Table.ColumnHeader>
                                    <Table.ColumnHeader>UoM</Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {insumosEmpaque.map((insumo, index) => {
                                    const material = getInsumoMaterial(insumo);
                                    return (
                                        <Table.Row key={material?.productoId ?? index}>
                                            <Table.Cell>{material?.productoId ?? '—'}</Table.Cell>
                                            <Table.Cell>{material?.nombre ?? '—'}</Table.Cell>
                                            <Table.Cell>{material?.tipoUnidades ?? '—'}</Table.Cell>
                                            <Table.Cell>{renderValue(getInsumoCantidad(insumo))}</Table.Cell>
                                            <Table.Cell>{renderValue(insumo.uom)}</Table.Cell>
                                        </Table.Row>
                                    );
                                })}
                            </Table.Body>
                        </Table.Root>
                    )}
                </Box>
            </Card.Body>
        </Card.Root>
    );
}

