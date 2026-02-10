import {
    Card,
    CardBody,
    CardHeader,
    Flex,
    Heading,
    Icon,
    SimpleGrid,
    Text,
} from "@chakra-ui/react";
import { FaPlus, FaListUl, FaCogs } from "react-icons/fa";
import { AiFillProduct } from "react-icons/ai";
import { LiaProjectDiagramSolid } from "react-icons/lia";

export type TipoCargaTerminado = "sin_insumos" | "solo_insumos" | "con_proceso_completo";

interface Step0SelectTipoCargaProps {
    onSelect: (tipo: TipoCargaTerminado) => void;
}

export default function Step0SelectTipoCarga({ onSelect }: Step0SelectTipoCargaProps) {
    return (
        <Flex direction="column" gap={10} w="full">
            <Heading as="h2" size="lg" textAlign="center" mb={6} fontFamily="Arimo">
                Seleccione el tipo de carga masiva
            </Heading>

            <SimpleGrid columns={3} spacing={8} w="full">
                <Card
                    h="250px"
                    cursor="pointer"
                    bg="teal.100"
                    _hover={{
                        bg: "teal.300",
                        transform: "translateY(-5px)",
                        boxShadow: "xl",
                    }}
                    _active={{ bg: "teal.800", color: "white" }}
                    transition="all 0.3s ease"
                    onClick={() => onSelect("sin_insumos")}
                >
                    <CardHeader borderBottom="0.1em solid" p={4}>
                        <Heading as="h3" size="md" fontFamily="Comfortaa Variable">
                            Terminado sin insumos
                        </Heading>
                    </CardHeader>
                    <CardBody display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={6}>
                        <Icon as={AiFillProduct} boxSize="5em" mb={4} />
                        <Text textAlign="center">Registrar terminados solo con datos básicos (sin receta ni proceso)</Text>
                    </CardBody>
                </Card>

                <Card
                    h="250px"
                    cursor="pointer"
                    bg="blue.100"
                    _hover={{
                        bg: "blue.300",
                        transform: "translateY(-5px)",
                        boxShadow: "xl",
                    }}
                    _active={{ bg: "blue.800", color: "white" }}
                    transition="all 0.3s ease"
                    onClick={() => onSelect("solo_insumos")}
                >
                    <CardHeader borderBottom="0.1em solid" p={4}>
                        <Heading as="h3" size="md" fontFamily="Comfortaa Variable">
                            Terminado solo con insumos
                        </Heading>
                    </CardHeader>
                    <CardBody display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={6}>
                        <Flex gap={3} mb={4} alignItems="center">
                            <Icon as={AiFillProduct} boxSize="3.5em" />
                            <Icon as={FaPlus} boxSize="2em" />
                            <Icon as={FaListUl} boxSize="3.5em" />
                        </Flex>
                        <Text textAlign="center">Carga masiva con lista de insumos (próximamente)</Text>
                    </CardBody>
                </Card>

                <Card
                    h="250px"
                    cursor="pointer"
                    bg="purple.100"
                    _hover={{
                        bg: "purple.300",
                        transform: "translateY(-5px)",
                        boxShadow: "xl",
                    }}
                    _active={{ bg: "purple.800", color: "white" }}
                    transition="all 0.3s ease"
                    onClick={() => onSelect("con_proceso_completo")}
                >
                    <CardHeader borderBottom="0.1em solid" p={4}>
                        <Heading as="h3" size="md" fontFamily="Comfortaa Variable">
                            Terminado con proceso completo
                        </Heading>
                    </CardHeader>
                    <CardBody display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={6}>
                        <Flex gap={3} mb={4} alignItems="center">
                            <Icon as={AiFillProduct} boxSize="3.5em" />
                            <Icon as={FaPlus} boxSize="2em" />
                            <Icon as={FaListUl} boxSize="3.5em" />
                            <Icon as={FaPlus} boxSize="2em" />
                            <Icon as={LiaProjectDiagramSolid} boxSize="3.5em" />
                        </Flex>
                        <Text textAlign="center">Carga masiva con proceso de producción (próximamente)</Text>
                    </CardBody>
                </Card>
            </SimpleGrid>
        </Flex>
    );
}
