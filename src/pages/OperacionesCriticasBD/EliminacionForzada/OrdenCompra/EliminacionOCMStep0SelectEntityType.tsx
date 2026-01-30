import {
    Box,
    Button,
    Drawer,
    DrawerBody,
    DrawerContent,
    DrawerHeader,
    DrawerOverlay,
    Heading,
    List,
    ListIcon,
    ListItem,
    Text,
    useDisclosure,
    VStack,
} from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";
import type { TipoEntidadEliminacion } from "../EliminacionForzada";

interface EliminacionOCMStep0SelectEntityTypeProps {
    setActiveStep: (step: number) => void;
    setTipoEntidad: (tipo: TipoEntidadEliminacion) => void;
}

const ENTITY_OPTIONS: { id: TipoEntidadEliminacion; label: string; description: string }[] = [
    { id: "ORDEN_COMPRA", label: "Orden de compra", description: "Eliminación forzada de Orden de Compra de Materiales (OCM)" },
];

export default function EliminacionOCMStep0SelectEntityType({
    setActiveStep,
    setTipoEntidad,
}: EliminacionOCMStep0SelectEntityTypeProps) {
    const { isOpen, onOpen, onClose } = useDisclosure();

    const handleSelect = (tipo: TipoEntidadEliminacion) => {
        setTipoEntidad(tipo);
        onClose();
        setActiveStep(1);
    };

    return (
        <Box>
            <VStack align="stretch" spacing={4}>
                <Heading size="md">Seleccione el tipo de entidad a eliminar</Heading>
                <Text color="gray.600">
                    Elija el tipo de registro sobre el cual desea realizar una eliminación forzada.
                    En el siguiente paso podrá seleccionar el registro concreto y estudiar las dependencias.
                </Text>
                <Button
                    leftIcon={<AddIcon />}
                    colorScheme="teal"
                    onClick={onOpen}
                    alignSelf="flex-start"
                >
                    Seleccionar tipo de entidad
                </Button>
            </VStack>

            <Drawer placement="right" onClose={onClose} isOpen={isOpen} size="sm">
                <DrawerOverlay />
                <DrawerContent>
                    <DrawerHeader borderBottomWidth="1px">Tipo de entidad</DrawerHeader>
                    <DrawerBody>
                        <List spacing={2}>
                            {ENTITY_OPTIONS.map((opt) => (
                                <ListItem
                                    key={opt.id}
                                    as={Button}
                                    variant="ghost"
                                    justifyContent="flex-start"
                                    h="auto"
                                    py={3}
                                    px={2}
                                    onClick={() => handleSelect(opt.id)}
                                    textAlign="left"
                                >
                                    <ListIcon as={AddIcon} color="teal.500" />
                                    <Box>
                                        <Text fontWeight="semibold">{opt.label}</Text>
                                        <Text fontSize="sm" color="gray.600">{opt.description}</Text>
                                    </Box>
                                </ListItem>
                            ))}
                        </List>
                    </DrawerBody>
                </DrawerContent>
            </Drawer>
        </Box>
    );
}
