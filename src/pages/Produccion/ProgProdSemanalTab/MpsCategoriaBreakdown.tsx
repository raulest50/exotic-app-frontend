import { useMemo } from "react";
import {
    Badge,
    Box,
    Flex,
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

interface DayBreakdown {
    key: string;
    dayIndex: number;
    loteSize: number;
    unidades: number;
    lotes: number | null;
}

interface ProductBreakdown {
    productoId: string;
    productoNombre: string;
    totalUnidades: number;
    totalLotes: number;
    invalidLoteEntries: number;
    days: DayBreakdown[];
}

interface CategoryBreakdown {
    categoriaNombre: string;
    totalUnidades: number;
    totalLotes: number;
    invalidLoteEntries: number;
    products: ProductBreakdown[];
}

interface CategoryAccumulator {
    categoriaNombre: string;
    totalUnidades: number;
    totalLotes: number;
    invalidLoteEntries: number;
    productMap: Map<string, ProductBreakdown>;
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

function getDayLabel(dayLabels: string[], dayIndex: number): string {
    return dayLabels[dayIndex] ?? `Dia ${dayIndex + 1}`;
}

export default function MpsCategoriaBreakdown({
    entries,
    dayLabels,
}: MpsCategoriaBreakdownProps) {
    const categories = useMemo(() => {
        const grouped = new Map<string, CategoryAccumulator>();

        entries.forEach((entry, entryIndex) => {
            const categoriaNombre = getCategoryName(entry);
            const lotes = entry.loteSize > 0 ? entry.unidades / entry.loteSize : null;
            const category = grouped.get(categoriaNombre) ?? {
                categoriaNombre,
                totalUnidades: 0,
                totalLotes: 0,
                invalidLoteEntries: 0,
                productMap: new Map<string, ProductBreakdown>(),
            };
            const product = category.productMap.get(entry.productoId) ?? {
                productoId: entry.productoId,
                productoNombre: entry.productoNombre,
                totalUnidades: 0,
                totalLotes: 0,
                invalidLoteEntries: 0,
                days: [],
            };

            category.totalUnidades += Number.isFinite(entry.unidades) ? entry.unidades : 0;
            product.totalUnidades += Number.isFinite(entry.unidades) ? entry.unidades : 0;

            if (lotes !== null && Number.isFinite(lotes)) {
                category.totalLotes += lotes;
                product.totalLotes += lotes;
            } else {
                category.invalidLoteEntries += 1;
                product.invalidLoteEntries += 1;
            }

            product.days.push({
                key: `${entry.productoId}-${entry.dayIndex}-${entryIndex}`,
                dayIndex: entry.dayIndex,
                loteSize: entry.loteSize,
                unidades: entry.unidades,
                lotes,
            });

            category.productMap.set(entry.productoId, product);
            grouped.set(categoriaNombre, category);
        });

        return Array.from(grouped.values())
            .map<CategoryBreakdown>((category) => ({
                categoriaNombre: category.categoriaNombre,
                totalUnidades: category.totalUnidades,
                totalLotes: category.totalLotes,
                invalidLoteEntries: category.invalidLoteEntries,
                products: Array.from(category.productMap.values())
                    .map((product) => ({
                        ...product,
                        days: product.days.sort((left, right) => (
                            left.dayIndex - right.dayIndex
                        )),
                    }))
                    .sort((left, right) => (
                        left.productoNombre.localeCompare(right.productoNombre)
                    )),
            }))
            .sort((left, right) => (
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
                <VStack align="stretch" spacing={5}>
                    {categories.map((category) => (
                        <Box key={category.categoriaNombre}>
                            <Flex align="center" gap={3} mb={3}>
                                <Box w="10px" h="10px" borderRadius="full" bg="teal.500" flexShrink={0} />
                                <Flex flex="1" minW={0} justify="space-between" align="center" gap={3} wrap="wrap">
                                    <Box minW={0}>
                                        <Text fontWeight="semibold" noOfLines={1}>
                                            {category.categoriaNombre}
                                        </Text>
                                        <Text fontSize="xs" color="gray.500">
                                            {category.products.length} terminados |{" "}
                                            {category.products.reduce((total, product) => total + product.days.length, 0)} entradas
                                        </Text>
                                    </Box>
                                    <Flex gap={2} wrap="wrap" justify="flex-end">
                                        <Badge colorScheme="purple">
                                            {formatNumber(category.totalUnidades)} unidades
                                        </Badge>
                                        <Badge colorScheme={category.invalidLoteEntries > 0 ? "orange" : "green"}>
                                            {formatNumber(category.totalLotes)} lotes
                                        </Badge>
                                        {category.invalidLoteEntries > 0 && (
                                            <Badge colorScheme="orange">
                                                {category.invalidLoteEntries} sin lote valido
                                            </Badge>
                                        )}
                                    </Flex>
                                </Flex>
                            </Flex>

                            <Box ml={1} pl={5} borderLeftWidth="2px" borderColor="teal.100">
                                <VStack align="stretch" spacing={3}>
                                    {category.products.map((product) => (
                                        <Box key={product.productoId} position="relative">
                                            <Box
                                                position="absolute"
                                                left="-22px"
                                                top="18px"
                                                w="18px"
                                                borderTopWidth="2px"
                                                borderColor="teal.100"
                                            />
                                            <Flex
                                                bg="gray.50"
                                                borderRadius="md"
                                                px={3}
                                                py={2}
                                                justify="space-between"
                                                align="center"
                                                gap={3}
                                                wrap="wrap"
                                            >
                                                <Box minW={0}>
                                                    <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
                                                        {product.productoNombre}
                                                    </Text>
                                                    <Text fontSize="xs" color="gray.600">
                                                        {product.productoId}
                                                    </Text>
                                                </Box>
                                                <Flex gap={2} wrap="wrap" justify="flex-end">
                                                    <Badge colorScheme="purple">
                                                        {formatNumber(product.totalUnidades)} unidades
                                                    </Badge>
                                                    <Badge colorScheme={product.invalidLoteEntries > 0 ? "orange" : "green"}>
                                                        {formatNumber(product.totalLotes)} lotes
                                                    </Badge>
                                                    {product.invalidLoteEntries > 0 && (
                                                        <Badge colorScheme="orange">
                                                            {product.invalidLoteEntries} sin lote valido
                                                        </Badge>
                                                    )}
                                                </Flex>
                                            </Flex>

                                            <Box ml={4} mt={2} pl={4} borderLeftWidth="1px" borderColor="gray.200">
                                                <VStack align="stretch" spacing={2}>
                                                    {product.days.map((day) => (
                                                        <Flex
                                                            key={day.key}
                                                            position="relative"
                                                            align="center"
                                                            justify="space-between"
                                                            gap={3}
                                                            wrap="wrap"
                                                            py={2}
                                                        >
                                                            <Box
                                                                position="absolute"
                                                                left="-17px"
                                                                top="18px"
                                                                w="13px"
                                                                borderTopWidth="1px"
                                                                borderColor="gray.200"
                                                            />
                                                            <Box minW={0}>
                                                                <Text fontSize="sm" fontWeight="medium">
                                                                    {getDayLabel(dayLabels, day.dayIndex)}
                                                                </Text>
                                                                <Text fontSize="xs" color="gray.500">
                                                                    Dia programado
                                                                </Text>
                                                            </Box>
                                                            <Flex gap={2} wrap="wrap" justify="flex-end">
                                                                <Badge colorScheme="purple">
                                                                    {formatNumber(day.unidades)} unidades
                                                                </Badge>
                                                                <Badge colorScheme={day.loteSize > 0 ? "green" : "orange"}>
                                                                    {day.lotes === null ? "-" : formatNumber(day.lotes)} lotes
                                                                </Badge>
                                                                <Badge colorScheme={day.loteSize > 0 ? "blue" : "orange"}>
                                                                    Lote {day.loteSize || "-"}
                                                                </Badge>
                                                            </Flex>
                                                        </Flex>
                                                    ))}
                                                </VStack>
                                            </Box>
                                        </Box>
                                    ))}
                                </VStack>
                            </Box>
                        </Box>
                    ))}
                </VStack>
            )}
        </Box>
    );
}
