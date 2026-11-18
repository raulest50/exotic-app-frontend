import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import {
    Alert, Badge, Box, Button, CloseButton, Dialog, Field, Flex, Grid,
    Heading, Image, Input, NativeSelect, Portal, Spinner, Stack, Table, Text,
} from "@chakra-ui/react";
import { FiBox, FiChevronDown, FiChevronRight, FiEye, FiSearch } from "react-icons/fi";
import { loadModel } from "../Productos/Fotogrametria3DTerminados/FotogrametriaApi";
import { buscarCatalogoProductos, consultarCatalogoFormulacion, extractApiError } from "./calidadApi";
import {
    calcularFilasFormulacion, formatCantidadFormulacion, parseCantidadSimulada, unidadFormulacion,
    type CatalogoFormulacion, type CatalogoProducto,
} from "./catalogoFormulacion";
import type { PageResponse } from "./types";

const RenderWindow = lazy(() => import("../Productos/Fotogrametria3DTerminados/RenderWindow"));

function LoadingMessage({ children }: { children: string }) {
    return <Flex role="status" align="center" justify="center" gap={3} p={8}>
        <Spinner size="sm" /><Text fontSize="sm">{children}</Text>
    </Flex>;
}

function ProductPicker({ onClose, onSelect }: { onClose: () => void; onSelect: (product: CatalogoProducto) => void }) {
    const [search, setSearch] = useState("");
    const [tipo, setTipo] = useState<"" | "T" | "S">("");
    const [query, setQuery] = useState({ search: "", tipo: "" as "" | "T" | "S", page: 0, size: 10 });
    const [page, setPage] = useState<PageResponse<CatalogoProducto> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError("");
        buscarCatalogoProductos(query, controller.signal).then(result => {
            if (!controller.signal.aborted) setPage(result);
        }).catch(cause => {
            if (!controller.signal.aborted) {
                setPage(null);
                setError(extractApiError(cause, "No se pudo consultar el catálogo de productos."));
            }
        }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [query]);

    function searchProducts(event: FormEvent) {
        event.preventDefault();
        setQuery({ search: search.trim(), tipo, page: 0, size: 10 });
    }

    return <Dialog.Root open onOpenChange={({ open }) => { if (!open) onClose(); }} size="lg" scrollBehavior="inside">
        <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
            <Dialog.Header><Dialog.Title>Seleccionar terminado o semiterminado</Dialog.Title></Dialog.Header>
            <Dialog.CloseTrigger asChild><CloseButton aria-label="Cerrar catálogo de productos" size="sm" /></Dialog.CloseTrigger>
            <Dialog.Body>
                <Stack gap={4}>
                    <Box as="form" onSubmit={searchProducts}>
                        <Flex gap={3} align="end" wrap="wrap">
                            <Field.Root flex="1" minW="180px">
                                <Field.Label>Nombre o código</Field.Label>
                                <Input value={search} maxLength={150} onChange={event => setSearch(event.target.value)} placeholder="Buscar producto" />
                            </Field.Root>
                            <Field.Root w={{ base: "full", sm: "180px" }}>
                                <Field.Label>Tipo de producto</Field.Label>
                                <NativeSelect.Root><NativeSelect.Field value={tipo} onChange={event => setTipo(event.target.value as "" | "T" | "S")}>
                                    <option value="">Todos</option><option value="T">Terminados</option><option value="S">Semiterminados</option>
                                </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
                            </Field.Root>
                            <Button type="submit" colorPalette="teal" loading={loading}><FiSearch />Buscar</Button>
                        </Flex>
                    </Box>
                    {error && <Text role="alert" color="red.fg">{error}</Text>}
                    {loading ? <LoadingMessage>Consultando productos…</LoadingMessage> : <Stack gap={2}>
                        {page?.content.map(product => <Button
                            key={product.productoId} variant="outline" w="full" h="auto" p={3}
                            justifyContent="start" whiteSpace="normal" textAlign="start"
                            onClick={() => onSelect(product)}
                        >
                            <Flex w="full" align="start" justify="space-between" gap={3}>
                                <Box minW={0}>
                                    <Text fontWeight="semibold">{product.nombre}</Text>
                                    <Text fontSize="xs" color="fg.muted">{product.productoId} · {unidadFormulacion(product.tipoUnidades)}</Text>
                                    {product.categoriaNombre && <Text fontSize="xs" color="fg.muted">{product.categoriaNombre}</Text>}
                                </Box>
                                <Stack gap={1} align="end" flexShrink={0}>
                                    <Badge colorPalette={product.tipoProducto === "S" ? "purple" : "teal"}>{product.tipoProducto === "S" ? "Semiterminado" : "Terminado"}</Badge>
                                    {product.status === 1 && <Badge colorPalette="orange">Obsoleto</Badge>}
                                </Stack>
                            </Flex>
                        </Button>)}
                        {page?.content.length === 0 && <Text py={6} textAlign="center" color="fg.muted">No se encontraron productos.</Text>}
                    </Stack>}
                </Stack>
            </Dialog.Body>
            <Dialog.Footer justifyContent="space-between" flexWrap="wrap" gap={3}>
                <Text fontSize="sm" color="fg.muted">{page ? `${page.totalElements} productos · Página ${page.number + 1} de ${Math.max(1, page.totalPages)}` : ""}</Text>
                <Flex gap={2}>
                    <Button size="sm" variant="outline" disabled={loading || !page || query.page <= 0} onClick={() => setQuery(current => ({ ...current, page: current.page - 1 }))}>Anterior</Button>
                    <Button size="sm" variant="outline" disabled={loading || !page || query.page >= page.totalPages - 1} onClick={() => setQuery(current => ({ ...current, page: current.page + 1 }))}>Siguiente</Button>
                </Flex>
            </Dialog.Footer>
        </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>;
}

function safePhotoUrl(value: string | null): string | null {
    if (!value?.trim()) return null;
    try {
        const url = new URL(value, window.location.origin);
        return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
    } catch { return null; }
}

type ModelState = { status: "loading" | "absent" | "error"; error?: string } | { status: "ready"; model: Blob };

function ProductViewer({ producto, isActive }: { producto: CatalogoProducto; isActive: boolean }) {
    const [model, setModel] = useState<ModelState>({ status: producto.tipoProducto === "T" ? "loading" : "absent" });
    const [revision, setRevision] = useState(0);
    const [photoFailed, setPhotoFailed] = useState(false);
    const photo = safePhotoUrl(producto.fotoUrl);

    useEffect(() => {
        if (!isActive || producto.tipoProducto !== "T") return;
        const controller = new AbortController();
        setModel({ status: "loading" });
        loadModel(producto.productoId, controller.signal).then(saved => {
            if (!controller.signal.aborted) setModel(saved ? { status: "ready", model: saved.glb } : { status: "absent" });
        }).catch(cause => {
            if (!controller.signal.aborted) setModel({ status: "error", error: extractApiError(cause, "No se pudo consultar el modelo 3D guardado.") });
        });
        return () => controller.abort();
    }, [producto.productoId, producto.tipoProducto, isActive, revision]);

    return <Box as="section" aria-label="Vista del producto" borderWidth="1px" rounded="lg" overflow="hidden" bg="bg.panel">
        <Flex p={4} align="center" justify="space-between" gap={2} borderBottomWidth="1px">
            <Heading as="h3" size="sm">Vista del producto</Heading>
            <Badge colorPalette={model.status === "ready" ? "teal" : "gray"}>{model.status === "loading" ? "Consultando…" : model.status === "ready" ? "Modelo 3D" : photo && !photoFailed ? "Imagen registrada" : "Sin vista previa"}</Badge>
        </Flex>
        {model.status === "loading" ? <LoadingMessage>Consultando modelo 3D…</LoadingMessage>
            : model.status === "ready" ? <Suspense fallback={<LoadingMessage>Preparando visor 3D…</LoadingMessage>}>
                <RenderWindow model={model.model} active={isActive} readOnly />
            </Suspense>
                : photo && !photoFailed ? <Box p={4} bg="bg.subtle"><Image src={photo} alt={`Imagen registrada de ${producto.nombre}`} w="full" h="300px" objectFit="contain" onError={() => setPhotoFailed(true)} /></Box>
                    : <Stack minH="300px" align="center" justify="center" p={6} gap={3} bg="bg.subtle" textAlign="center">
                        <Box fontSize="3xl" color="fg.muted"><FiBox aria-hidden="true" /></Box>
                        <Text fontWeight="medium">{model.status === "error" ? "No se pudo consultar el modelo" : "Sin modelo disponible"}</Text>
                        <Text fontSize="sm" color="fg.muted">{photoFailed ? "No se pudo cargar la imagen registrada de este producto." : model.status === "error" ? "Puedes reintentar la consulta del modelo guardado." : "Este producto no tiene una vista previa registrada disponible."}</Text>
                    </Stack>}
        <Stack p={4} gap={2}>
            {model.status === "error" && <>
                <Text role="alert" fontSize="sm" color="red.fg">{model.error}</Text>
                <Button size="sm" variant="outline" alignSelf="start" onClick={() => setRevision(current => current + 1)}>Reintentar modelo 3D</Button>
            </>}
            <Text fontSize="xs" color="fg.muted">{model.status === "ready" ? "Vista del modelo guardado. Su apariencia no certifica dimensiones, escala ni resultados de calidad."
                : model.status === "loading" ? "Se consulta el modelo asociado al producto."
                    : model.status === "error" ? "La consulta del modelo falló; su disponibilidad no pudo confirmarse."
                        : "No hay modelo 3D guardado disponible para este producto."}</Text>
        </Stack>
    </Box>;
}

function ConsultaProducto({ selected, isActive }: { selected: CatalogoProducto; isActive: boolean }) {
    const [detail, setDetail] = useState<CatalogoFormulacion | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [revision, setRevision] = useState(0);
    const [quantity, setQuantity] = useState("1");
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const cantidad = parseCantidadSimulada(quantity);
    const producto = detail?.producto ?? selected;
    const unidad = unidadFormulacion(producto.tipoUnidades);
    const rows = useMemo(() => calcularFilasFormulacion(detail?.insumos ?? [], cantidad), [detail, cantidad]);
    const visibleRows = rows.filter(row => row.parentKeys.every(key => !collapsed.has(key)));
    const expandableRows = rows.filter(row => row.expandable);
    const allCollapsed = expandableRows.length > 0 && expandableRows.every(row => collapsed.has(row.key));
    const incomplete = rows.some(row => row.cantidadBase === null || row.cantidadSimulada === null
        || !row.insumo.tipoUnidades?.trim() || !row.insumo.productoId || !row.insumo.tipoProducto || row.observacion);
    // El aviso raíz se explica aquí; las advertencias de componentes se conservan.
    const advertencias = detail?.advertencias.filter(notice => !detail.recetaHistorica
        || notice !== "Receta histórica: cálculo basado en coeficientes registrados.") ?? [];

    useEffect(() => {
        if (!isActive) return;
        const controller = new AbortController();
        setLoading(true); setError("");
        consultarCatalogoFormulacion(selected.productoId, controller.signal).then(result => {
            if (!controller.signal.aborted) { setDetail(result); setCollapsed(new Set()); }
        }).catch(cause => {
            if (!controller.signal.aborted) {
                setDetail(null);
                setError(extractApiError(cause, "No se pudo consultar la formulación del producto."));
            }
        }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [selected.productoId, isActive, revision]);

    function toggleRow(key: string) {
        setCollapsed(current => {
            const next = new Set(current);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    }

    return <Stack gap={5}>
        <Grid templateColumns={{ base: "1fr", lg: "minmax(0, 1.3fr) minmax(0, 1fr)" }} gap={4} alignItems="stretch">
            <Stack p={4} gap={2} borderWidth="1px" rounded="lg" bg="teal.subtle">
                <Flex gap={2} wrap="wrap" align="center">
                    <Text fontSize="sm" color="fg.muted">{producto.productoId} · Base de cálculo: 1 {unidad}</Text>
                    <Badge colorPalette={producto.tipoProducto === "S" ? "purple" : "teal"}>{producto.tipoProducto === "S" ? "Semiterminado" : "Terminado"}</Badge>
                    {producto.status === 1 && <Badge colorPalette="orange">Obsoleto</Badge>}
                </Flex>
                <Heading as="h3" size="sm" overflowWrap="anywhere">{producto.nombre}</Heading>
                {producto.categoriaNombre && <Text fontSize="sm" color="fg.muted">{producto.categoriaNombre}</Text>}
            </Stack>
            <Stack borderWidth="1px" rounded="lg" p={4} gap={3} bg="bg.subtle">
                <Text fontWeight="semibold">Simulador de formulación</Text>
                <Field.Root invalid={cantidad === null}>
                    <Field.Label>Cantidad de salida a simular ({unidad})</Field.Label>
                    <Input type="text" inputMode="decimal" value={quantity} maxLength={40} onChange={event => setQuantity(event.target.value)} bg="bg.panel" />
                    <Field.ErrorText>Ingresa una cantidad finita mayor que cero.</Field.ErrorText>
                </Field.Root>
                <Flex gap={3} justify="space-between" align="center" wrap="wrap">
                    <Button size="sm" colorPalette="teal" variant="outline" onClick={() => setQuantity("1")}>Ver por 1 {unidad}</Button>
                    <Text role="status" fontSize="xs" color="fg.muted">{cantidad !== null ? `Simulación para ${formatCantidadFormulacion(cantidad)} ${unidad}` : "Cantidad no válida"}</Text>
                </Flex>
            </Stack>
        </Grid>

        {detail && (detail.recetaHistorica || advertencias.length > 0) && <Alert.Root status="warning" alignItems="start"><Alert.Indicator /><Stack gap={1}>
            <Text fontWeight="semibold">Observaciones de la formulación</Text>
            {detail.recetaHistorica && <Text fontSize="sm">Receta histórica: la formulación se calcula con los coeficientes registrados por unidad; la cantidad de salida de la receta histórica no está documentada.</Text>}
            {advertencias.map((notice, index) => <Text key={index} fontSize="sm">{notice}</Text>)}
        </Stack></Alert.Root>}

        <Grid templateColumns={{ base: "minmax(0, 1fr)", xl: "minmax(0, 1.85fr) minmax(0, 1fr)" }} gap={5} alignItems="start">
            <Box as="section" aria-label="Desglose de materiales" minW={0} borderWidth="1px" rounded="lg" overflow="hidden" bg="bg.panel">
                <Flex p={4} gap={3} justify="space-between" align="center" borderBottomWidth="1px" wrap="wrap">
                    <Heading as="h3" size="sm">Desglose de materiales</Heading>
                    {expandableRows.length > 0 && <Button size="xs" variant="ghost" colorPalette="teal" onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(expandableRows.map(row => row.key)))}>{allCollapsed ? "Expandir todo" : "Contraer todo"}</Button>}
                </Flex>
                {loading ? <LoadingMessage>Consultando formulación…</LoadingMessage> : error ? <Stack p={5} gap={3}>
                    <Text role="alert" color="red.fg">{error}</Text>
                    <Button size="sm" alignSelf="start" variant="outline" onClick={() => setRevision(current => current + 1)}>Reintentar formulación</Button>
                </Stack> : detail?.insumos.length === 0 ? <Text py={10} px={5} textAlign="center" color="fg.muted">Este producto no tiene insumos registrados en su formulación.</Text> : <Box overflowX="auto">
                    <Table.Root size="sm" minW="520px" aria-label="Cantidades teóricas de materiales por unidad y para la cantidad simulada">
                        <Table.Header><Table.Row bg="bg.subtle">
                            <Table.ColumnHeader minW="240px">Componente</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign="end">Por 1 {unidad}</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign="end">{cantidad !== null ? `Para ${formatCantidadFormulacion(cantidad)} ${unidad}` : "Cantidad simulada"}</Table.ColumnHeader>
                        </Table.Row></Table.Header>
                        <Table.Body>{visibleRows.map(row => <Table.Row key={row.key} bg={row.insumo.tipoProducto === "S" ? "bg.subtle" : undefined}>
                            <Table.Cell verticalAlign="top" lineHeight="normal">
                                <Flex gap={2} ps={`${Math.min(row.depth, 8) * 12}px`} align="start">
                                    {row.expandable ? <Button size="xs" variant="ghost" minW="28px" px={1}
                                        aria-label={`${collapsed.has(row.key) ? "Desplegar" : "Contraer"} ${row.insumo.nombre ?? "Producto no disponible"}`}
                                        aria-expanded={!collapsed.has(row.key)} onClick={() => toggleRow(row.key)}>
                                        {collapsed.has(row.key) ? <FiChevronRight /> : <FiChevronDown />}
                                    </Button> : <Box w="28px" flexShrink={0} />}
                                    <Stack gap={1} minW={0}>
                                        <Text fontWeight="medium" overflowWrap="anywhere">{row.insumo.nombre ?? "Producto no disponible"}</Text>
                                        <Text fontSize="xs" color="fg.muted">{row.insumo.productoId ?? "Sin código de producto"}</Text>
                                        {row.insumo.tipoProducto === "S" && <Badge alignSelf="start" colorPalette="purple" whiteSpace="normal">{row.insumo.requiereOrdenFabricacion ? "Semiterminado · orden propia" : "Semiterminado · etapa integrada"}</Badge>}
                                        {row.observacion && <Text fontSize="xs" color="orange.fg">{row.observacion}</Text>}
                                        {!row.insumo.tipoUnidades?.trim() && <Text fontSize="xs" color="orange.fg">Unidad no registrada</Text>}
                                    </Stack>
                                </Flex>
                            </Table.Cell>
                            <Table.Cell textAlign="end" verticalAlign="top" lineHeight="normal" fontVariantNumeric="tabular-nums" title={row.cantidadBase !== null ? String(row.cantidadBase) : undefined}>
                                <Text fontSize="sm">{formatCantidadFormulacion(row.cantidadBase)}</Text>
                                <Text fontSize="xs" color="fg.muted">{unidadFormulacion(row.insumo.tipoUnidades)}</Text>
                            </Table.Cell>
                            <Table.Cell textAlign="end" verticalAlign="top" lineHeight="normal" fontVariantNumeric="tabular-nums" title={row.cantidadSimulada !== null ? String(row.cantidadSimulada) : undefined}>
                                <Text fontSize="sm" fontWeight="semibold">{formatCantidadFormulacion(row.cantidadSimulada)}</Text>
                                <Text fontSize="xs" color="fg.muted">{unidadFormulacion(row.insumo.tipoUnidades)}</Text>
                            </Table.Cell>
                        </Table.Row>)}</Table.Body>
                    </Table.Root>
                </Box>}
                <Stack p={4} gap={2} borderTopWidth="1px">
                    <Text fontSize="xs" color="fg.muted">Las filas hijas desglosan su semiterminado. No se suman de nuevo al padre. Los semiterminados con orden propia se identifican para distinguir su fabricación independiente.</Text>
                    <Text fontSize="xs" color="fg.muted">Cantidades teóricas según la receta registrada en el catálogo; no descuentan existencias ni aplican redondeos de compra ni evalúan disponibilidad.</Text>
                    {incomplete && cantidad !== null && <Text fontSize="xs" color="orange.fg">Hay datos pendientes o advertencias. La simulación no debe interpretarse como una dispensación completa.</Text>}
                </Stack>
            </Box>
            <ProductViewer producto={producto} isActive={isActive} />
        </Grid>
    </Stack>;
}

export default function CatalogoFormulacionTab({ isActive }: { isActive: boolean }) {
    const [pickerOpen, setPickerOpen] = useState(false);
    const [selected, setSelected] = useState<CatalogoProducto | null>(null);

    return <Stack gap={5} textAlign="start">
        <Flex justify="space-between" align="center" gap={3} wrap="wrap">
            <Heading as="h2" size="md">Catálogo y formulación</Heading>
            <Badge variant="subtle" colorPalette="teal"><FiEye />Solo consulta</Badge>
        </Flex>
        <Text fontSize="sm" color="fg.muted">Consulta la formulación de terminados y semiterminados y simula los insumos para la cantidad deseada. No registra dispensaciones ni modifica producción, inventario o compras.</Text>
        <Button alignSelf="start" colorPalette="teal" variant={selected ? "outline" : "solid"} onClick={() => setPickerOpen(true)}><FiSearch />{selected ? "Cambiar producto" : "Seleccionar producto"}</Button>
        {selected ? <ConsultaProducto key={selected.productoId} selected={selected} isActive={isActive} /> : <Stack borderWidth="1px" rounded="lg" p={{ base: 6, md: 10 }} align="center" gap={3} bg="bg.subtle" textAlign="center">
            <Box fontSize="3xl" color="fg.muted"><FiBox aria-hidden="true" /></Box>
            <Text fontWeight="semibold">Selecciona un producto para consultar su formulación</Text>
            <Text fontSize="sm" color="fg.muted">Podrás ver las cantidades por una unidad de salida, simular otra cantidad y explorar su modelo 3D o imagen cuando estén disponibles.</Text>
        </Stack>}
        {pickerOpen && isActive && <ProductPicker onClose={() => setPickerOpen(false)} onSelect={product => { setSelected(product); setPickerOpen(false); }} />}
    </Stack>;
}
