
import {IconType} from "react-icons";
import {Card, Text, CardBody, Circle, Heading, Icon, VStack, useColorModeValue} from "@chakra-ui/react";
import '@fontsource-variable/comfortaa';

interface EntidadExportSelectCardProps {
    titulo: string;
    descripcion: string;
    icono: IconType;
    onClick?: () => void;
}

/*
Este componente representa una entidad en Exportar Datos Tab de la cual
se desea generar un archivo de exportación de datos en excel.
*/
function EntidadExportSelectCard(
    {
    titulo,
    descripcion,
    icono,
    onClick,
    } : EntidadExportSelectCardProps) {


    const bg = useColorModeValue("blue.50", "gray.800");
    const circleBg = useColorModeValue("purple.500", "purple.400");
    const textColor = useColorModeValue("gray.600", "gray.400");

    return (
        <Card
            bg={bg}
            borderRadius="xl"
            boxShadow="md"
            _hover={{ boxShadow: "lg", transform: "translateY(-4px)" }}
            transition="all 0.2s ease"
            cursor="pointer"
            onClick={onClick}
        >
            <CardBody>
                <VStack spacing={4} align="start">
                    <Circle size="48px" bg={circleBg} color="white">
                        <Icon as={icono} boxSize={'2em'} />
                    </Circle>

                    <Heading size="md" fontFamily="Comfortaa Variable">{titulo}</Heading>

                    <Text fontSize="sm" color={textColor} fontFamily="Comfortaa Variable">
                        {descripcion}
                    </Text>
                </VStack>
            </CardBody>
        </Card>
    );
}

export default EntidadExportSelectCard;