import { Box, Flex, Icon, Input, Stack, Text } from "@chakra-ui/react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { PiCubeFocusThin } from "react-icons/pi";
import type { ReactNode } from "react";
import type { Producto } from "../../types.tsx";

export type InputNodeData = { producto: Producto; cantidad: string; onQuantityChange?: (value: string) => void };
export type MaterialFlowNode = Node<InputNodeData, "material">;

export default function MaterialNode({ data, selected, isConnectable }: NodeProps<MaterialFlowNode>) {
    return <InputNodeCard data={data} selected={selected} isConnectable={isConnectable} palette="green" label="Material" icon={<PiCubeFocusThin />} />;
}

// Shared presentation through composition; each UML artifact keeps its own node kind.
export function InputNodeCard({ data, selected, isConnectable, palette, label, icon }: {
    data: InputNodeData; selected: boolean; isConnectable: boolean;
    palette: string; label: string; icon: ReactNode;
}) {
    const { producto } = data;
    return (
        <Box
            w="12em" p="2" position="relative" textAlign="center" bg="bg.panel" color="fg"
            borderWidth="2px" borderColor={selected ? "yellow.500" : "fg"}
            shadow={selected ? "md" : "none"} transition="box-shadow 0.1s ease"
            _hover={{ shadow: "md" }} colorPalette={palette}
        >
            <Stack gap="1" align="center">
                <Box bg="colorPalette.subtle" color="colorPalette.fg" w="full" p="1">
                    <Text fontWeight="bold" overflowWrap="anywhere" title={producto.productoId}>{producto.nombre}</Text>
                </Box>
                <Flex align="center" gap="2" borderTopWidth="2px" borderColor="fg" w="full" pt="1">
                    <Icon boxSize="3em" flexShrink="0" color="orange.500" aria-hidden="true" asChild>
                        {icon}
                    </Icon>
                    <Stack gap="0" minW="0">
                        <Text fontSize="xs">Cantidad requerida</Text>
                        <Input className="nodrag nowheel" size="sm" type="number" min="0" step="any"
                            aria-label={`Cantidad requerida de ${producto.nombre}`} value={data.cantidad} readOnly={!data.onQuantityChange}
                            onChange={(event) => data.onQuantityChange?.(event.target.value)} />
                        <Text fontSize="sm">{producto.tipoUnidades}</Text>
                    </Stack>
                </Flex>
                <Box bg="colorPalette.subtle" color="colorPalette.fg" w="full" p="1">
                    <Text fontWeight="bold">{label}</Text>
                </Box>
            </Stack>
            <Handle type="source" position={Position.Right} id="i1" style={{ width: "2em", height: "2em" }} isConnectable={isConnectable} />
        </Box>
    );
}
