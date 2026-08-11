import React from "react";
import { useColorModeValue } from "../../../../../components/ui/color-mode";
import { Steps, Box, Text, Flex, HStack, VStack, Tag, Icon, IconButton, Badge } from "@chakra-ui/react";
import { Tooltip } from '@/components/ui/tooltip';
import { Producto } from "../../../types.tsx";

// Icons
import { FiPlus } from "react-icons/fi";

// Shared helpers
import { metaPorTipo } from "./meta";

interface ItemBandejaBusquedaProps {
    producto: Producto;
    onAddInsumo: (producto: Producto) => void;
}

const ItemBandejaBusqueda: React.FC<ItemBandejaBusquedaProps> = ({
                                                                     producto,
                                                                     onAddInsumo,
                                                                 }) => {
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

                {/* Acción agregar */}
                <Tooltip content="Agregar" showArrow>
                    <IconButton
                        aria-label="Agregar"
                        colorPalette={meta.scheme}
                        variant="solid"
                        size="sm"
                        borderRadius="full"
                        onClick={() => onAddInsumo(producto)}
                        _active={{ transform: "scale(0.96)" }}><FiPlus /></IconButton>
                </Tooltip>
            </Flex>
        </Box>
    );
};

export default ItemBandejaBusqueda;
