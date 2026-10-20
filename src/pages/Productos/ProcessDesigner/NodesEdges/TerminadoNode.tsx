import { Box, Icon, Stack, Text } from "@chakra-ui/react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { GrCubes } from "react-icons/gr";
import type { Producto } from "../../types.tsx";

// Target describes a graph role. The existing workflow also manufactures semiterminados.
export type TerminadoFlowNode = Node<{ producto: Pick<Producto, "nombre" | "tipo_producto"> }, "target">;

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
                <Icon boxSize="4em" color="orange.500" aria-hidden="true" asChild><GrCubes /></Icon>
                <Handle type="target" position={Position.Left} id="i1" style={{ width: "2em", height: "2em" }} isConnectable={isConnectable} />
                <Box bg="red.solid" color="red.contrast" w="full">
                    <Text fontWeight="bold">{producto.tipo_producto === "S" ? "Semiterminado" : "Terminado"}</Text>
                </Box>
            </Stack>
        </Box>
    );
}
