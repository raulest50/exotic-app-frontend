import { Alert, Badge, Box, HStack, Table, Text, VStack } from "@chakra-ui/react";
import { useMemo } from "react";
import FiltrosIngresoTerminados from "./FiltrosIngresoTerminados";
import type { FiltrosLecturaTerminados, ReporteProduccionPendiente } from "./types";
import { consolidarProductos, formatCantidad } from "./produccionCierreUtils";

interface Props {
    reportes: ReporteProduccionPendiente[];
    filtros: FiltrosLecturaTerminados;
    onFiltrosChange: (value: FiltrosLecturaTerminados) => void;
}

function normalizarNombre(value: string): string {
    return value.normalize("NFD").replace(/\p{M}/gu, "").trim().toLocaleLowerCase("es");
}

export default function IngresoTerminadosStep1Lectura({ reportes, filtros, onFiltrosChange }: Props) {
    const categorias = useMemo(() => {
        const porId = new Map<number, string>();
        reportes.forEach((reporte) => {
            if (reporte.categoriaId != null && !porId.has(reporte.categoriaId)) {
                porId.set(
                    reporte.categoriaId,
                    reporte.categoriaNombre?.trim() || `Categoría ${reporte.categoriaId}`,
                );
            }
        });
        return Array.from(porId, ([categoriaId, categoriaNombre]) => ({ categoriaId, categoriaNombre }))
            .sort((left, right) => left.categoriaNombre.localeCompare(right.categoriaNombre, "es")
                || left.categoriaId - right.categoriaId);
    }, [reportes]);
    const reportesVisibles = useMemo(() => {
        const nombre = normalizarNombre(filtros.nombre);
        return reportes.filter((reporte) =>
            normalizarNombre(reporte.productoNombre).includes(nombre)
            && (filtros.categoriaId === null || reporte.categoriaId === filtros.categoriaId));
    }, [filtros.categoriaId, filtros.nombre, reportes]);
    const consolidados = consolidarProductos(reportesVisibles);
    const totalProductos = new Set(reportes.map((reporte) => reporte.productoId)).size;

    return (
        <VStack align="stretch" gap={5}>
            <FiltrosIngresoTerminados value={filtros} categorias={categorias} onChange={onFiltrosChange} />
            <Text role="status" fontSize="sm" color="app.textMuted">
                {consolidados.length} de {totalProductos} producto(s) · {reportesVisibles.length} de {reportes.length} lote(s)
            </Text>
            {reportesVisibles.length === 0 ? (
                <Alert.Root status="info" borderRadius="md">
                    <Alert.Indicator />
                    No hay productos que coincidan con los filtros. Ajuste el nombre o la categoría, o limpie los filtros.
                </Alert.Root>
            ) : null}
            {consolidados.map((producto) => {
                const lotes = reportesVisibles.filter((reporte) => reporte.productoId === producto.productoId);
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
                                        <Table.ColumnHeader>Calidad</Table.ColumnHeader>
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
                                            <Table.Cell>
                                                <Badge colorPalette={reporte.puedeIngresar ? "green" : "orange"}>
                                                    {reporte.puedeIngresar
                                                        ? "Disponible para ingreso"
                                                        : reporte.estadoCalidad}
                                                </Badge>
                                                <Text fontSize="xs" color="app.textSubtle">
                                                    Calidad: {reporte.estadoCalidad} · Expediente: {reporte.batchRecordEstado ?? "SIN EXPEDIENTE"}
                                                </Text>
                                                {!reporte.puedeIngresar ? <Text fontSize="xs" color="app.textSubtle">{reporte.motivoBloqueo}</Text> : null}
                                            </Table.Cell>
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
                                    <Badge mt={2} colorPalette={reporte.puedeIngresar ? "green" : "orange"}>
                                        {reporte.puedeIngresar
                                            ? "Disponible para ingreso"
                                            : reporte.motivoBloqueo}
                                    </Badge>
                                    <Text mt={1} fontSize="xs" color="app.textSubtle">
                                        Calidad: {reporte.estadoCalidad} · Expediente: {reporte.batchRecordEstado ?? "SIN EXPEDIENTE"}
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
