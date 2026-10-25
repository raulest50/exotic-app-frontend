import { useEffect, useId, useState } from "react";
import { Box, Button, Field, Flex, IconButton, Input, NativeSelect, SimpleGrid, Table, Text } from "@chakra-ui/react";
import { FiCheck, FiChevronDown, FiChevronUp, FiPlus, FiTrash2 } from "react-icons/fi";
import type { CasePack, Material } from "../types.tsx";
import { buscarMaterialesEmpaque, type PackagingPage } from "./ProcessDesignerApi.ts";

const optionalDimensions = [
    ["largoCm", "Largo (cm)"], ["anchoCm", "Ancho (cm)"], ["altoCm", "Alto (cm)"], ["grossWeightKg", "Peso bruto (kg)"],
] as const;
const positive = (value: number) => Number.isFinite(value) && value > 0;

export default function PackagingDefinition({ value, onChange, isActive }: {
    value: CasePack | undefined; onChange: (value: CasePack | undefined) => void; isActive: boolean;
}) {
    const contentId = useId();
    const [expanded, setExpanded] = useState(false);
    const [search, setSearch] = useState("");
    const [searchBy, setSearchBy] = useState<"NOMBRE" | "ID">("NOMBRE");
    const [query, setQuery] = useState({ searchTerm: "", tipoBusqueda: "NOMBRE" as "NOMBRE" | "ID", page: 0 });
    const [result, setResult] = useState<PackagingPage | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const enabled = !!value;
    const items = value?.insumosEmpaque ?? [];
    const patch = (changes: Partial<CasePack>) => { if (value) onChange({ ...value, ...changes }); };

    useEffect(() => {
        if (!isActive || !expanded || !enabled) return;
        const controller = new AbortController();
        setLoading(true);
        setResult(null);
        setError("");
        buscarMaterialesEmpaque(query, controller.signal).then(data => {
            if (!controller.signal.aborted) setResult(data);
        }).catch(() => {
            if (!controller.signal.aborted) setError("No se pudieron consultar los materiales de empaque. Intenta buscar nuevamente.");
        }).finally(() => {
            if (!controller.signal.aborted) setLoading(false);
        });
        return () => controller.abort();
    }, [isActive, expanded, enabled, query]);

    function addMaterial(material: Material) {
        if (!value || items.some(item => item.material.productoId === material.productoId)) return;
        patch({ insumosEmpaque: [...items, {
            cantidad: 1, uom: material.tipoUnidades,
            material: { productoId: material.productoId, nombre: material.nombre, tipoUnidades: material.tipoUnidades, tipoMaterial: material.tipoMaterial },
        }] });
    }

    return <Box as="section" borderWidth="1px" rounded="md" mt="3" bg="bg.panel" aria-label="Definición de packaging">
        <Button w="full" h="auto" minH="10" py="2" px="3" variant="ghost" justifyContent="start" whiteSpace="normal"
            aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded(current => !current)}>
            {expanded ? <FiChevronUp /> : <FiChevronDown />}
            Packaging · {value ? `${value.unitsPerCase || "—"} unidades por caja · ${items.length} ${items.length === 1 ? "material" : "materiales"}` : "Sin definir (opcional)"}
        </Button>
        <Box id={contentId} hidden={!expanded} borderTopWidth="1px" p="3">
            {!value ? <Flex align="center" gap="3" flexWrap="wrap">
                <Text fontSize="sm" color="fg.muted">Define el contenido y los materiales necesarios para empacar una caja del terminado.</Text>
                <Button size="sm" variant="outline" colorPalette="teal" onClick={() => onChange({ unitsPerCase: 0, insumosEmpaque: [] })}><FiPlus /> Definir empaque</Button>
            </Flex> : <>
                <Flex align="end" gap="3" flexWrap="wrap">
                    <Field.Root required maxW="60" invalid={!Number.isInteger(value.unitsPerCase) || value.unitsPerCase < 1 || value.unitsPerCase > 2147483647}>
                        <Field.Label>Unidades por caja</Field.Label>
                        <Input size="sm" type="number" min="1" max="2147483647" step="1" value={value.unitsPerCase || ""}
                            onChange={event => patch({ unitsPerCase: Number(event.target.value) })} />
                        <Field.ErrorText>Usa un entero positivo.</Field.ErrorText>
                    </Field.Root>
                    <Field.Root maxW="60" invalid={!!value.ean14 && !/^\d{14}$/.test(value.ean14)}>
                        <Field.Label>EAN-14 (opcional)</Field.Label>
                        <Input size="sm" inputMode="numeric" maxLength={14} value={value.ean14 ?? ""} onChange={event => patch({ ean14: event.target.value })} />
                        <Field.ErrorText>Debe contener 14 dígitos.</Field.ErrorText>
                    </Field.Root>
                    <Button size="sm" variant="ghost" colorPalette="red" ms="auto" onClick={() => onChange(undefined)}><FiTrash2 /> Quitar definición</Button>
                </Flex>
                <Text fontSize="xs" color="fg.muted" mt="3" mb="2">
                    Las cantidades de abajo corresponden a una caja, en la unidad de inventario de cada material. Son adicionales a los insumos de la receta; evita contabilizar el mismo consumo dos veces.
                </Text>
                <SimpleGrid columns={{ base: 1, lg: 2 }} gap="4">
                    <Box minW="0">
                        <Text fontSize="sm" fontWeight="medium" mb="2">Materiales por caja</Text>
                        {!items.length ? <Text fontSize="sm" color="fg.muted">Agrega al menos un material de empaque.</Text>
                        : <Table.ScrollArea maxH="72" borderWidth="1px" rounded="sm">
                            <Table.Root size="sm" stickyHeader css={{ "& td": { lineHeight: "short" } }}>
                                <Table.Header><Table.Row>
                                    <Table.ColumnHeader>Material</Table.ColumnHeader><Table.ColumnHeader>Cantidad</Table.ColumnHeader>
                                    <Table.ColumnHeader>Unidad</Table.ColumnHeader><Table.ColumnHeader><Box srOnly>Acciones</Box></Table.ColumnHeader>
                                </Table.Row></Table.Header>
                                <Table.Body>{items.map((item, index) => <Table.Row key={`${item.material.productoId}-${index}`}>
                                    <Table.Cell><Text>{item.material.nombre}</Text><Text fontSize="xs" color="fg.muted">{item.material.productoId}</Text></Table.Cell>
                                    <Table.Cell>
                                        <Field.Root invalid={!positive(item.cantidad)}>
                                            <Input size="sm" w="28" type="number" min="0" step="any" value={item.cantidad || ""} aria-label={`Cantidad por caja de ${item.material.nombre}`}
                                                onChange={event => patch({ insumosEmpaque: items.map((current, i) => i === index ? { ...current, cantidad: Number(event.target.value) } : current) })} />
                                            <Field.ErrorText>Mayor que cero.</Field.ErrorText>
                                        </Field.Root>
                                    </Table.Cell>
                                    <Table.Cell>{item.uom || item.material.tipoUnidades || "Sin unidad"}</Table.Cell>
                                    <Table.Cell><IconButton size="xs" variant="ghost" colorPalette="red" aria-label={`Quitar ${item.material.nombre} del empaque`}
                                        onClick={() => patch({ insumosEmpaque: items.filter((_, i) => i !== index) })}><FiTrash2 /></IconButton></Table.Cell>
                                </Table.Row>)}</Table.Body>
                            </Table.Root>
                        </Table.ScrollArea>}
                    </Box>
                    <Box minW="0">
                        <form onSubmit={event => {
                            event.preventDefault();
                            setQuery({ searchTerm: searchBy === "ID" ? search.trim().toUpperCase() : search.trim(), tipoBusqueda: searchBy, page: 0 });
                        }}>
                            <Field.Root mb="2">
                                <Field.Label>Buscar materiales de empaque</Field.Label>
                                <Flex gap="2" w="full" flexWrap="wrap">
                                    <NativeSelect.Root size="sm" w="32">
                                        <NativeSelect.Field aria-label="Buscar empaque por" value={searchBy} onChange={event => setSearchBy(event.target.value as "NOMBRE" | "ID")}>
                                            <option value="NOMBRE">Nombre</option><option value="ID">Código</option>
                                        </NativeSelect.Field><NativeSelect.Indicator />
                                    </NativeSelect.Root>
                                    <Input size="sm" flex="1" minW="32" value={search} onChange={event => setSearch(event.target.value)} placeholder="Material de empaque" aria-label="Buscar materiales de empaque" />
                                    <Button size="sm" type="submit" variant="outline" loading={loading}>Buscar</Button>
                                </Flex>
                            </Field.Root>
                        </form>
                        <Box maxH="60" overflowY="auto" aria-busy={loading}>
                            {error && <Text role="alert" fontSize="sm" color="fg.error">{error}</Text>}
                            {loading && <Text role="status" fontSize="sm" color="fg.muted">Buscando materiales…</Text>}
                            {!loading && result?.content.length === 0 && <Text fontSize="sm" color="fg.muted">Sin resultados.</Text>}
                            {!loading && result?.content.map(material => {
                                const added = items.some(item => item.material.productoId === material.productoId);
                                return <Flex key={material.productoId} gap="2" align="center" py="1" borderBottomWidth="1px">
                                    <Text flex="1" minW="0" fontSize="sm">{material.nombre}<Text as="span" color="fg.muted" fontSize="xs"> · {material.productoId}</Text></Text>
                                    <IconButton size="xs" variant="ghost" colorPalette="teal" disabled={added} aria-label={`${added ? "Añadido" : "Agregar"} ${material.nombre} al empaque`}
                                        onClick={() => addMaterial(material)}>{added ? <FiCheck /> : <FiPlus />}</IconButton>
                                </Flex>;
                            })}
                        </Box>
                        {result && result.totalPages > 1 && <Flex align="center" justify="space-between" gap="2" mt="2">
                            <Button size="xs" variant="outline" disabled={loading || query.page === 0} onClick={() => setQuery(current => ({ ...current, page: current.page - 1 }))}>Anterior</Button>
                            <Text fontSize="xs">{query.page + 1} / {result.totalPages}</Text>
                            <Button size="xs" variant="outline" disabled={loading || query.page >= result.totalPages - 1} onClick={() => setQuery(current => ({ ...current, page: current.page + 1 }))}>Siguiente</Button>
                        </Flex>}
                    </Box>
                </SimpleGrid>
                <Box as="details" mt="3">
                    <Box as="summary" cursor="pointer" fontSize="sm" color="fg.muted">Dimensiones y peso (opcionales)</Box>
                    <SimpleGrid columns={{ base: 2, md: 4 }} gap="3" mt="2">
                        {optionalDimensions.map(([key, label]) => <Field.Root key={key} invalid={value[key] != null && !positive(value[key])}>
                            <Field.Label>{label}</Field.Label>
                            <Input size="sm" type="number" min="0" step="any" value={value[key] ?? ""}
                                onChange={event => patch({ [key]: event.target.value === "" ? undefined : Number(event.target.value) })} />
                            <Field.ErrorText>Mayor que cero o vacío.</Field.ErrorText>
                        </Field.Root>)}
                    </SimpleGrid>
                </Box>
                <Text fontSize="xs" color="fg.muted" mt="3">El empaque se guarda junto con el producto mediante Guardar producto, al final del diseñador.</Text>
            </>}
        </Box>
    </Box>;
}
