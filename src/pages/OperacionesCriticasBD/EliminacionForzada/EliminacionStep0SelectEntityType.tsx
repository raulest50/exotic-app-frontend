import {
    Badge,
    Box,
    Button,
    Drawer,
    DrawerBody,
    DrawerContent,
    DrawerHeader,
    DrawerOverlay,
    Heading,
    HStack,
    Icon,
    List,
    ListItem,
    Text,
    useDisclosure,
    VStack,
} from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";
import { MdWarningAmber } from "react-icons/md";
import EndPointsURL from "../../../api/EndPointsURL";
import type { TipoEntidadEliminacion } from "./EliminacionForzada.tsx";

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
    const { isOpen, onOpen, onClose } = useDisclosure();
    const env = EndPointsURL.getEnvironment();
    const envBadgeLabel = env === "staging" ? "ENTORNO DE PRUEBAS" : "LOCAL DEV";

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
            <VStack align="stretch" spacing={4}>
                <Heading size="md">Seleccione el tipo de entidad a eliminar</Heading>
                <Text color="gray.600">
                    Elija el tipo de registro sobre el cual desea realizar una eliminacion forzada.
                    En el siguiente paso podra seleccionar el registro concreto o confirmar una
                    operacion masiva, segun el tipo elegido.
                </Text>
                <Button
                    leftIcon={<AddIcon />}
                    colorScheme="teal"
                    onClick={onOpen}
                    alignSelf="flex-start"
                >
                    Siguiente
                </Button>
            </VStack>

            <Drawer placement="right" onClose={onClose} isOpen={isOpen} size="sm">
                <DrawerOverlay />
                <DrawerContent>
                    <DrawerHeader borderBottomWidth="1px">Tipo de entidad</DrawerHeader>
                    <DrawerBody>
                        <List spacing={2}>
                            {visibleOptions.map((opt) => (
                                <ListItem
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
                                    borderColor={opt.tone === "danger" ? "red.200" : undefined}
                                    bg={opt.tone === "danger" ? "red.50" : undefined}
                                    _hover={
                                        opt.tone === "danger"
                                            ? { bg: "red.100", borderColor: "red.300" }
                                            : undefined
                                    }
                                    _active={
                                        opt.tone === "danger"
                                            ? { bg: "red.200", borderColor: "red.400" }
                                            : undefined
                                    }
                                >
                                    <HStack align="flex-start" spacing={3} w="full">
                                        <Icon
                                            as={opt.tone === "danger" ? MdWarningAmber : AddIcon}
                                            color={opt.tone === "danger" ? "orange.400" : "teal.500"}
                                            boxSize={5}
                                            mt={0.5}
                                            flexShrink={0}
                                        />
                                        <Box>
                                            <HStack spacing={2} mb={1} flexWrap="wrap">
                                                <Text
                                                    fontWeight="semibold"
                                                    color={opt.tone === "danger" ? "red.700" : undefined}
                                                >
                                                    {opt.label}
                                                </Text>
                                                {opt.tone === "danger" && (
                                                    <Badge colorScheme={env === "staging" ? "orange" : "blue"}>
                                                        {envBadgeLabel}
                                                    </Badge>
                                                )}
                                            </HStack>
                                            <Text
                                                fontSize="sm"
                                                color={opt.tone === "danger" ? "red.600" : "gray.600"}
                                            >
                                                {opt.description}
                                            </Text>
                                        </Box>
                                    </HStack>
                                </ListItem>
                            ))}
                        </List>
                    </DrawerBody>
                </DrawerContent>
            </Drawer>
        </Box>
    );
}
