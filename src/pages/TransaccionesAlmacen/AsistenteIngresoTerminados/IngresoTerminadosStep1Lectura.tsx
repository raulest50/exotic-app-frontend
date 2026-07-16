import {
    Badge,
    Box,
    HStack,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    VStack,
} from "@chakra-ui/react";
import type { ReporteProduccionPendiente } from "./types";
import { consolidarProductos, formatCantidad } from "./produccionCierreUtils";

interface Props {
    reportes: ReporteProduccionPendiente[];
}

export default function IngresoTerminadosStep1Lectura({ reportes }: Props) {
    const consolidados = consolidarProductos(reportes);

    return (
        <VStack align="stretch" spacing={5}>
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
                            <Badge colorScheme="teal" fontSize="sm" px={2} py={1}>
                                {formatCantidad(producto.cantidadReportada)} {producto.tipoUnidades || "unidades"}
                            </Badge>
                        </HStack>

                        <Box display={{ base: "none", md: "block" }} overflowX="auto">
                            <Table size="sm">
                                <Thead>
                                    <Tr>
                                        <Th>Lote</Th>
                                        <Th>OP</Th>
                                        <Th isNumeric>Planeado</Th>
                                        <Th isNumeric>Reportado</Th>
                                        <Th>Responsable</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {lotes.map((reporte) => (
                                        <Tr key={reporte.reporteId}>
                                            <Td fontWeight="medium">{reporte.lote}</Td>
                                            <Td>{reporte.ordenProduccionId}</Td>
                                            <Td isNumeric>{formatCantidad(reporte.cantidadPlaneada)}</Td>
                                            <Td isNumeric fontWeight="semibold">{formatCantidad(reporte.cantidadReportada)}</Td>
                                            <Td>{reporte.reportadoPor}</Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </Box>

                        <VStack display={{ base: "flex", md: "none" }} align="stretch" spacing={0}>
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
