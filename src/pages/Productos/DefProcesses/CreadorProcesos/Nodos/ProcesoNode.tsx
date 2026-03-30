

import {Box, Flex, Text, Icon, VStack, HStack, Badge} from "@chakra-ui/react";
import {Handle, Position, NodeProps} from "@xyflow/react";

import { TbArrowsJoin } from "react-icons/tb";

import { BiRename } from "react-icons/bi";
import { PiClockCountdownFill } from "react-icons/pi";
import { MdSettings } from "react-icons/md"; // Icon for setup time
import { TimeModelType } from "../../../types.tsx";

const handleStyle = {
    width:"2em",
    height:"2em",
}

export default function ProcesoNode(props: NodeProps) {

    const data = props.data;

    return (
        <Box
            border={"2px solid black"}
            boxShadow={props.selected ? "0 0 10px gold" : ""}
            transition="box-shadow 0.1s ease"
            _hover={props.selected ? { boxShadow: "0 0 10px gold" } : { boxShadow: "0 0 10px blue" }}
            w={"17em"}
        >

            <Flex
                //bgColor={"green.200"}
                direction={"column"}
                align={"center"}
            >

                <Box w={"full"} p={"0.5em"} flex={1} bgColor={"blue.400"}>
                    <Text fontWeight={"bold"}>
                        {String(data.label)}
                    </Text>
                </Box>

                <Icon mr={"1em"} ml={"1em"} as={TbArrowsJoin} w="4em" h="4em" color="tomato" />

                <Handle
                    type={"target"}
                    position={Position.Left}
                    id={"o1"}
                    style={handleStyle}
                    isConnectable={true}
                />

                <Handle
                    type={"source"}
                    position={Position.Right}
                    id={"i1"}
                    style={handleStyle}
                    isConnectable={true}
                />

                <VStack w={"full"} borderTop={"2px solid gray"} background={"gray.50"} pt={"1em"}>
                    {String(data.nombreProceso).trim() !== "" && (
                        <HStack w="full">
                            <Icon mr="1em" ml="1em" as={BiRename} w="2em" h="2em" color="teal" />
                            <Text fontWeight="bold">{String(data.nombreProceso)}</Text>
                        </HStack>
                    )}

                    {String(data.areaOperativaNombre || "").trim() !== "" && (
                        <HStack w="full">
                            <Icon mr="1em" ml="1em" as={BiRename} w="2em" h="2em" color="purple.500" />
                            <Text fontWeight="bold">Area: {String(data.areaOperativaNombre)}</Text>
                        </HStack>
                    )}

                    {/* Setup Time Row */}
                    {String(data.setupTime || "").trim() !== "" && (
                        <HStack w="full">
                            <Icon mr="1em" ml="1em" as={MdSettings} w="2em" h="2em" color="orange.500" />
                            <Text fontWeight="bold">Setup: {String(data.setupTime)} seg</Text>
                        </HStack>
                    )}

                    {/* Modelo de Tiempo Row */}
                    {String(data.model || "").trim() !== "" && (
                        <HStack w="full">
                            <Icon mr="1em" ml="1em" as={PiClockCountdownFill} w="2em" h="2em" color="teal" />
                            <Text fontWeight="bold">Modelo: </Text>
                            <Badge colorScheme="teal">{String(data.model)}</Badge>
                        </HStack>
                    )}

                    {/* Parámetros específicos según el modelo */}
                    {data.model === TimeModelType.CONSTANT && data.constantSeconds && (
                        <HStack w="full" pl="3em">
                            <Text fontWeight="bold">Tiempo constante: {data.constantSeconds} seg</Text>
                        </HStack>
                    )}

                    {data.model === TimeModelType.THROUGHPUT_RATE && data.throughputUnitsPerSec && (
                        <HStack w="full" pl="3em">
                            <Text fontWeight="bold">Tasa: {data.throughputUnitsPerSec} u/seg</Text>
                        </HStack>
                    )}

                    {data.model === TimeModelType.PER_UNIT && data.secondsPerUnit && (
                        <HStack w="full" pl="3em">
                            <Text fontWeight="bold">Tiempo/unidad: {data.secondsPerUnit} seg</Text>
                        </HStack>
                    )}

                    {data.model === TimeModelType.PER_BATCH && data.secondsPerBatch && data.batchSize && (
                        <>
                            <HStack w="full" pl="3em">
                                <Text fontWeight="bold">Tiempo/lote: {data.secondsPerBatch} seg</Text>
                            </HStack>
                            <HStack w="full" pl="3em">
                                <Text fontWeight="bold">Tamaño lote: {data.batchSize} u</Text>
                            </HStack>
                        </>
                    )}

                    {/* Backward compatibility for old data */}
                    {!data.model && (data.constantSeconds || data.secondsPerUnit || data.secondsPerBatch) && (
                        <HStack w="full">
                            <Icon mr="1em" ml="1em" as={PiClockCountdownFill} w="2em" h="2em" color="teal" />
                            <Text fontWeight="bold">
                                Process Time: {data.constantSeconds || data.secondsPerUnit || data.secondsPerBatch} seg
                            </Text>
                        </HStack>
                    )}
                </VStack>

                <Box
                    flex={1}
                    bgColor={"blue.400"}
                    w={"full"}
                >
                    <Text fontWeight={"bold"} > Proceso </Text>
                </Box>

            </Flex>
        </Box>
    )
}
