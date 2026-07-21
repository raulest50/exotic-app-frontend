import { ChevronDownIcon, ChevronUpIcon, SearchIcon } from "@chakra-ui/icons";
import {
    Alert,
    AlertIcon,
    Box,
    Button,
    Card,
    CardBody,
    Collapse,
    Input,
    InputGroup,
    InputLeftElement,
    SimpleGrid,
    Spinner,
    Stack,
    Text,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { requestErrorMessage, searchMaterialStock } from "./informesGlobales.api";
import { formatCurrency, formatQuantity } from "./InformeGlobalUi";
import type { ResultadoStockMaterial } from "./informesGlobales.types";

const MIN_SEARCH_LENGTH = 2;
const SEARCH_DELAY_MS = 350;

export default function BuscadorStockMaterialCard() {
    const [expanded, setExpanded] = useState(false);
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<ResultadoStockMaterial[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const normalizedSearch = search.trim();
        if (normalizedSearch.length < MIN_SEARCH_LENGTH) {
            setResults([]);
            setError(null);
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        const timeoutId = window.setTimeout(async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await searchMaterialStock(normalizedSearch, controller.signal);
                setResults(response.resultados);
            } catch (requestError) {
                if (!controller.signal.aborted) {
                    setResults([]);
                    setError(requestErrorMessage(requestError));
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, SEARCH_DELAY_MS);

        return () => {
            window.clearTimeout(timeoutId);
            controller.abort();
        };
    }, [search]);

    const normalizedSearch = search.trim();
    const showNoResults = normalizedSearch.length >= MIN_SEARCH_LENGTH
        && !loading
        && !error
        && results.length === 0;

    return (
        <Card variant="outline">
            <CardBody p={{ base: 3, md: 5 }}>
                <Stack spacing={4}>
                    <Button
                        variant="ghost"
                        justifyContent="space-between"
                        minH="44px"
                        px={2}
                        onClick={() => setExpanded((current) => !current)}
                        rightIcon={expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                        aria-expanded={expanded}
                    >
                        Buscar stock de un material
                    </Button>

                    <Collapse in={expanded} animateOpacity>
                        <Stack spacing={4} pt={1}>
                            <Text color="app.textMuted" fontSize="sm">
                                Busque por código o nombre. Se muestran hasta 10 coincidencias del almacén General.
                            </Text>
                            <InputGroup>
                                <InputLeftElement pointerEvents="none">
                                    {loading
                                        ? <Spinner size="sm" />
                                        : <SearchIcon color="app.textMuted" />}
                                </InputLeftElement>
                                <Input
                                    minH="44px"
                                    aria-label="Buscar material por código o nombre"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Ej. MP-001 o azúcar"
                                />
                            </InputGroup>

                            {error ? (
                                <Alert status="error" borderRadius="md">
                                    <AlertIcon />
                                    {error}
                                </Alert>
                            ) : null}

                            {showNoResults ? (
                                <Text color="app.textMuted" fontSize="sm">
                                    No se encontraron materiales para “{normalizedSearch}”.
                                </Text>
                            ) : null}

                            {results.length > 0 ? (
                                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                                    {results.map((material) => (
                                        <Box
                                            key={material.productoId}
                                            borderWidth="1px"
                                            borderColor="app.border"
                                            borderRadius="md"
                                            p={3}
                                        >
                                            <Text fontWeight="semibold">{material.nombre}</Text>
                                            <Text color="app.textMuted" fontSize="sm">
                                                {material.productoId}
                                            </Text>
                                            <Text mt={2}>
                                                {formatQuantity(material.stockGeneral)} {material.unidadMedida}
                                            </Text>
                                            <Text color="app.textMuted" fontSize="sm">
                                                {material.costoDisponible
                                                    ? `${formatCurrency(material.costoUnitario)} por ${material.unidadMedida} · ${formatCurrency(material.valorEstimado)} estimados`
                                                    : "Sin costo vigente"}
                                            </Text>
                                        </Box>
                                    ))}
                                </SimpleGrid>
                            ) : null}
                        </Stack>
                    </Collapse>
                </Stack>
            </CardBody>
        </Card>
    );
}
