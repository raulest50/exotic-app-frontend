import React from "react";
import { useColorModeValue } from "../../../../../components/ui/color-mode";
import { Box, Text, Flex, HStack, VStack, Tag, Icon, IconButton, Badge } from "@chakra-ui/react";
import { Tooltip } from '@/components/ui/tooltip';
import { Insumo } from "../../../types.tsx";

// Icons
import { FiMinus } from "react-icons/fi";

// Shared helpers
import { metaPorTipo } from "./meta";
import CustomDecimalInput from "../../../../../components/CustomDecimalInput/CustomDecimalInput.tsx";

interface ItemBandejaSeleccionProps {
    insumo: Insumo;
    onUpdateCantidad: (productoId: string, newCantidad: number) => void;
    onRemoveInsumo: (productoId: string) => void;
}

const ItemBandejaSeleccion: React.FC<ItemBandejaSeleccionProps> = ({
                                                                       insumo,
                                                                       onUpdateCantidad,
                                                                       onRemoveInsumo,
                                                                   }) => {
    const { producto } = insumo;
    const meta = metaPorTipo(producto.tipo_producto);

    const cardBg  = useColorModeValue("white", "gray.800");
    const muted   = useColorModeValue("gray.600", "gray.300");
    const borderC = useColorModeValue("blackAlpha.200", "whiteAlpha.200");

    const costoFmt =
        typeof producto.costo === "number"
            ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(producto.costo)
            : producto.costo;

    return (
        <Box
            key={producto.productoId}
            w="full"
            bg={cardBg}
            borderWidth="1px"
            borderColor={borderC}
            borderRadius="xl"
            boxShadow="sm"
            overflow="hidden"
            position="relative"
            role="group"
            transition="all 0.18s ease"
            _hover={{ boxShadow: "lg", transform: "translateY(-2px)" }}
        >
            {/* Acento vertical */}
            <Box position="absolute" left={0} top={0} bottom={0} w="6px" bg={meta.accentColor} />

            <Flex align="center" gap={4} px={4} py={3}>
                {/* Icono por tipo */}
                <Box
                    bg={meta.accentColor}
                    borderWidth="1px"
                    borderColor={meta.accentColor}
                    color="white"
                    rounded="lg"
                    p={2.5}
                    minW="42px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    _groupHover={{ bg: meta.accentColor }}
                >
                    <Icon boxSize={5} asChild><meta.icon /></Icon>
                </Box>

                {/* Texto */}
                <VStack align="start" gap={0} flex="1" minW={0}>
                    <HStack gap={2} w="100%">
                        <Text fontWeight="semibold" lineClamp={1} fontSize="md">
                            {producto.nombre}
                        </Text>
                        <Tag.Root size="sm" colorPalette={meta.scheme} variant="subtle">
                            {meta.label}
                        </Tag.Root>
                    </HStack>

                    <HStack gap={3} mt={1} flexWrap="wrap">
                        <Badge variant="subtle" colorPalette="gray">ID: {producto.productoId}</Badge>
                        <Text fontSize="sm" color={muted}>{costoFmt}</Text>
                        <Text fontSize="sm" color={muted}>
                            {producto.tipoUnidades} · {producto.cantidadUnidad}
                        </Text>
                    </HStack>
                </VStack>

                {/* Cantidad */}
                <HStack align="center" gap={2}>
                    <Tooltip content="Cantidad requerida" showArrow>
                        <CustomDecimalInput
                            value={insumo.cantidadRequerida}
                            onChange={(newCantidad) =>
                                onUpdateCantidad(producto.productoId, newCantidad)
                            }
                            min={0}
                            size="sm"
                            placeholder="0.0000"
                            w="88px"
                        />
                    </Tooltip>

                    {/* Quitar */}
                    <Tooltip content="Remover" showArrow>
                        <IconButton
                            aria-label="Remover"
                            colorPalette="red"
                            variant="solid"
                            size="sm"
                            borderRadius="full"
                            onClick={() =>
                                onRemoveInsumo(producto.productoId)
                            }
                            _active={{ transform: "scale(0.96)" }}><FiMinus /></IconButton>
                    </Tooltip>
                </HStack>
            </Flex>
        </Box>
    );
};

export default ItemBandejaSeleccion;
