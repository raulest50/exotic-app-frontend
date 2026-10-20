import { Badge, Box, Flex, Icon, Stack, Text } from "@chakra-ui/react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { TbArrowsJoin } from "react-icons/tb";
import { BiRename } from "react-icons/bi";
import { MdSettings } from "react-icons/md";
import { PiClockCountdownFill } from "react-icons/pi";
import { TimeModelType, type NodoProcesoDTO } from "../../types.tsx";

export type ProcessFlowNode = Node<{ proceso: NodoProcesoDTO }, "process">;

export default function ProcessNode({ data, selected, isConnectable }: NodeProps<ProcessFlowNode>) {
    const process = data.proceso;
    const parameters: string[] = [];
    if (process.model === TimeModelType.CONSTANT && process.constantSeconds != null) {
        parameters.push(`Tiempo constante: ${process.constantSeconds} seg`);
    } else if (process.model === TimeModelType.THROUGHPUT_RATE && process.throughputUnitsPerSec != null) {
        parameters.push(`Tasa: ${process.throughputUnitsPerSec} u/seg`);
    } else if (process.model === TimeModelType.PER_UNIT && process.secondsPerUnit != null) {
        parameters.push(`Tiempo/unidad: ${process.secondsPerUnit} seg`);
    } else if (process.model === TimeModelType.PER_BATCH) {
        if (process.secondsPerBatch != null) parameters.push(`Tiempo/lote: ${process.secondsPerBatch} seg`);
        if (process.batchSize != null) parameters.push(`Tamaño lote: ${process.batchSize} u`);
    }
    return (
        <Box
            w="17em" position="relative" textAlign="center" bg="bg.panel" color="fg"
            borderWidth="2px" borderColor={selected ? "yellow.500" : "fg"}
            shadow={selected ? "md" : "none"} transition="box-shadow 0.1s ease" _hover={{ shadow: "md" }}
        >
            <Box w="full" p="2" bg="blue.solid" color="blue.contrast">
                <Text fontWeight="bold" overflowWrap="anywhere">{process.label || process.procesoNombre || "Proceso"}</Text>
            </Box>
            <Flex justify="center" py="2"><Icon boxSize="4em" color="orange.500" aria-hidden="true" asChild><TbArrowsJoin /></Icon></Flex>
            <Handle type="target" position={Position.Left} id="o1" style={{ width: "2em", height: "2em" }} isConnectable={isConnectable} />
            <Handle type="source" position={Position.Right} id="i1" style={{ width: "2em", height: "2em" }} isConnectable={isConnectable} />
            <Stack p="3" gap="2" bg="bg.subtle" borderTopWidth="2px" textAlign="left" fontWeight="bold">
                {process.procesoNombre && <Flex align="center" gap="2"><Icon flexShrink="0" aria-hidden="true" asChild><BiRename /></Icon><Text overflowWrap="anywhere">{process.procesoNombre}</Text></Flex>}
                {process.areaOperativaNombre && <Text overflowWrap="anywhere">Área: {process.areaOperativaNombre}</Text>}
                {process.setUpTime != null && <Flex align="center" gap="2"><Icon flexShrink="0" color="orange.500" aria-hidden="true" asChild><MdSettings /></Icon><Text>Setup: {process.setUpTime} seg</Text></Flex>}
                {process.model && <Flex align="center" gap="2" flexWrap="wrap"><Icon aria-hidden="true" asChild><PiClockCountdownFill /></Icon><Text>Modelo:</Text><Badge colorPalette="teal">{process.model}</Badge></Flex>}
                {parameters.map((parameter) => <Text key={parameter} fontSize="sm">{parameter}</Text>)}
            </Stack>
            <Box bg="blue.solid" color="blue.contrast" w="full"><Text fontWeight="bold">Proceso</Text></Box>
        </Box>
    );
}
