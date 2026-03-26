import { Box, Flex, Text, Icon, VStack } from "@chakra-ui/react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { MdLocationOn } from "react-icons/md";

const handleStyle = {
    width: "1.5em",
    height: "1.5em",
};

export default function AreaOperativaNode(props: NodeProps) {
    const data = props.data;

    return (
        <Box
            border={"2px solid"}
            borderColor={"purple.600"}
            borderRadius={"md"}
            boxShadow={props.selected ? "0 0 10px gold" : "md"}
            transition="box-shadow 0.1s ease"
            _hover={props.selected ? { boxShadow: "0 0 10px gold" } : { boxShadow: "0 0 10px purple" }}
            w={"14em"}
            bg={"white"}
        >
            <Flex direction={"column"} align={"center"}>
                <Box w={"full"} p={"0.5em"} bgColor={"purple.500"} borderTopRadius={"md"}>
                    <Text fontWeight={"bold"} color={"white"} fontSize={"sm"}>
                        Area Operativa
                    </Text>
                </Box>

                <VStack p={"0.5em"} spacing={2} w={"full"}>
                    <Icon as={MdLocationOn} w="3em" h="3em" color="purple.500" />
                    <Text fontWeight={"bold"} fontSize={"md"} textAlign={"center"}>
                        {String(data.label || "Sin asignar")}
                    </Text>
                </VStack>

                <Handle
                    type={"target"}
                    position={Position.Left}
                    id={"input"}
                    style={handleStyle}
                    isConnectable={true}
                />

                <Handle
                    type={"source"}
                    position={Position.Right}
                    id={"output"}
                    style={handleStyle}
                    isConnectable={true}
                />

                <Box w={"full"} p={"0.3em"} bgColor={"purple.100"} borderBottomRadius={"md"}>
                    <Text fontSize={"xs"} color={"purple.700"} textAlign={"center"}>
                        {data.areaOperativaId ? `ID: ${data.areaOperativaId}` : "Click para asignar"}
                    </Text>
                </Box>
            </Flex>
        </Box>
    );
}
