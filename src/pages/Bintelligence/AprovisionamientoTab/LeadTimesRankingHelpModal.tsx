import {
    Box,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
} from "@chakra-ui/react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

const rankingHelpItems = [
    {
        field: "Proveedor ID",
        meaning: "Identificador del proveedor dentro del sistema.",
        importance: "Permite reconocer con precision a quien pertenece cada historico y comparar proveedores sin ambiguedad.",
    },
    {
        field: "Proveedor",
        meaning: "Nombre comercial o razon social del proveedor.",
        importance: "Facilita interpretar el ranking en lenguaje de negocio y no solo con codigos internos.",
    },
    {
        field: "Lead time 1ra recepcion",
        meaning: "Tiempo historico estimado hasta la primera recepcion util del material para ese proveedor.",
        importance: "Ayuda a saber que tan rapido empieza a llegar material cuando se emite una orden.",
    },
    {
        field: "Lead time recepcion completa",
        meaning: "Tiempo historico estimado hasta completar la recepcion del material pedido.",
        importance: "Sirve para entender no solo la rapidez inicial sino tambien la capacidad de completar entregas.",
    },
    {
        field: "Confianza 1ra recepcion",
        meaning: "Puntaje de confiabilidad del calculo de primera recepcion.",
        importance: "Ayuda a distinguir entre un valor bien soportado por historico y uno basado en muy pocos datos o con alta variabilidad.",
    },
    {
        field: "Confianza recepcion completa",
        meaning: "Puntaje de confiabilidad del calculo de recepcion completa.",
        importance: "Permite juzgar si el tiempo de entrega completa es consistente o si conviene tomarlo con cautela.",
    },
    {
        field: "Observaciones 1ra recepcion",
        meaning: "Cantidad de casos historicos validos usados para medir la primera recepcion.",
        importance: "Entre mas observaciones validas existan, mas representativo suele ser el indicador.",
    },
    {
        field: "Observaciones recepcion completa",
        meaning: "Cantidad de casos historicos validos usados para medir la recepcion completa.",
        importance: "Muestra que tanto respaldo real tiene el comportamiento de entregas completas del proveedor.",
    },
    {
        field: "Ordenes consideradas",
        meaning: "Numero total de ordenes revisadas dentro de la ventana de analisis.",
        importance: "Da contexto sobre la cobertura del analisis y ayuda a entender por que algunos calculos tienen menor confianza.",
    },
    {
        field: "Lead time ajustado",
        meaning: "Valor usado para ordenar el ranking, combinando rapidez observada y confiabilidad del dato.",
        importance: "Evita favorecer automaticamente a un proveedor con un tiempo muy bajo pero poco confiable o con muy poco historico.",
    },
];

export default function LeadTimesRankingHelpModal({ isOpen, onClose }: Props) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Ayuda del ranking de lead times</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <Text color="gray.600" mb={4}>
                        Este ranking compara el desempeno historico de los proveedores para un material especifico.
                        Cada columna aporta contexto para evaluar rapidez, consistencia y calidad del historico disponible.
                    </Text>

                    <Box overflowX="auto">
                        <Table size="sm" variant="simple">
                            <Thead>
                                <Tr>
                                    <Th>Campo</Th>
                                    <Th>Que significa</Th>
                                    <Th>Por que importa</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {rankingHelpItems.map((item) => (
                                    <Tr key={item.field}>
                                        <Td fontWeight="semibold">{item.field}</Td>
                                        <Td>{item.meaning}</Td>
                                        <Td>{item.importance}</Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    </Box>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}
