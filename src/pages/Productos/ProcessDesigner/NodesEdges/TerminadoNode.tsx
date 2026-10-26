import { Box, Field, Grid, Icon, Input, NativeSelect, Stack, Text } from "@chakra-ui/react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { GrCubes } from "react-icons/gr";
import type { Producto, UnidadMedidaProducto } from "../../types.tsx";

// Target describes a graph role. The existing workflow also manufactures semiterminados.
export type TerminadoFlowNode = Node<{
    producto: Pick<Producto, "nombre" | "tipo_producto">;
    // La unidad representa Producto.tipoUnidades: salida de receta e inventario.
    output?: { quantity: string; unit: string };
    units?: UnidadMedidaProducto[];
    onQuantityChange?: (value: string) => void;
    onUnitChange?: (value: string) => void;
}, "target">;

export default function TerminadoNode({ data, selected, isConnectable }: NodeProps<TerminadoFlowNode>) {
    const { producto } = data;
    return (
        <Box
            w="15em" position="relative" textAlign="center" bg="bg.panel" color="fg"
            borderWidth="2px" borderColor={selected ? "yellow.500" : "fg"}
            shadow={selected ? "md" : "none"} transition="box-shadow 0.1s ease" _hover={{ shadow: "md" }}
        >
            <Stack align="center" gap="2">
                <Box bg="red.solid" color="red.contrast" w="full" p="2">
                    <Text fontWeight="bold" overflowWrap="anywhere">{producto.nombre}</Text>
                </Box>
                {/* El puerto izquierdo ocupa 1em dentro del nodo; reservar espacio para los controles. */}
                <Stack w="full" pl="6" pr="3" gap="2">
                    <Grid w="full" templateColumns="minmax(0, 1fr) 5rem" gap="2" alignItems="end">
                        <Field.Root minW="0" required={!!data.onQuantityChange}>
                            <Field.Label fontSize="xs">Cantidad obtenida</Field.Label>
                            <Input className="nodrag nowheel" size="sm" type="number" min="0" step="any" minW="0"
                                aria-label={`Cantidad obtenida de ${producto.nombre}`} value={data.output?.quantity ?? ""}
                                placeholder={data.onQuantityChange ? "Cantidad" : "Sin especificar"}
                                readOnly={!data.onQuantityChange} onChange={event => data.onQuantityChange?.(event.target.value)} />
                        </Field.Root>
                        <Field.Root minW="0" required={!!data.onUnitChange}>
                            <Field.Label fontSize="xs">Unidad</Field.Label>
                            {data.onUnitChange ? <NativeSelect.Root size="sm" className="nodrag nowheel" w="full">
                                <NativeSelect.Field aria-label={`Unidad de salida e inventario de ${producto.nombre}`} value={data.output?.unit ?? ""}
                                    onChange={event => data.onUnitChange?.(event.target.value)}>
                                    <option value="">Elegir</option>
                                    {data.units?.map(unit => <option key={unit.codigo} value={unit.codigo}>{unit.codigo}</option>)}
                                </NativeSelect.Field><NativeSelect.Indicator />
                            </NativeSelect.Root> : <Text w="full" minH="8" display="flex" alignItems="center" justifyContent="center"
                                borderWidth="1px" rounded="sm" bg="bg.subtle" fontSize="sm" fontWeight="medium"
                                title="Unidad de salida e inventario">{data.output?.unit || "—"}</Text>}
                        </Field.Root>
                    </Grid>
                    {data.onQuantityChange && !data.onUnitChange && <Text fontSize="xs" color="fg.muted">Se conserva la unidad del producto existente.</Text>}
                </Stack>
                <Icon boxSize="4em" color="orange.500" aria-hidden="true" asChild><GrCubes /></Icon>
                <Handle type="target" position={Position.Left} id="i1" style={{ width: "2em", height: "2em" }} isConnectable={isConnectable} />
                <Box bg="red.solid" color="red.contrast" w="full">
                    <Text fontWeight="bold">{producto.tipo_producto === "S" ? "Semiterminado" : "Terminado"}</Text>
                </Box>
            </Stack>
        </Box>
    );
}
