import {
    Badge,
    Box,
    Button,
    Drawer,
    Heading,
    HStack,
    Icon,
    List,
    Text,
    useDisclosure,
    VStack,
    Portal,
} from "@chakra-ui/react";
import { useColorModeValue } from "../../../components/ui/color-mode";
import { MdWarningAmber } from "react-icons/md";
import EndPointsURL from "../../../api/EndPointsURL";
import type { TipoEntidadEliminacion } from "./EliminacionForzada.tsx";
import { LuPlus } from 'react-icons/lu';

interface EliminacionOCMStep0SelectEntityTypeProps {
    setActiveStep: (step: number) => void;
    setTipoEntidad: (tipo: TipoEntidadEliminacion) => void;
}

type NonProductionEnvironment = "local" | "staging";

type SelectorOption = {
    id: TipoEntidadEliminacion;
    label: string;
    description: string;
    visibleEnvs?: NonProductionEnvironment[];
    tone?: "default" | "danger";
};

const ENTITY_OPTIONS: SelectorOption[] = [
    {
        id: "ORDEN_COMPRA",
        label: "Orden de compra",
        description: "Eliminacion forzada de Orden de Compra de Materiales (OCM).",
    },
    {
        id: "ORDEN_PRODUCCION",
        label: "Orden de produccion",
        description: "Eliminacion forzada de Orden de Produccion (solo si no tiene transacciones de almacen).",
    },
    {
        id: "MATERIAL",
        label: "Material",
        description: "Eliminacion forzada de un material, quitando referencias hijas y preservando padres mixtos.",
    },
    {
        id: "PURGA_COMPLETA_TERMINADOS",
        label: "Purga Completa Terminados",
        description: "Elimina todos los terminados y sus datos relacionados. Solo disponible en local y staging.",
    },
    {
        id: "PURGA_TOTAL_BASE_DATOS",
        label: "Borrado Total Base de Datos",
        description:
            "Vacia todas las tablas de la base de datos preservando solo lo minimo de master y super_master. Es una operacion extremadamente delicada.",
        visibleEnvs: ["local", "staging"],
        tone: "danger",
    },
];

export default function EliminacionStep0SelectEntityType({
    setActiveStep,
    setTipoEntidad,
}: EliminacionOCMStep0SelectEntityTypeProps) {
    const { open, onOpen, onClose } = useDisclosure();
    const env = EndPointsURL.getEnvironment();
    const envBadgeLabel = env === "staging" ? "ENTORNO DE PRUEBAS" : "LOCAL DEV";
    const dangerBg = useColorModeValue("red.50", "red.900");
    const dangerHoverBg = useColorModeValue("red.100", "red.800");
    const dangerActiveBg = useColorModeValue("red.200", "red.700");
    const dangerBorder = useColorModeValue("red.200", "red.700");
    const dangerHoverBorder = useColorModeValue("red.300", "red.600");
    const dangerActiveBorder = useColorModeValue("red.400", "red.500");
    const dangerTitleColor = useColorModeValue("red.700", "red.200");
    const dangerTextColor = useColorModeValue("red.600", "red.200");

    const visibleOptions = ENTITY_OPTIONS.filter((opt) => {
        if (opt.visibleEnvs) {
            return env !== "production" && opt.visibleEnvs.includes(env);
        }
        return true;
    });

    const handleSelect = (option: SelectorOption) => {
        setTipoEntidad(option.id);
        onClose();
        setActiveStep(1);
    };

    return (
        <Box>
            <VStack align="stretch" gap={4}>
                <Heading size="md">Seleccione el tipo de entidad a eliminar</Heading>
                <Text color="app.textMuted">
                    Elija el tipo de registro sobre el cual desea realizar una eliminacion forzada.
                    En el siguiente paso podra seleccionar el registro concreto o confirmar una
                    operacion masiva, segun el tipo elegido.
                </Text>
                <Button colorPalette="teal" onClick={onOpen} alignSelf="flex-start"><LuPlus />Siguiente
                                    </Button>
            </VStack>

            <Drawer.Root placement='end' open={isOpen} size='sm' onOpenChange={e => {
                if (!e.open) {
                    onClose();
                }
            }}>
                <Portal>

                    <Drawer.Backdrop />
                    <Drawer.Positioner>
                        <Drawer.Content>
                            <Drawer.Header borderBottomWidth="1px">Tipo de entidad</Drawer.Header>
                            <Drawer.Body>
                                <List.Root gap={2}>
                                    {visibleOptions.map((opt) => (
                                        <List.Item
                                            key={opt.id}
                                            as={Button}
                                            variant={opt.tone === "danger" ? "outline" : "ghost"}
                                            justifyContent="flex-start"
                                            h="auto"
                                            py={3}
                                            px={2}
                                            onClick={() => handleSelect(opt)}
                                            textAlign="left"
                                            whiteSpace="normal"
                                            borderColor={opt.tone === "danger" ? dangerBorder : undefined}
                                            bg={opt.tone === "danger" ? dangerBg : undefined}
                                            _hover={
                                                opt.tone === "danger"
                                                    ? { bg: dangerHoverBg, borderColor: dangerHoverBorder }
                                                    : undefined
                                            }
                                            _active={
                                                opt.tone === "danger"
                                                    ? { bg: dangerActiveBg, borderColor: dangerActiveBorder }
                                                    : undefined
                                            }
                                        >
                                            <HStack align="flex-start" gap={3} w="full">
                                                <Icon
                                                    as={opt.tone === "danger" ? MdWarningAmber : AddIcon}
                                                    color={opt.tone === "danger" ? "orange.400" : "teal.500"}
                                                    boxSize={5}
                                                    mt={0.5}
                                                    flexShrink={0}
                                                />
                                                <Box>
                                                    <HStack gap={2} mb={1} flexWrap="wrap">
                                                        <Text
                                                            fontWeight="semibold"
                                                            color={opt.tone === "danger" ? dangerTitleColor : undefined}
                                                        >
                                                            {opt.label}
                                                        </Text>
                                                        {opt.tone === "danger" && (
                                                            <Badge colorPalette={env === "staging" ? "orange" : "blue"}>
                                                                {envBadgeLabel}
                                                            </Badge>
                                                        )}
                                                    </HStack>
                                                    <Text
                                                        fontSize="sm"
                                                        color={opt.tone === "danger" ? dangerTextColor : "app.textMuted"}
                                                    >
                                                        {opt.description}
                                                    </Text>
                                                </Box>
                                            </HStack>
                                        </List.Item>
                                    ))}
                                </List.Root>
                            </Drawer.Body>
                        </Drawer.Content>
                    </Drawer.Positioner>

                </Portal>
            </Drawer.Root>
        </Box>
    );
}
