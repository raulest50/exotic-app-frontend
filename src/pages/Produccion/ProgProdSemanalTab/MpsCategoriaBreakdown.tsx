import { useMemo } from "react";
import {
    Accordion,
    AccordionButton,
    AccordionIcon,
    AccordionItem,
    AccordionPanel,
    Badge,
    Box,
    Flex,
    SimpleGrid,
    Text,
    VStack,
} from "@chakra-ui/react";

export interface MpsCategoriaBreakdownEntry {
    productoId: string;
    productoNombre: string;
    categoriaNombre?: string | null;
    loteSize: number;
    unidades: number;
    dayIndex: number;
}

interface MpsCategoriaBreakdownProps {
    entries: MpsCategoriaBreakdownEntry[];
    dayLabels: string[];
}

interface ProductBreakdown {
    key: string;
    productoId: string;
    productoNombre: string;
    dayIndex: number;
    loteSize: number;
    unidades: number;
    lotes: number | null;
}

interface CategoryBreakdown {
    categoriaNombre: string;
    totalUnidades: number;
    totalLotes: number;
    invalidLoteEntries: number;
    uniqueProductoIds: Set<string>;
    products: ProductBreakdown[];
}

function formatNumber(value: number): string {
    return value.toLocaleString("es-CO", {
        minimumFractionDigits: value % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    });
}

function getCategoryName(entry: MpsCategoriaBreakdownEntry): string {
    const value = entry.categoriaNombre?.trim();
    return value ? value : "Sin categoria";
}

export default function MpsCategoriaBreakdown({
    entries,
    dayLabels,
}: MpsCategoriaBreakdownProps) {
    const categories = useMemo(() => {
        const grouped = new Map<string, CategoryBreakdown>();

        entries.forEach((entry) => {
            const categoriaNombre = getCategoryName(entry);
            const lotes = entry.loteSize > 0 ? entry.unidades / entry.loteSize : null;
            const category = grouped.get(categoriaNombre) ?? {
                categoriaNombre,
                totalUnidades: 0,
                totalLotes: 0,
                invalidLoteEntries: 0,
                uniqueProductoIds: new Set<string>(),
                products: [],
            };

            category.totalUnidades += Number.isFinite(entry.unidades) ? entry.unidades : 0;
            if (lotes !== null && Number.isFinite(lotes)) {
                category.totalLotes += lotes;
            } else {
                category.invalidLoteEntries += 1;
            }
            category.uniqueProductoIds.add(entry.productoId);
            category.products.push({
                key: `${entry.productoId}-${entry.dayIndex}`,
                productoId: entry.productoId,
                productoNombre: entry.productoNombre,
                dayIndex: entry.dayIndex,
                loteSize: entry.loteSize,
                unidades: entry.unidades,
                lotes,
            });

            grouped.set(categoriaNombre, category);
        });

        return Array.from(grouped.values()).sort((left, right) => (
            left.categoriaNombre.localeCompare(right.categoriaNombre)
        ));
    }, [entries]);

    return (
        <Box bg="white" borderWidth="1px" borderRadius="md" p={4} boxShadow="sm">
            <Flex justify="space-between" align="start" gap={3} wrap="wrap" mb={3}>
                <Box>
                    <Text fontWeight="bold">Desglose por categoria</Text>
                    <Text fontSize="sm" color="gray.600">
                        Resumen informativo de unidades y lotes programados.
                    </Text>
                </Box>
                <Badge colorScheme={entries.length > 0 ? "teal" : "gray"}>
                    {entries.length} entradas
                </Badge>
            </Flex>

            {categories.length === 0 ? (
                <Box p={4} bg="gray.50" borderRadius="md">
                    <Text fontSize="sm" color="gray.500">
                        Sin terminados programados para desglosar.
                    </Text>
                </Box>
            ) : (
                <Accordion allowMultiple>
                    {categories.map((category) => (
                        <AccordionItem key={category.categoriaNombre} borderColor="gray.200">
                            <AccordionButton px={0} py={3}>
                                <Flex flex="1" justify="space-between" align="center" gap={3} wrap="wrap">
                                    <Box textAlign="left">
                                        <Text fontWeight="semibold">{category.categoriaNombre}</Text>
                                        <Text fontSize="xs" color="gray.500">
                                            {category.uniqueProductoIds.size} terminados | {category.products.length} entradas
                                        </Text>
                                    </Box>
                                    <Flex gap={2} wrap="wrap">
                                        <Badge colorScheme="purple">{formatNumber(category.totalUnidades)} unidades</Badge>
                                        <Badge colorScheme={category.invalidLoteEntries > 0 ? "orange" : "green"}>
                                            {formatNumber(category.totalLotes)} lotes
                                        </Badge>
                                        {category.invalidLoteEntries > 0 && (
                                            <Badge colorScheme="orange">{category.invalidLoteEntries} sin lote valido</Badge>
                                        )}
                                    </Flex>
                                </Flex>
                                <AccordionIcon />
                            </AccordionButton>
                            <AccordionPanel px={0} pt={0} pb={3}>
                                <VStack align="stretch" spacing={2}>
                                    {category.products
                                        .sort((left, right) => (
                                            left.dayIndex - right.dayIndex
                                            || left.productoNombre.localeCompare(right.productoNombre)
                                        ))
                                        .map((product) => (
                                            <Box key={product.key} borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3}>
                                                <SimpleGrid columns={[1, 1, 2, 4]} spacing={3}>
                                                    <Box>
                                                        <Text fontSize="sm" fontWeight="semibold">{product.productoNombre}</Text>
                                                        <Text fontSize="xs" color="gray.600">{product.productoId}</Text>
                                                    </Box>
                                                    <Box>
                                                        <Text fontSize="xs" color="gray.500">Dia</Text>
                                                        <Text fontSize="sm">{dayLabels[product.dayIndex] ?? `Dia ${product.dayIndex + 1}`}</Text>
                                                    </Box>
                                                    <Box>
                                                        <Text fontSize="xs" color="gray.500">Unidades</Text>
                                                        <Text fontSize="sm">{formatNumber(product.unidades)}</Text>
                                                    </Box>
                                                    <Box>
                                                        <Text fontSize="xs" color="gray.500">Lotes</Text>
                                                        <Flex gap={2} align="center" wrap="wrap">
                                                            <Text fontSize="sm">
                                                                {product.lotes === null ? "-" : formatNumber(product.lotes)}
                                                            </Text>
                                                            <Badge colorScheme={product.loteSize > 0 ? "blue" : "orange"}>
                                                                Lote {product.loteSize || "-"}
                                                            </Badge>
                                                        </Flex>
                                                    </Box>
                                                </SimpleGrid>
                                            </Box>
                                        ))}
                                </VStack>
                            </AccordionPanel>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}
        </Box>
    );
}
