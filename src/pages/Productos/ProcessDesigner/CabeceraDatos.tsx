import { useEffect, useId, useState } from "react";
import { Box, Button, Field, Fieldset, Flex, Grid, Input, NativeSelect, SimpleGrid, Stack, Text, Textarea } from "@chakra-ui/react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import type { Categoria, ProductoSemiter, UnidadMedidaProducto } from "../types.tsx";
import { normalizeProductId } from "../productIdUtils.ts";

// rendimientoTeorico se conserva para compatibilidad con v1; no se edita en este diseñador.
export type DesignerProduct = Omit<ProductoSemiter, "insumos" | "procesoProduccionCompleto"> & { rendimientoTeorico: string; cantidadSalidaReceta: string; unidadSalidaReceta: string };
const endpoints = new EndPointsURL();

function sugerirPrefijoLote(nombre: string): string {
    const palabras = nombre.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase().match(/[A-Z0-9]+/g) ?? [];
    return palabras.map((palabra) => palabra[0]).join("").slice(0, 20);
}

export default function CabeceraDatos({ product, onChange, isActive, units, isEditing }: {
    product: DesignerProduct; onChange: (product: DesignerProduct) => void; isActive: boolean; units: UnidadMedidaProducto[]; isEditing: boolean;
}) {
    const [expanded, setExpanded] = useState(true);
    const [categories, setCategories] = useState<Categoria[]>([]);
    const [categoryError, setCategoryError] = useState(false);
    const [retry, setRetry] = useState(0);
    const [manualPrefix, setManualPrefix] = useState(() => isEditing || Boolean(product.prefijoLote));
    const contentId = useId();
    useEffect(() => {
        if (!isActive) return;
        const controller = new AbortController();
        setCategoryError(false);
        axios.get<Categoria[]>(endpoints.get_categorias, { signal: controller.signal })
            .then(({ data }) => { if (!controller.signal.aborted) setCategories(data); })
            .catch(() => { if (!controller.signal.aborted) setCategoryError(true); });
        return () => controller.abort();
    }, [isActive, retry]);
    const patch = (changes: Partial<DesignerProduct>) => onChange({ ...product, ...changes });
    const suggestedPrefix = sugerirPrefijoLote(product.nombre);
    const isTerminado = product.tipo_producto === "T";
    const inventoryLocked = isEditing || isTerminado || product.requiereOrdenFabricacion;
    return (
        <Box borderWidth="1px" rounded="md" mb="3" p="3" bg="bg.panel">
            <Flex direction={{ base: "column", md: "row" }} align={{ base: "stretch", md: "center" }} gap="3">
                <Button
                    size="sm" variant="ghost" justifyContent="flex-start" whiteSpace="normal"
                    h="auto" minH="8" py="2" minW="0" flex="1"
                    onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-controls={contentId}
                >
                    {expanded ? <FiChevronUp /> : <FiChevronDown />}
                    <Text textAlign="left" overflowWrap="anywhere">
                        Datos del producto{product.nombre ? ` · ${product.nombre}` : ""}
                    </Text>
                </Button>
                <Field.Root w={{ base: "full", md: "64" }} flexShrink="0">
                    <Field.Label>Tipo de producto</Field.Label>
                    <NativeSelect.Root size="sm" disabled={isEditing}>
                        <NativeSelect.Field value={product.tipo_producto} onChange={(e) => patch({ tipo_producto: e.target.value, categoria: undefined, casePack: undefined, unidadSalidaReceta: "", inventareable: e.target.value === "T", requiereOrdenFabricacion: e.target.value === "T" })}>
                            <option value="T">Terminado</option>
                            <option value="S">Semiterminado</option>
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                    {isEditing && <Field.HelperText>El tipo del producto existente se conserva.</Field.HelperText>}
                </Field.Root>
            </Flex>
            <Box id={contentId} hidden={!expanded}>
                {expanded && <Stack mt="3" gap="3">
                    <Fieldset.Root size="sm" gap="0" minW="0">
                        <Fieldset.Legend fontSize="xs" fontWeight="semibold" color="fg.muted">Identificación</Fieldset.Legend>
                        <Grid templateColumns={{ base: "minmax(0, 1fr)", md: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 2fr)" }} gap="3">
                            <Field.Root required>
                                <Field.Label>{isEditing ? "Código" : "Código nuevo"}</Field.Label>
                                <Input size="sm" readOnly={isEditing} value={product.productoId} onChange={(e) => patch({ productoId: normalizeProductId(e.target.value) })} />
                                {isEditing && <Field.HelperText>Identificador del producto; no se puede modificar.</Field.HelperText>}
                            </Field.Root>
                            <Field.Root>
                                <Field.Label>{isEditing ? "Prefijo de lote" : "Prefijo de lote nuevo"}</Field.Label>
                                <Flex gap="2" w="full">
                                    <Input size="sm" minW="0" maxLength={20} value={product.prefijoLote ?? ""} onChange={(e) => {
                                        // Clearing the field is also a manual choice, including semiterminados without their own lots.
                                        setManualPrefix(true);
                                        patch({ prefijoLote: e.target.value.toUpperCase() });
                                    }} />
                                    <Button type="button" size="sm" variant="outline" flexShrink="0" disabled={!suggestedPrefix}
                                        aria-label="Usar prefijo sugerido desde el nombre" onClick={() => {
                                            setManualPrefix(false);
                                            patch({ prefijoLote: suggestedPrefix });
                                        }}>Sugerir</Button>
                                </Flex>
                                <Field.HelperText>
                                    {manualPrefix
                                        ? "Prefijo manual. Sugerir lo vuelve a generar desde el nombre."
                                        : "Se actualiza con las iniciales al cambiar el nombre. Puedes editarlo."}
                                </Field.HelperText>
                            </Field.Root>
                            <Field.Root required>
                                <Field.Label>Nombre</Field.Label>
                                <Input size="sm" value={product.nombre} onChange={(e) => {
                                    const nombre = e.target.value;
                                    patch(manualPrefix ? { nombre } : { nombre, prefijoLote: sugerirPrefijoLote(nombre) });
                                }} />
                            </Field.Root>
                        </Grid>
                    </Fieldset.Root>
                    <Fieldset.Root size="sm" gap="0" minW="0" borderTopWidth="1px" pt="2">
                        <Fieldset.Legend fontSize="xs" fontWeight="semibold" color="fg.muted">Definición</Fieldset.Legend>
                        <SimpleGrid columns={{ base: 1, md: 3 }} gap="3">
                            <Box minW="0">
                                {isTerminado ? <Field.Root required>
                                    <Field.Label>Categoría</Field.Label>
                                    <NativeSelect.Root size="sm">
                                        <NativeSelect.Field value={product.categoria?.categoriaId ?? ""} onChange={(e) => patch({ categoria: categories.find((c) => c.categoriaId === Number(e.target.value)) })}>
                                            <option value="">Seleccionar categoría</option>
                                            {product.categoria && !categories.some((c) => c.categoriaId === product.categoria?.categoriaId) && <option value={product.categoria.categoriaId}>{product.categoria.categoriaNombre}</option>}
                                            {categories.map((c) => <option key={c.categoriaId} value={c.categoriaId}>{c.categoriaNombre}</option>)}
                                        </NativeSelect.Field>
                                        <NativeSelect.Indicator />
                                    </NativeSelect.Root>
                                    {categoryError && <Button variant="plain" size="xs" colorPalette="red" whiteSpace="normal" h="auto" onClick={() => setRetry((n) => n + 1)}>No se cargaron las categorías. Reintentar</Button>}
                                </Field.Root> : <Stack gap="1.5">
                                    <Text fontSize="sm" fontWeight="medium">Categoría</Text>
                                    <Text fontSize="sm" color="fg.muted" minH="8" py="1.5">Solo aplica a terminados.</Text>
                                </Stack>}
                            </Box>
                            <Grid templateColumns="minmax(0, 1fr) 5.5rem" gap="2" alignItems="end">
                                <Field.Root required>
                                    <Field.Label>Contenido por envase / presentación</Field.Label>
                                    <Input size="sm" type="number" min="0" step="any" value={product.cantidadUnidad} onChange={(e) => patch({ cantidadUnidad: e.target.value })} />
                                </Field.Root>
                                <Field.Root>
                                    <Field.Label>Unidad</Field.Label>
                                    <NativeSelect.Root size="sm">
                                        <NativeSelect.Field value={product.unidadContenidoPorEnvase ?? ""} onChange={(e) => patch({ unidadContenidoPorEnvase: e.target.value })}>
                                            <option value="">Elegir</option>{units.map((unit) => <option key={unit.codigo} value={unit.codigo}>{unit.simbolo}</option>)}
                                        </NativeSelect.Field>
                                        <NativeSelect.Indicator />
                                    </NativeSelect.Root>
                                </Field.Root>
                            </Grid>
                            <Field.Root required>
                                <Field.Label>Unidad del producto en inventario</Field.Label>
                                <NativeSelect.Root size="sm">
                                    <NativeSelect.Field value={product.tipoUnidades} onChange={e => patch({ tipoUnidades: e.target.value, unidadSalidaReceta: "" })}>
                                        <option value="">Elegir</option>
                                        {units.map(unit => <option key={unit.codigo} value={unit.codigo}>{unit.codigo} · {unit.magnitud.toLowerCase()}</option>)}
                                    </NativeSelect.Field><NativeSelect.Indicator />
                                </NativeSelect.Root>
                                <Field.HelperText>Define la cantidad obtenida y su unidad en el nodo de salida del grafo.</Field.HelperText>
                            </Field.Root>
                        </SimpleGrid>
                    </Fieldset.Root>
                    <Fieldset.Root size="sm" gap="0" minW="0" borderTopWidth="1px" pt="2">
                        <Fieldset.Legend fontSize="xs" fontWeight="semibold" color="fg.muted">Configuración</Fieldset.Legend>
                        <SimpleGrid columns={{ base: 1, md: 3 }} gap="3">
                            <Field.Root>
                                <Field.Label>IVA (%)</Field.Label>
                                <NativeSelect.Root size="sm">
                                    <NativeSelect.Field value={product.ivaPercentual ?? 0} onChange={(e) => patch({ ivaPercentual: Number(e.target.value) })}>
                                        {[0, 5, 19].map((iva) => <option key={iva} value={iva}>{iva}</option>)}
                                    </NativeSelect.Field>
                                    <NativeSelect.Indicator />
                                </NativeSelect.Root>
                            </Field.Root>
                            <Box minW="0">
                                {product.tipo_producto === "S" ? <Field.Root>
                                    <Field.Label>Orden de fabricación</Field.Label>
                                    <NativeSelect.Root size="sm">
                                        <NativeSelect.Field value={product.requiereOrdenFabricacion ? "si" : "no"} onChange={(e) => patch({ requiereOrdenFabricacion: e.target.value === "si", inventareable: e.target.value === "si" || product.inventareable })}>
                                            <option value="si">Requiere orden</option>
                                            <option value="no">Sin orden propia</option>
                                        </NativeSelect.Field>
                                        <NativeSelect.Indicator />
                                    </NativeSelect.Root>
                                </Field.Root> : <Stack gap="1.5">
                                    <Text fontSize="sm" fontWeight="medium">Orden de fabricación</Text>
                                    <Text fontSize="sm" color="fg.muted" minH="8" py="1.5">Requerida para terminados.</Text>
                                </Stack>}
                            </Box>
                            <Field.Root disabled={inventoryLocked}>
                                <Field.Label>Inventariable</Field.Label>
                                <NativeSelect.Root size="sm">
                                    <NativeSelect.Field value={product.inventareable ? "si" : "no"} onChange={(e) => patch({ inventareable: e.target.value === "si" })}>
                                        <option value="si">Sí</option><option value="no">No</option>
                                    </NativeSelect.Field>
                                    <NativeSelect.Indicator />
                                </NativeSelect.Root>
                                {inventoryLocked && <Field.HelperText>
                                    {isEditing ? "Se conserva la configuración de inventario del producto existente." : isTerminado ? "Los terminados mantienen existencias." : "Requerido al usar una orden de fabricación."}
                                </Field.HelperText>}
                            </Field.Root>
                        </SimpleGrid>
                    </Fieldset.Root>
                    <Field.Root>
                        <Field.Label>Observaciones</Field.Label>
                        <Textarea rows={2} value={product.observaciones ?? ""} onChange={(e) => patch({ observaciones: e.target.value })} />
                    </Field.Root>
                </Stack>}
            </Box>
        </Box>
    );
}
