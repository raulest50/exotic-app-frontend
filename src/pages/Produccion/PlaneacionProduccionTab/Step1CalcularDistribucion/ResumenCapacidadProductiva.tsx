import { memo } from "react";
import { Badge, Box, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";
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
            <TableContainer w="full" overflowX="auto">
                <Table size="sm" variant="simple">
                    <Thead>
                        <Tr>
                            <Th>Categoria</Th>
                            <Th isNumeric>Total asignado</Th>
                            <Th isNumeric>Capacidad diaria</Th>
                            <Th isNumeric>Uso total</Th>
                            <Th isNumeric>% uso</Th>
                            <Th>Estado</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {rows.map((row) => {
                            const badge = getEstadoBadgeProps(row.estado);
                            return (
                                <Tr key={row.categoriaId ?? "sin-categoria"}>
                                    <Td>{row.categoriaNombre}</Td>
                                    <Td isNumeric>{formatCantidad(row.totalAsignado)}</Td>
                                    <Td isNumeric>{formatCantidad(row.capacidadDiaria)}</Td>
                                    <Td isNumeric>{formatCantidad(row.totalAsignado)}/{formatCantidad(row.capacidadDiaria)}</Td>
                                    <Td isNumeric>{row.porcentajeUso === null ? "-" : `${row.porcentajeUso.toFixed(2)}%`}</Td>
                                    <Td>
                                        <Badge colorScheme={badge.colorScheme}>{badge.label}</Badge>
                                    </Td>
                                </Tr>
                            );
                        })}
                    </Tbody>
                </Table>
            </TableContainer>
        </Box>
    );
}

const ResumenCapacidadProductiva = memo(ResumenCapacidadProductivaComponent);

export default ResumenCapacidadProductiva;
