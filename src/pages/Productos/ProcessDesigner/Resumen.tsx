import { useId, useState } from "react";
import { Box, Button, Flex, Table, Text } from "@chakra-ui/react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import type { UnidadMedidaProducto } from "../types.tsx";
import type { DesignerProduct } from "./CabeceraDatos.tsx";
import type { DesignerNode } from "./ProcessDesignerTab.tsx";

const numberFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 12 });
const moneyFormat = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 6 });

function nonNegativeNumber(value: unknown): number | null {
    if ((typeof value !== "number" && typeof value !== "string") || String(value).trim() === "") return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
}

// Costs are catalog costs per inventory unit, not per container or per recipe.
function inventoryQuantity(quantity: unknown, from: string, to: string, units: UnidadMedidaProducto[]): number | null {
    const amount = nonNegativeNumber(quantity);
    const source = units.find(unit => unit.codigo === from);
    const target = units.find(unit => unit.codigo === to);
    if (amount === null || amount <= 0 || !source || !target || source.magnitud !== target.magnitud
        || !Number.isFinite(source.factorAReferencia) || source.factorAReferencia <= 0
        || !Number.isFinite(target.factorAReferencia) || target.factorAReferencia <= 0) return null;
    const result = amount * source.factorAReferencia / target.factorAReferencia;
    return Number.isFinite(result) && result > 0 ? result : null;
}

export default function Resumen({ product, nodes, units }: {
    product: DesignerProduct; nodes: DesignerNode[]; units: UnidadMedidaProducto[];
}) {
    const contentId = useId();
    const [expanded, setExpanded] = useState(false);
    const symbol = (code: string) => units.find(unit => unit.codigo === code)?.simbolo || code || "Sin unidad";
    const rows = nodes.filter(node => node.type === "material" || node.type === "semiterminado").map(node => {
        const { producto, cantidad, unidad } = node.data;
        const price = nonNegativeNumber(producto.costo);
        const amount = inventoryQuantity(cantidad, unidad, producto.tipoUnidades, units);
        const cost = amount !== null && price !== null ? amount * price : null;
        return { id: node.id, producto, cantidad, unidad, price, cost: cost !== null && Number.isFinite(cost) ? cost : null };
    });
    const knownTotal = rows.reduce((sum, row) => sum + (row.cost ?? 0), 0);
    const complete = rows.length > 0 && rows.every(row => row.cost !== null) && Number.isFinite(knownTotal);
    // La salida ya está expresada en la unidad de inventario; los insumos sí pueden necesitar conversión.
    const outputAmount = nonNegativeNumber(product.cantidadSalidaReceta);
    const output = outputAmount !== null && outputAmount > 0 && units.some(unit => unit.codigo === product.tipoUnidades) ? outputAmount : null;
    const perUnit = complete && output !== null ? knownTotal / output : null;
    const costPerUnit = perUnit !== null && Number.isFinite(perUnit) ? perUnit : null;
    const outputLabel = output !== null
        ? `${numberFormat.format(output)} ${symbol(product.tipoUnidades)}` : "Salida por definir";

    return <Box as="section" borderWidth="1px" rounded="md" mt="3" bg="bg.panel" aria-label="Resumen de la receta">
        <Button w="full" h="auto" minH="10" py="2" px="3" variant="ghost" justifyContent="start" whiteSpace="normal"
            aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded(value => !value)}>
            {expanded ? <FiChevronUp /> : <FiChevronDown />}
            <Flex flex="1" gap="2" justify="space-between" flexWrap="wrap" textAlign="start" fontSize="sm">
                <Text>Resumen · {rows.length} {rows.length === 1 ? "insumo" : "insumos"} · {outputLabel}</Text>
                <Text color={complete ? "fg" : "fg.muted"}>
                    {complete ? `${moneyFormat.format(knownTotal)} COP · estimado de receta` : rows.length ? "Costo incompleto" : "Sin calcular"}
                </Text>
            </Flex>
        </Button>
        <Box id={contentId} hidden={!expanded} borderTopWidth="1px" p="3">
            {!rows.length ? <Text fontSize="sm" color="fg.muted">Agrega insumos al lienzo para ver sus cantidades y costos.</Text> : <>
                <Table.ScrollArea maxH="80" borderWidth="1px" rounded="sm">
                    <Table.Root size="sm" stickyHeader css={{ "& td": { lineHeight: "short" } }}>
                        <Table.Header><Table.Row>
                            <Table.ColumnHeader>Insumo</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign="end">Cantidad de receta</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign="end">Costo de catálogo (COP)</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign="end">Subtotal (COP)</Table.ColumnHeader>
                        </Table.Row></Table.Header>
                        <Table.Body>{rows.map(row => <Table.Row key={row.id}>
                            <Table.Cell><Text fontWeight="medium">{row.producto.nombre}</Text>
                                <Text fontSize="xs" color="fg.muted">{row.producto.productoId} · {row.producto.tipo_producto === "S" ? "Semiterminado" : "Material"}</Text>
                            </Table.Cell>
                            <Table.Cell textAlign="end" whiteSpace="nowrap">{row.cantidad || "—"} {symbol(row.unidad)}</Table.Cell>
                            <Table.Cell textAlign="end" whiteSpace="nowrap">
                                {row.price === null ? "Sin dato" : `${moneyFormat.format(row.price)} / ${symbol(row.producto.tipoUnidades)}`}
                            </Table.Cell>
                            <Table.Cell textAlign="end" whiteSpace="nowrap">
                                {row.cost !== null ? moneyFormat.format(row.cost) : row.price === null ? "Sin dato" : "Revisar cantidad/unidad"}
                            </Table.Cell>
                        </Table.Row>)}</Table.Body>
                    </Table.Root>
                </Table.ScrollArea>
                <Flex mt="3" gap={{ base: "2", md: "6" }} justify="end" flexWrap="wrap" fontSize="sm">
                    <Text>{complete ? "Total receta" : "Subtotal conocido"}: <strong>{Number.isFinite(knownTotal) ? moneyFormat.format(knownTotal) : "No calculable"} COP</strong></Text>
                    <Text>Costo por 1 {symbol(product.tipoUnidades)} de salida: <strong>{costPerUnit !== null ? `${moneyFormat.format(costPerUnit)} COP` : "Sin calcular"}</strong></Text>
                </Flex>
                {!complete && <Text mt="2" fontSize="xs" color="fg.warning">Estimación incompleta: revisa los costos, cantidades y unidades indicados. Los datos faltantes no se consideran cero.</Text>}
            </>}
            <Text mt="2" fontSize="xs" color="fg.muted">
                Cantidades para la receta completa → {outputLabel}. El costo usa las unidades de inventario del catálogo y se actualiza con el borrador.
                No incluye empaque por caja, mano de obra ni costos adicionales. El servidor recalcula al guardar.
            </Text>
        </Box>
    </Box>;
}
