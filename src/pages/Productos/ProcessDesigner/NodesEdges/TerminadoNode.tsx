import { Box, Field, Icon, Input, NativeSelect, Stack, Text } from "@chakra-ui/react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { GrCubes } from "react-icons/gr";
import type { Producto, UnidadMedidaProducto } from "../../types.tsx";

// Target describes a graph role. The existing workflow also manufactures semiterminados.
export type TerminadoFlowNode = Node<{
    producto: Pick<Producto, "nombre" | "tipo_producto">;
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
                <Stack w="full" px="2" gap="2">
                    <Field.Root required={!!data.onQuantityChange}>
                        <Field.Label fontSize="xs">Cantidad obtenida con esta receta</Field.Label>
                        <Input className="nodrag nowheel" size="sm" type="number" min="0" step="any"
                            aria-label={`Cantidad obtenida de ${producto.nombre}`} value={data.output?.quantity ?? ""}
                            placeholder={data.onQuantityChange ? "Cantidad" : "Sin especificar"}
                            readOnly={!data.onQuantityChange} onChange={event => data.onQuantityChange?.(event.target.value)} />
                    </Field.Root>
                    <Field.Root required={!!data.onUnitChange}>
                        <Field.Label fontSize="xs">Unidad de la salida</Field.Label>
                        {data.onUnitChange ? <NativeSelect.Root size="sm" className="nodrag nowheel">
                            <NativeSelect.Field aria-label={`Unidad de salida de ${producto.nombre}`} value={data.output?.unit ?? ""}
                                onChange={event => data.onUnitChange?.(event.target.value)}>
                                <option value="">Elegir</option>
                                {data.units?.map(unit => <option key={unit.codigo} value={unit.codigo}>{unit.simbolo}</option>)}
                            </NativeSelect.Field><NativeSelect.Indicator />
                        </NativeSelect.Root> : <Text fontSize="sm">{data.output?.unit || "Sin especificar"}</Text>}
                    </Field.Root>
                    {data.onQuantityChange && <Text fontSize="xs" color="fg.muted">Las cantidades de todos los insumos corresponden a esta salida completa.</Text>}
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
