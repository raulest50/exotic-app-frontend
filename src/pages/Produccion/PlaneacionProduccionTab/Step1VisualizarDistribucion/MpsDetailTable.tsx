import {
    Accordion,
    AccordionButton,
    AccordionIcon,
    AccordionItem,
    AccordionPanel,
    Badge,
    Box,
    Table,
    TableContainer,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    VStack,
} from "@chakra-ui/react";
import type { PropuestaMpsSemanalItemDTO } from "../PlaneacionProduccionService";
import { formatNumber } from "./mpsCalendar.utils";

interface MpsDetailTableProps {
    items: PropuestaMpsSemanalItemDTO[];
}

export default function MpsDetailTable({ items }: MpsDetailTableProps) {
    return (
        <Accordion allowToggle defaultIndex={[]}>
            <AccordionItem bg="white" borderRadius="md" boxShadow="sm">
                <h2>
                    <AccordionButton>
                        <Box as="span" flex="1" textAlign="left" fontWeight="bold">
                            Detalle tecnico
                        </Box>
                        <AccordionIcon />
                    </AccordionButton>
                </h2>
                <AccordionPanel pt={0}>
                    <TableContainer>
                        <Table size="sm" variant="simple">
                            <Thead>
                                <Tr>
                                    <Th>Codigo</Th>
                                    <Th>Producto</Th>
                                    <Th>Categoria</Th>
                                    <Th isNumeric>% Participacion</Th>
                                    <Th isNumeric>Necesidad</Th>
                                    <Th isNumeric>Stock</Th>
                                    <Th isNumeric>Necesidad neta</Th>
                                    <Th isNumeric>Lote size</Th>
                                    <Th isNumeric>Lotes</Th>
                                    <Th isNumeric>Cantidad propuesta</Th>
                                    <Th isNumeric>Delta</Th>
                                    <Th>Fecha final</Th>
                                    <Th>Estado</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {items.map((item) => {
                                    const statusColor = !item.planificable
                                        ? "red"
                                        : item.desbordaSemana
                                            ? "orange"
                                            : item.lotesPropuestos === 0
                                                ? "gray"
                                                : "green";
                                    const statusLabel = !item.planificable
                                        ? "No planificable"
                                        : item.desbordaSemana
                                            ? "Desborda semana"
                                            : item.lotesPropuestos === 0
                                                ? "Sin produccion"
                                                : "Propuesto";

                                    return (
                                        <Tr key={item.productoId}>
                                            <Td>{item.productoId}</Td>
                                            <Td>{item.productoNombre}</Td>
                                            <Td>{item.categoriaNombre ?? "-"}</Td>
                                            <Td isNumeric>{item.porcentajeParticipacion.toFixed(2)}%</Td>
                                            <Td isNumeric>{formatNumber(item.necesidadManual)}</Td>
                                            <Td isNumeric>{formatNumber(item.stockActual)}</Td>
                                            <Td isNumeric>{formatNumber(item.necesidadNeta)}</Td>
                                            <Td isNumeric>{item.loteSize}</Td>
                                            <Td isNumeric>{item.lotesPropuestos}</Td>
                                            <Td isNumeric>{formatNumber(item.cantidadPropuesta)}</Td>
                                            <Td isNumeric>{formatNumber(item.deltaVsNecesidad)}</Td>
                                            <Td>{item.fechaFinalPlanificadaSugerida ?? "-"}</Td>
                                            <Td>
                                                <VStack align="start" spacing={1}>
                                                    <Badge colorScheme={statusColor}>{statusLabel}</Badge>
                                                    {item.warning && (
                                                        <Text fontSize="xs" color="gray.600">
                                                            {item.warning}
                                                        </Text>
                                                    )}
                                                </VStack>
                                            </Td>
                                        </Tr>
                                    );
                                })}
                            </Tbody>
                        </Table>
                    </TableContainer>
                </AccordionPanel>
            </AccordionItem>
        </Accordion>
    );
}
