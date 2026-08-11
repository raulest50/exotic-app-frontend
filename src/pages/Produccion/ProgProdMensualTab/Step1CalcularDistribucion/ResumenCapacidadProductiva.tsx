import { memo } from "react";
import { Steps, Badge, Box, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";
import type { ResumenCapacidadCategoriaRow } from "./step1Distribucion.utils";
import { formatCantidad } from "./step1Distribucion.utils";

interface ResumenCapacidadProductivaProps {
    rows: ResumenCapacidadCategoriaRow[];
}

function getEstadoBadgeProps(estado: ResumenCapacidadCategoriaRow["estado"]): { label: string; colorScheme: string } {
    switch (estado) {
        case "disponible":
            return { label: "Disponible", colorScheme: "green" };
        case "al_limite":
            return { label: "Al limite", colorScheme: "yellow" };
        case "excedida":
            return { label: "Excedida", colorScheme: "red" };
        case "sin_categoria":
            return { label: "Sin categoria", colorScheme: "gray" };
        default:
            return { label: "Sin configurar", colorScheme: "orange" };
    }
}

function ResumenCapacidadProductivaComponent({ rows }: ResumenCapacidadProductivaProps) {
    if (rows.length === 0) {
        return null;
    }

    return (
        <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3} bg="gray.50">
            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>
                Capacidad productiva por categoria
            </Text>
            <Table.ScrollArea w="full" overflowX="auto">
                <Table.Root size="sm" variant="simple">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader>Categoria</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign='end'>Total asignado</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign='end'>Capacidad diaria</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign='end'>Uso total</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign='end'>% uso</Table.ColumnHeader>
                            <Table.ColumnHeader>Estado</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {rows.map((row) => {
                            const badge = getEstadoBadgeProps(row.estado);
                            return (
                                <Table.Row key={row.rowKey}>
                                    <Table.Cell>
                                        <Text>{row.categoriaNombre ?? "Sin categoria"}</Text>
                                    </Table.Cell>
                                    <Table.Cell textAlign='end'>{formatCantidad(row.totalAsignado)}</Table.Cell>
                                    <Table.Cell textAlign='end'>{formatCantidad(row.capacidadDiaria)}</Table.Cell>
                                    <Table.Cell textAlign='end'>{formatCantidad(row.totalAsignado)}/{formatCantidad(row.capacidadDiaria)}</Table.Cell>
                                    <Table.Cell textAlign='end'>{row.porcentajeUso === null ? "-" : `${row.porcentajeUso.toFixed(2)}%`}</Table.Cell>
                                    <Table.Cell>
                                        <Badge colorPalette={badge.colorScheme}>{badge.label}</Badge>
                                    </Table.Cell>
                                </Table.Row>
                            );
                        })}
                    </Table.Body>
                </Table.Root>
            </Table.ScrollArea>
        </Box>
    );
}

const ResumenCapacidadProductiva = memo(ResumenCapacidadProductivaComponent);

export default ResumenCapacidadProductiva;
