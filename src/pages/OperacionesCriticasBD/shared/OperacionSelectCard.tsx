import { IconType } from "react-icons";
import { useColorModeValue } from "../../../components/ui/color-mode";
import { Steps, Card, Text, Circle, Heading, Icon, VStack } from "@chakra-ui/react";
import "@fontsource-variable/comfortaa";

interface OperacionSelectCardProps {
    titulo: string;
    descripcion: string;
    icono: IconType;
    onClick?: () => void;
}

export default function OperacionSelectCard({
    titulo,
    descripcion,
    icono,
    onClick,
}: OperacionSelectCardProps) {
    const bg = useColorModeValue("blue.50", "gray.800");
    const circleBg = useColorModeValue("purple.500", "purple.400");
    const textColor = useColorModeValue("gray.600", "gray.400");

    return (
        <Card.Root
            bg={bg}
            borderRadius="xl"
            boxShadow="md"
            _hover={{ boxShadow: "lg", transform: "translateY(-4px)" }}
            transition="all 0.2s ease"
            cursor="pointer"
            onClick={onClick}
        >
            <Card.Body>
                <VStack gap={4} align="start">
                    <Circle size="48px" bg={circleBg} color="white">
                        <Icon as={icono} boxSize={"2em"} />
                    </Circle>

                    <Heading size="md" fontFamily="Comfortaa Variable">
                        {titulo}
                    </Heading>

                    <Text fontSize="sm" color={textColor} fontFamily="Comfortaa Variable">
                        {descripcion}
                    </Text>
                </VStack>
            </Card.Body>
        </Card.Root>
    );
}
