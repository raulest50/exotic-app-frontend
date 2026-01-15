import {
    Box,
    Card,
    CardBody,
    CardHeader,
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
            <Card mb={5} variant="outline" boxShadow="md">
                <CardHeader bg="blue.50">
                    <Heading size="md">Packaging</Heading>
                </CardHeader>
                <CardBody>
                    <Text color="gray.600">Sin packaging definido.</Text>
                </CardBody>
            </Card>
        );
    }

    const insumosEmpaque = (casePack.insumosEmpaque ?? []) as PackagingInsumo[];

    return (
        <Card mb={5} variant="outline" boxShadow="md">
            <CardHeader bg="blue.50">
                <Heading size="md">Packaging</Heading>
            </CardHeader>
            <CardBody>
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
                        <Text color="gray.600">Sin insumos de empaque registrados.</Text>
                    ) : (
                        <Table size="sm">
                            <Thead>
                                <Tr>
                                    <Th>Código</Th>
                                    <Th>Nombre</Th>
                                    <Th>Unidad</Th>
                                    <Th>Cantidad</Th>
                                    <Th>UoM</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {insumosEmpaque.map((insumo, index) => {
                                    const material = getInsumoMaterial(insumo);
                                    return (
                                        <Tr key={material?.productoId ?? index}>
                                            <Td>{material?.productoId ?? '—'}</Td>
                                            <Td>{material?.nombre ?? '—'}</Td>
                                            <Td>{material?.tipoUnidades ?? '—'}</Td>
                                            <Td>{renderValue(getInsumoCantidad(insumo))}</Td>
                                            <Td>{renderValue(insumo.uom)}</Td>
                                        </Tr>
                                    );
                                })}
                            </Tbody>
                        </Table>
                    )}
                </Box>
            </CardBody>
        </Card>
    );
}

