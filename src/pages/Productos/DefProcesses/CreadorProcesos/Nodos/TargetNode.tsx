import {Handle, NodeProps, Position} from "@xyflow/react";
import { Steps, Box, Flex, Icon, Text } from "@chakra-ui/react";
import { GrCubes } from "react-icons/gr";


const handleStyle = {
    width:"2em",
    height:"2em",
}


export default function TargetNode(props: NodeProps) {

    const data = props.data;

    return (
        <Box
            border={"2px solid black"}
            transition="box-shadow 0.1s ease"
            _hover={{ boxShadow: "0 0 10px red" }}
            w={"15em"}
        >
            <Flex
                direction={"column"}
                gap={2}
                align={"center"}
            >
                <Box
                    flex={1}
                    bgColor={"red.400"}
                    w={"full"}
                    p={"0.5em"}
                >
                    <Text fontWeight={"bold"}>
                        {String(data.label)}
                    </Text>
                </Box>

                <Icon w="4em" h="4em" color={"tomato"} asChild><GrCubes /></Icon>

                <Box w={"1em"} h={"1em"} flex={5}>
                    <Handle
                        type={"target"}
                        position={Position.Left}
                        id={"i1"}
                        style={handleStyle}
                        isConnectable={true}

                    />
                </Box>

                <Box
                    flex={1}
                    bgColor={"red.400"}
                    w={"full"}
                >
                    <Text fontWeight={"bold"}> {data.tipo_producto === "S" ? "Semiterminado" : "Terminado"} </Text>
                </Box>

            </Flex>
        </Box>
    );
}
