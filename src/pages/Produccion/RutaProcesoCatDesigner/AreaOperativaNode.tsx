import { Box, Flex, Text, Icon, VStack, Checkbox } from "@chakra-ui/react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";
import { MdLocationOn } from "react-icons/md";

const handleStyle = {
    width: "1.5em",
    height: "1.5em",
};

export default function AreaOperativaNode(props: NodeProps) {
    const data = props.data;
    const { setNodes } = useReactFlow();

    const hasLeftHandle = data.hasLeftHandle !== false;
    const hasRightHandle = data.hasRightHandle !== false;

    const handleLeftHandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === props.id
                    ? { ...node, data: { ...node.data, hasLeftHandle: e.target.checked } }
                    : node
            )
        );
    };

    const handleRightHandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === props.id
                    ? { ...node, data: { ...node.data, hasRightHandle: e.target.checked } }
                    : node
            )
        );
    };

    return (
        <Box position="relative">
            {/* Left checkbox - only visible when selected */}
            {props.selected && (
                <Box
                    position="absolute"
                    left="-2.5em"
                    top="50%"
                    transform="translateY(-50%)"
                    zIndex={10}
                >
                    <Checkbox
                        isChecked={hasLeftHandle}
                        onChange={handleLeftHandleChange}
                        colorScheme="purple"
                        size="lg"
                        title="Handle izquierdo"
                    />
                </Box>
            )}

            {/* Right checkbox - only visible when selected */}
            {props.selected && (
                <Box
                    position="absolute"
                    right="-2.5em"
                    top="50%"
                    transform="translateY(-50%)"
                    zIndex={10}
                >
                    <Checkbox
                        isChecked={hasRightHandle}
                        onChange={handleRightHandleChange}
                        colorScheme="purple"
                        size="lg"
                        title="Handle derecho"
                    />
                </Box>
            )}

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

                    {hasLeftHandle && (
                        <Handle
                            type={"target"}
                            position={Position.Left}
                            id={"input"}
                            style={handleStyle}
                            isConnectable={true}
                        />
                    )}

                    {hasRightHandle && (
                        <Handle
                            type={"source"}
                            position={Position.Right}
                            id={"output"}
                            style={handleStyle}
                            isConnectable={true}
                        />
                    )}

                    <Box w={"full"} p={"0.3em"} bgColor={"purple.100"} borderBottomRadius={"md"}>
                        <Text fontSize={"xs"} color={"purple.700"} textAlign={"center"}>
                            {data.areaOperativaId ? `ID: ${data.areaOperativaId}` : "Click para asignar"}
                        </Text>
                    </Box>
                </Flex>
            </Box>
        </Box>
    );
}
