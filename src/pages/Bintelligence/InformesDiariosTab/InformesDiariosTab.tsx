import { useEffect, useState, type ReactElement } from "react";
import {
    Box,
    Button,
    Card,
    CardBody,
    Flex,
    HStack,
    IconButton,
    Text,
    Tooltip,
    useDisclosure,
    VStack,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import axios from "axios";
import { FaShoppingCart } from "react-icons/fa";
import { GiBuyCard } from "react-icons/gi";
import { MdTune, MdWarehouse } from "react-icons/md";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import InformeDiarioAlmacenPanel from "./InformeDiarioAlmacenPanel.tsx";
import InformeDiarioAjustesAlmacenPanel from "./InformeDiarioAjustesAlmacenPanel.tsx";

type InformeDiarioKey = "almacen" | "ajustes" | "compras" | "ventas";

const REPORT_OPTIONS: { key: InformeDiarioKey; label: string; icon: ReactElement }[] = [
    { key: "almacen", label: "Informe diario de almacén", icon: <MdWarehouse size={20} /> },
    { key: "ajustes", label: "Ajustes almacén", icon: <MdTune size={20} /> },
    { key: "compras", label: "Informe diario de compras", icon: <GiBuyCard size={20} /> },
    { key: "ventas", label: "Informe diario de ventas", icon: <FaShoppingCart size={18} /> },
];

function InformePlaceholder({ title }: { title: string }) {
    return (
        <Card variant="outline">
            <CardBody>
                <Text fontWeight="medium">{title}</Text>
                <Text fontSize="sm" color="gray.600" mt={2}>
                    Contenido del informe (pendiente de implementar).
                </Text>
            </CardBody>
        </Card>
    );
}

export default function InformesDiariosTab() {
    const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true });
    const [selectedReport, setSelectedReport] = useState<InformeDiarioKey>("almacen");
    const [apiReachable, setApiReachable] = useState<boolean | null>(null);

    useEffect(() => {
        let cancelled = false;
        const url = new EndPointsURL().informes_diarios_ping;
        axios
            .get(url)
            .then(() => {
                if (!cancelled) setApiReachable(true);
            })
            .catch(() => {
                if (!cancelled) setApiReachable(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const mainTitle = REPORT_OPTIONS.find((r) => r.key === selectedReport)?.label ?? "";

    return (
        <Flex w="full" minH="60vh" align="stretch" gap={0}>
            <VStack
                align="stretch"
                spacing={0}
                bg="white"
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="md"
                overflow="hidden"
                w={isOpen ? "280px" : "52px"}
                minW={isOpen ? "280px" : "52px"}
                transition="width 0.2s ease, min-width 0.2s ease"
                flexShrink={0}
            >
                <HStack
                    px={isOpen ? 3 : 1}
                    py={2}
                    borderBottomWidth="1px"
                    borderColor="gray.200"
                    justify={isOpen ? "space-between" : "center"}
                    spacing={2}
                >
                    {isOpen && (
                        <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
                            Informes diarios
                        </Text>
                    )}
                    <IconButton
                        aria-label={isOpen ? "Colapsar menú" : "Expandir menú"}
                        icon={isOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                        size="sm"
                        variant="ghost"
                        onClick={onToggle}
                    />
                </HStack>

                <VStack align="stretch" spacing={1} p={2} flex={1}>
                    {REPORT_OPTIONS.map((opt) =>
                        isOpen ? (
                            <Button
                                key={opt.key}
                                variant="ghost"
                                justifyContent="flex-start"
                                leftIcon={opt.icon}
                                fontWeight={selectedReport === opt.key ? "semibold" : "normal"}
                                bg={selectedReport === opt.key ? "blue.50" : undefined}
                                color={selectedReport === opt.key ? "blue.700" : undefined}
                                onClick={() => setSelectedReport(opt.key)}
                            >
                                {opt.label}
                            </Button>
                        ) : (
                            <Tooltip key={opt.key} label={opt.label} placement="right" hasArrow>
                                <IconButton
                                    aria-label={opt.label}
                                    icon={opt.icon}
                                    size="sm"
                                    variant={selectedReport === opt.key ? "solid" : "ghost"}
                                    colorScheme={selectedReport === opt.key ? "blue" : undefined}
                                    onClick={() => setSelectedReport(opt.key)}
                                />
                            </Tooltip>
                        ),
                    )}
                </VStack>
            </VStack>

            <Box flex="1" pl={4} overflow="auto">
                {apiReachable === true && (
                    <Text fontSize="xs" color="green.600" mb={2}>
                        Conexión con el servicio de informes diarios activa.
                    </Text>
                )}
                {apiReachable === false && (
                    <Text fontSize="xs" color="gray.500" mb={2}>
                        No se pudo contactar el servicio de informes diarios (normal si el backend no está en marcha).
                    </Text>
                )}
                {selectedReport === "almacen" ? (
                    <InformeDiarioAlmacenPanel />
                ) : selectedReport === "ajustes" ? (
                    <InformeDiarioAjustesAlmacenPanel />
                ) : (
                    <InformePlaceholder title={mainTitle} />
                )}
            </Box>
        </Flex>
    );
}
