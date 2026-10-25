import { useEffect, useState, useId } from "react";
import { Box, Button, Flex, Icon, SimpleGrid, Text } from "@chakra-ui/react";
import { FiCheckCircle, FiChevronDown, FiChevronUp, FiHelpCircle, FiXCircle } from "react-icons/fi";
import OperationResultDialog from "./OperationResultDialog.tsx";
import type { EditingProduct, SavedProductSummary } from "./ProcessDesignerApi.ts";
import type { UnidadMedidaProducto } from "../types.tsx";
import { unidadesCompatibles } from "../UnidadesMedidaApi.ts";
import type { Edge } from "@xyflow/react";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import { validateProductId } from "../productIdUtils.ts";
import type { DesignerProduct } from "./CabeceraDatos.tsx";
import type { DesignerNode } from "./ProcessDesignerTab.tsx";

const endpoints = new EndPointsURL();
type Check = { label: string; valid: boolean | null };
function validateDraft(product: DesignerProduct, nodes: DesignerNode[], edges: Edge[], units: UnidadMedidaProducto[]): Check[] {
    const inputs = nodes.filter((n) => n.type === "material" || n.type === "semiterminado");
    const processes = nodes.filter((n) => n.type === "process");
    const targets = nodes.filter((n) => n.type === "target");
    const ids = new Set(nodes.map((n) => n.id));
    const incoming = (id: string) => edges.filter((e) => e.target === id).length;
    const outgoing = (id: string) => edges.filter((e) => e.source === id).length;
    const visited = new Set<string>();
    const pending = targets.map((n) => n.id);
    while (pending.length) {
        const id = pending.pop()!;
        if (visited.has(id)) continue;
        visited.add(id);
        pending.push(...edges.filter((e) => e.target === id).map((e) => e.source));
    }
    // Kahn's algorithm also detects disconnected cycles.
    const degrees = new Map(nodes.map((n) => [n.id, incoming(n.id)]));
    const roots = nodes.filter((n) => !incoming(n.id)).map((n) => n.id);
    let processed = 0;
    while (roots.length) {
        const id = roots.pop()!;
        processed++;
        for (const edge of edges.filter((e) => e.source === id)) {
            const degree = (degrees.get(edge.target) ?? 0) - 1;
            degrees.set(edge.target, degree);
            if (degree === 0) roots.push(edge.target);
        }
    }
    const positive = (value: string | number | undefined) => Number.isFinite(Number(value)) && Number(value) > 0;
    const amount = (value: string) => /^(?:0|[1-9]\d{0,11})(?:\.\d{1,12})?$/.test(value) && positive(value);
    const hasGraph = inputs.length > 0 || processes.length > 0;
    return [
        { label: "Código alfanumérico en mayúsculas", valid: product.productoId ? product.productoId.length <= 255 && validateProductId(product.productoId) === null : null },
        { label: "Nombre del producto", valid: product.nombre ? !!product.nombre.trim() && product.nombre.length <= 200 : null },
        { label: "Contenido positivo y unidad de contenido válida", valid: product.cantidadUnidad ? positive(product.cantidadUnidad) && units.some(u => u.codigo === product.unidadContenidoPorEnvase) : null },
        { label: "Catálogo de unidades disponible", valid: units.length > 0 },
        { label: "Unidad de producto válida", valid: units.some(u => u.codigo === product.tipoUnidades) },
        { label: "Salida positiva, hasta 12 decimales y unidad compatible", valid: amount(product.cantidadSalidaReceta) && unidadesCompatibles(units, product.tipoUnidades).some(u => u.codigo === product.unidadSalidaReceta) },
        { label: "Categoría del terminado", valid: product.tipo_producto === "S" || !!product.categoria?.categoriaId },
        { label: "Prefijo de lote", valid: product.prefijoLote ? /^[A-Z0-9]{1,20}$/.test(product.prefijoLote) : product.tipo_producto === "S" && !product.requiereOrdenFabricacion ? true : null },
        { label: "IVA y rendimiento válidos", valid: [0, 5, 19].includes(product.ivaPercentual ?? 0) && product.rendimientoTeorico.trim() !== "" && Number.isFinite(Number(product.rendimientoTeorico)) && Number(product.rendimientoTeorico) >= 0 },
        { label: "Insumos positivos, hasta 12 decimales y unidades compatibles", valid: inputs.length ? inputs.every((n) => amount(n.data.cantidad) && unidadesCompatibles(units, n.data.producto.tipoUnidades).some(u => u.codigo === n.data.unidad)) : null },
        { label: "Insumos distintos del producto destino", valid: inputs.length ? inputs.every((n) => n.data.producto.productoId !== product.productoId) : null },
        { label: "Procesos y áreas asignados", valid: processes.length ? processes.every((n) => positive(n.data.proceso.procesoId) && positive(n.data.proceso.areaOperativaId)) : null },
        { label: "Un único destino final", valid: targets.length === 1 },
        { label: "Dirección y referencias de conexiones", valid: edges.length ? edges.every((e) => {
            const source = nodes.find((n) => n.id === e.source), target = nodes.find((n) => n.id === e.target);
            return ids.has(e.source) && ids.has(e.target) && e.source !== e.target && source?.type !== "target"
                && (target?.type === "process" || (source?.type === "process" && target?.type === "target"));
        }) : null },
        { label: "Entradas y salidas completas", valid: hasGraph ? inputs.every((n) => incoming(n.id) === 0 && outgoing(n.id) === 1) && processes.every((n) => incoming(n.id) > 0 && outgoing(n.id) === 1) && targets.every((n) => incoming(n.id) > 0 && outgoing(n.id) === 0) : null },
        { label: "Sin ciclos ni nodos desconectados del destino", valid: hasGraph ? processed === nodes.length && nodes.every((n) => visited.has(n.id)) : null },
        ...(product.casePack ? [
            { label: "Unidades por caja enteras y positivas", valid: product.tipo_producto === "T" && Number.isInteger(product.casePack.unitsPerCase) && product.casePack.unitsPerCase >= 1 && product.casePack.unitsPerCase <= 2147483647 },
            { label: "Materiales de empaque sin repetir, cantidades y unidades válidas", valid: !!product.casePack.insumosEmpaque?.length
                && new Set(product.casePack.insumosEmpaque.map(item => item.material.productoId)).size === product.casePack.insumosEmpaque.length
                && product.casePack.insumosEmpaque.every(item => !!item.material.productoId && item.material.tipoMaterial === 2 && positive(item.cantidad)
                    && !!item.uom && item.uom.length <= 12 && item.uom === item.material.tipoUnidades) },
            { label: "EAN-14, dimensiones y peso del empaque válidos (opcionales)", valid: (!product.casePack.ean14 || /^\d{14}$/.test(product.casePack.ean14))
                && [product.casePack.largoCm, product.casePack.anchoCm, product.casePack.altoCm, product.casePack.grossWeightKg].every(value => value == null || positive(value)) },
        ] : []),
    ];
}

export default function Validator({ product, nodes, edges, isActive, units, saving, canSave, onSave, error, result, onCloseResult, editingProduct, hasUnsavedChanges, revision }: {
    product: DesignerProduct; nodes: DesignerNode[]; edges: Edge[]; isActive: boolean; units: UnidadMedidaProducto[];
    saving: boolean; canSave: boolean; onSave: () => Promise<void>; error: string;
    result: SavedProductSummary | null; onCloseResult: () => void; editingProduct: EditingProduct | null; hasUnsavedChanges: boolean; revision: number;
}) {
    const reasonId = useId();
    const [retry, setRetry] = useState(0);
    const [expanded, setExpanded] = useState(false);
    const [availability, setAvailability] = useState<{ key: string; code: boolean | null; prefix: boolean | null; failed?: boolean; pending?: boolean }>({ key: "", code: null, prefix: null });
    const editingId = editingProduct?.productoId;
    const editingType = editingProduct?.tipoProducto;
    const key = JSON.stringify([product.productoId, product.prefijoLote ?? "", editingId, editingType, revision]);
    useEffect(() => {
        if (!isActive) return;
        const controller = new AbortController();
        setAvailability({ key, code: null, prefix: null, pending: true });
        const timer = setTimeout(async () => {
            const requests: Promise<void>[] = [];
            if (validateProductId(product.productoId) === null) {
                requests.push(axios.get<{ productoId: string; tipo_producto: string }>(endpoints.update_producto.replace("{productoId}", encodeURIComponent(product.productoId)), { signal: controller.signal, withCredentials: true })
                    .then(({ data }) => { if (!controller.signal.aborted) setAvailability((s) => ({ ...s,
                        code: !!editingId && data.productoId === editingId && data.tipo_producto === editingType
                            && product.productoId === editingId && product.tipo_producto === editingType })); })
                    .catch((error: unknown) => {
                        const notFound = axios.isAxiosError(error) && error.response?.status === 404;
                        if (!controller.signal.aborted) setAvailability((s) => ({ ...s, code: notFound ? !editingId : null, failed: s.failed || !notFound }));
                    }));
            }
            if (product.prefijoLote && /^[A-Z0-9]{1,20}$/.test(product.prefijoLote)) {
                requests.push(axios.get<{ valido: boolean }>(endpoints.validador_prefijo_lote, { params: { prefijoLote: product.prefijoLote, productoId: editingId }, signal: controller.signal, withCredentials: true })
                    .then(({ data }) => { if (!controller.signal.aborted) setAvailability((s) => ({ ...s, prefix: data.valido === true })); })
                    .catch(() => { if (!controller.signal.aborted) setAvailability(s => ({ ...s, failed: true })); }));
            }
            await Promise.all(requests);
            if (!controller.signal.aborted) setAvailability(s => ({ ...s, pending: false }));
        }, 600);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [isActive, key, product.productoId, product.tipo_producto, product.prefijoLote, editingId, editingType, retry, revision]);
    const checks = [...validateDraft(product, nodes, edges, units),
        { label: editingProduct ? "Producto existente e identidad conservada" : "Código disponible en el catálogo", valid: availability.key === key ? availability.code : null },
        ...(product.prefijoLote ? [{ label: "Prefijo disponible", valid: availability.key === key ? availability.prefix : null }] : []),
    ];
    const passed = checks.filter((c) => c.valid === true).length;
    const reason = saving ? "Guardando el producto…" : !canSave ? "No tienes permiso para guardar."
        : !hasUnsavedChanges ? editingProduct ? "No hay cambios pendientes para guardar." : "Completa los datos para crear un producto."
        : availability.key !== key || availability.pending ? "Verificando código y prefijo…"
        : availability.failed ? "No se pudo verificar el catálogo. Reintenta la comprobación."
        : passed !== checks.length ? `Faltan ${checks.length - passed} comprobaciones. Abre la validación para revisar los detalles.` : "";
    return <Box borderWidth="1px" rounded="md" mt="3" mb="3" p="3" bg="bg.panel">
        <Flex gap="3" justify="space-between" flexWrap="wrap" align="center">
        <Button variant="ghost" size="sm" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
            {expanded ? <FiChevronUp /> : <FiChevronDown />} Validación en vivo · {passed}/{checks.length}
        </Button>
        <Button colorPalette="teal" disabled={!!reason || !isActive} loading={saving} loadingText="Guardando…" aria-describedby={reasonId}
            onClick={() => { if (!reason) void onSave(); }}>{editingProduct ? "Guardar cambios" : "Crear producto"}</Button>
        </Flex>
        <Text id={reasonId} fontSize="sm" color="fg.muted" mt="2" role="status">{reason || "La receta está lista para guardar."}</Text>
        {availability.failed && !saving && <Button size="sm" variant="outline" mt="2" onClick={() => setRetry(n => n + 1)}>Reintentar comprobación</Button>}
        {error && <Text role="alert" color="red.fg" mt="3">{error}</Text>}
        {result && <OperationResultDialog result={result} onClose={onCloseResult} />}
        {expanded && <>
            <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap="2" p="2">
                {checks.map((check) => <Flex key={check.label} gap="2" align="center" fontSize="sm">
                    <Icon color={check.valid === null ? "fg.muted" : check.valid ? "green.fg" : "red.fg"} asChild aria-label={check.valid === null ? "Pendiente" : check.valid ? "Válido" : "Revisar"} role="img">
                        {check.valid === null ? <FiHelpCircle /> : check.valid ? <FiCheckCircle /> : <FiXCircle />}
                    </Icon><Text>{check.label}</Text>
                </Flex>)}
            </SimpleGrid>
            <Text fontSize="xs" color="fg.muted" px="2">? significa pendiente o sin verificar. El servidor vuelve a validar antes de registrar el producto y su receta.</Text>
        </>}
    </Box>;
}
