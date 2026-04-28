import {
    Box,
    Heading,
    ListItem,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Stack,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    UnorderedList,
} from "@chakra-ui/react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

const detailHelpItems = [
    {
        field: "Primera recepcion",
        meaning: "Mide cuando empezo a llegar material util despues de emitir la orden.",
        importance: "Es clave para entender cuando el abastecimiento empieza a aliviar el riesgo de ruptura.",
    },
    {
        field: "Recepcion completa",
        meaning: "Mide cuando se completo la entrega del material pedido en la orden.",
        importance: "Ayuda a evaluar la capacidad del proveedor para cerrar entregas sin dejar faltantes pendientes.",
    },
    {
        field: "Lead time representativo",
        meaning: "Es el valor principal resumido del indicador, calculado a partir del historico valido.",
        importance: "Es la mejor referencia operativa para comparar proveedores o alimentar decisiones de abastecimiento.",
    },
    {
        field: "Confianza",
        meaning: "Puntaje que resume que tan solido es el calculo segun cobertura, tamano de muestra y variabilidad.",
        importance: "Evita tomar decisiones fuertes basadas en datos escasos o muy inestables.",
    },
    {
        field: "Promedio",
        meaning: "Media aritmetica de los lead times observados.",
        importance: "Da una referencia general del comportamiento historico, aunque puede ser sensible a valores extremos.",
    },
    {
        field: "Mediana",
        meaning: "Valor central del historico ordenado.",
        importance: "Suele representar mejor el comportamiento tipico cuando hay dispersion o casos atipicos.",
    },
    {
        field: "Minimo",
        meaning: "Menor lead time observado en el historico valido.",
        importance: "Muestra el mejor escenario real alcanzado, util como referencia pero no como expectativa unica.",
    },
    {
        field: "Maximo",
        meaning: "Mayor lead time observado en el historico valido.",
        importance: "Hace visible el peor escenario real y ayuda a identificar riesgo de demoras fuertes.",
    },
    {
        field: "Desviacion estandar",
        meaning: "Mide que tanto se dispersan los lead times alrededor de su valor central.",
        importance: "Entre mas alta sea, menos estable es el comportamiento del proveedor para ese material.",
    },
    {
        field: "Observaciones validas",
        meaning: "Cantidad de casos historicos que si pudieron usarse en el calculo.",
        importance: "Permite saber cuanto respaldo real tiene el indicador y por que la confianza puede subir o bajar.",
    },
    {
        field: "Ordenes consideradas",
        meaning: "Numero total de ordenes revisadas dentro de la ventana, incluyan o no una observacion valida.",
        importance: "Da contexto sobre cobertura del analisis y posibles huecos entre ordenes emitidas y recepciones registradas.",
    },
    {
        field: "Ultima recepcion observada",
        meaning: "Fecha y hora de la recepcion mas reciente usada en el historico.",
        importance: "Ayuda a juzgar si el analisis esta respaldado por informacion relativamente reciente.",
    },
    {
        field: "Motivo",
        meaning: "Explicacion del sistema cuando el indicador no pudo calcularse.",
        importance: "Permite diferenciar entre falta de datos, ausencia de movimientos o historico insuficiente.",
    },
];

export default function LeadTimeDetailHelpModal({ isOpen, onClose }: Props) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Ayuda del detalle de lead time</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <Stack spacing={4}>
                        <Text color="gray.600">
                            El detalle muestra dos perspectivas complementarias del mismo proveedor-material:
                            la rapidez con la que empieza a llegar material y el tiempo que toma completar la entrega.
                        </Text>

                        <Box>
                            <Heading size="sm" mb={2}>Como interpretar las metricas principales</Heading>
                            <UnorderedList spacing={2} pl={5}>
                                <ListItem>
                                    <b>Lead time representativo</b>: es el valor principal que el sistema propone para analizar
                                    ese proveedor-material. Busca resumir el comportamiento mas util del historico disponible.
                                </ListItem>
                                <ListItem>
                                    <b>Promedio</b>: es la media aritmetica de todos los casos observados. Sirve como referencia
                                    general, pero puede moverse mucho si hubo casos atipicos o demoras extremas.
                                </ListItem>
                                <ListItem>
                                    <b>Mediana</b>: es el valor central del historico ordenado. Suele mostrar mejor el comportamiento
                                    tipico cuando los datos tienen dispersion o valores extremos.
                                </ListItem>
                                <ListItem>
                                    <b>En esta vista</b>, el lead time representativo puede coincidir con promedio o mediana en algunos
                                    casos, especialmente cuando hay pocas observaciones o cuando todos los casos son muy parecidos.
                                </ListItem>
                                <ListItem>
                                    <b>Confianza</b> no mide rapidez: mide que tan confiable es el calculo segun el historico disponible.
                                    Por eso un lead time bajo no siempre significa que el dato sea fuerte.
                                </ListItem>
                                <ListItem>
                                    <b>Observaciones validas</b> muestra cuantos casos reales soportan el calculo, mientras que
                                    <b> ordenes consideradas</b> da el contexto total revisado dentro de la ventana.
                                </ListItem>
                            </UnorderedList>
                        </Box>

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
                                    {detailHelpItems.map((item) => (
                                        <Tr key={item.field}>
                                            <Td fontWeight="semibold">{item.field}</Td>
                                            <Td>{item.meaning}</Td>
                                            <Td>{item.importance}</Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </Box>
                    </Stack>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}
