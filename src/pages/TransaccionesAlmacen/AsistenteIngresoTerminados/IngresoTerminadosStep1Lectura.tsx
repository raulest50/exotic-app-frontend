import { Steps, Badge, Box, HStack, Table, Tbody, Td, Text, Th, Thead, Tr, VStack } from "@chakra-ui/react";
import type { ReporteProduccionPendiente } from "./types";
import { consolidarProductos, formatCantidad } from "./produccionCierreUtils";

interface Props {
    reportes: ReporteProduccionPendiente[];
}

export default function IngresoTerminadosStep1Lectura({ reportes }: Props) {
    const consolidados = consolidarProductos(reportes);

    return (
        <VStack align="stretch" gap={5}>
            {consolidados.map((producto) => {
                const lotes = reportes.filter((reporte) => reporte.productoId === producto.productoId);
                return (
                    <Box key={producto.productoId} borderWidth="1px" borderRadius="md" overflow="hidden">
                        <HStack
                            justify="space-between"
                            align={{ base: "flex-start", sm: "center" }}
                            flexDir={{ base: "column", sm: "row" }}
                            px={4}
                            py={3}
                            bg="app.surfaceSubtle"
                        >
                            <Box>
                                <Text fontWeight="semibold">{producto.productoNombre}</Text>
                                <Text fontSize="sm" color="app.textSubtle">{producto.productoId}</Text>
                            </Box>
                            <Badge colorPalette="teal" fontSize="sm" px={2} py={1}>
                                {formatCantidad(producto.cantidadReportada)} {producto.tipoUnidades || "unidades"}
                            </Badge>
                        </HStack>

                        <Box display={{ base: "none", md: "block" }} overflowX="auto">
                            <Table.Root size="sm">
                                <Table.Header>
                                    <Table.Row>
                                        <Table.ColumnHeader>Lote</Table.ColumnHeader>
                                        <Table.ColumnHeader>OP</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign='end'>Planeado</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign='end'>Reportado</Table.ColumnHeader>
                                        <Table.ColumnHeader>Responsable</Table.ColumnHeader>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {lotes.map((reporte) => (
                                        <Table.Row key={reporte.reporteId}>
                                            <Table.Cell fontWeight="medium">{reporte.lote}</Table.Cell>
                                            <Table.Cell>{reporte.ordenProduccionId}</Table.Cell>
                                            <Table.Cell textAlign='end'>{formatCantidad(reporte.cantidadPlaneada)}</Table.Cell>
                                            <Table.Cell fontWeight="semibold" textAlign='end'>{formatCantidad(reporte.cantidadReportada)}</Table.Cell>
                                            <Table.Cell>{reporte.reportadoPor}</Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table.Root>
                        </Box>

                        <VStack display={{ base: "flex", md: "none" }} align="stretch" gap={0}>
                            {lotes.map((reporte) => (
                                <Box key={reporte.reporteId} px={4} py={3} borderTopWidth="1px">
                                    <HStack justify="space-between" align="start">
                                        <Box>
                                            <Text fontWeight="semibold">{reporte.lote}</Text>
                                            <Text fontSize="sm" color="app.textSubtle">OP {reporte.ordenProduccionId}</Text>
                                        </Box>
                                        <Text fontWeight="bold">{formatCantidad(reporte.cantidadReportada)}</Text>
                                    </HStack>
                                    <Text mt={2} fontSize="sm" color="app.textSubtle">
                                        Planeado {formatCantidad(reporte.cantidadPlaneada)} · {reporte.reportadoPor}
                                    </Text>
                                </Box>
                            ))}
                        </VStack>
                    </Box>
                );
            })}
        </VStack>
    );
}
