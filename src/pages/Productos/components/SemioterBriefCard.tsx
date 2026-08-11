import { Steps, Card, Flex, Heading, Text, VStack, Separator } from "@chakra-ui/react";
import {ProductoSemiter, TIPOS_PRODUCTOS} from "../types.tsx";

interface props{
    semioter: ProductoSemiter;
}

export default function SemioterBriefCard({semioter}:props) {

    const calculateNoOfLines = (text:string, maxCharsPerLine = 5) => {
        if (!text) return 1; // Fallback for empty text
        return Math.ceil(text.length / maxCharsPerLine);
    };

    return (
        <Card.Root w={'full'}>
            <Card.Header>
                <VStack>
                    <Heading size="md">
                        Nombre: {semioter.nombre}
                    </Heading>
                    <Heading pt="2" fontSize="sm">
                        Tipo Producto: {semioter.tipo_producto === TIPOS_PRODUCTOS.terminado ? "Terminado" : "Semiterminado"}
                    </Heading>
                </VStack>
            </Card.Header>
            <Separator color={"gray.400"} />
            <Card.Body>
                <Flex direction={"row"} gap={10}>
                    <VStack alignItems="start">
                        <Text pt="2" fontSize="sm">
                            Unidades: {semioter.tipoUnidades}
                        </Text>
                        <Text pt="2" fontSize="sm">
                            Contenido por envase: {semioter.cantidadUnidad}
                        </Text>
                    </VStack>

                    <VStack alignItems="start">
                        <Text pt="2" fontSize="sm">
                            Codigo: {semioter.productoId}
                        </Text>
                        <Text pt="2" fontSize="sm" lineClamp={calculateNoOfLines(semioter.observaciones as string)}>
                            Observaciones: {semioter.observaciones}
                        </Text>
                    </VStack>

                </Flex>
            </Card.Body>
        </Card.Root>
    );
}