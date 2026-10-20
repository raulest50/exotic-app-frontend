import { useEffect, useState } from "react";
import { Box, Button, Flex, Icon, SimpleGrid, Text } from "@chakra-ui/react";
import { FiCheckCircle, FiChevronDown, FiChevronUp, FiHelpCircle, FiXCircle } from "react-icons/fi";
import type { Edge } from "@xyflow/react";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import { validateProductId } from "../productIdUtils.ts";
import type { DesignerProduct } from "./CabeceraDatos.tsx";
import type { DesignerNode } from "./ProcessDesignerTab.tsx";

const endpoints = new EndPointsURL();
type Check = { label: string; valid: boolean | null };
function validateDraft(product: DesignerProduct, nodes: DesignerNode[], edges: Edge[]): Check[] {
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
    const hasGraph = inputs.length > 0 || processes.length > 0;
    return [
        { label: "Código alfanumérico en mayúsculas", valid: product.productoId ? validateProductId(product.productoId) === null : null },
        { label: "Nombre del producto", valid: product.nombre ? !!product.nombre.trim() : null },
        { label: "Contenido positivo y unidad válida", valid: product.cantidadUnidad ? positive(product.cantidadUnidad) && ["U", "KG", "G", "L"].includes(product.tipoUnidades) : null },
        { label: "Categoría del terminado", valid: product.tipo_producto === "S" || !!product.categoria?.categoriaId },
        { label: "Prefijo de lote", valid: product.prefijoLote ? /^[A-Z0-9]{1,20}$/.test(product.prefijoLote) : product.tipo_producto === "S" && !product.requiereOrdenFabricacion ? true : null },
        { label: "IVA y rendimiento válidos", valid: [0, 5, 19].includes(product.ivaPercentual ?? 0) && product.rendimientoTeorico.trim() !== "" && Number.isFinite(Number(product.rendimientoTeorico)) && Number(product.rendimientoTeorico) >= 0 },
        { label: "Insumos con cantidades positivas", valid: inputs.length ? inputs.every((n) => positive(n.data.cantidad)) : null },
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
        ...(product.casePack ? [{ label: "Unidades y cantidades del empaque", valid: Number.isInteger(product.casePack.unitsPerCase) && product.casePack.unitsPerCase >= 1 && (product.casePack.insumosEmpaque ?? []).every((i) => positive(i.cantidad)) }] : []),
    ];
}

export default function Validator({ product, nodes, edges, isActive }: {
    product: DesignerProduct; nodes: DesignerNode[]; edges: Edge[]; isActive: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const [availability, setAvailability] = useState<{ key: string; code: boolean | null; prefix: boolean | null }>({ key: "", code: null, prefix: null });
    const key = JSON.stringify([product.productoId, product.prefijoLote ?? ""]);
    useEffect(() => {
        if (!isActive) return;
        const controller = new AbortController();
        setAvailability({ key, code: null, prefix: null });
        const timer = setTimeout(() => {
            if (validateProductId(product.productoId) === null) {
                axios.get(endpoints.update_producto.replace("{productoId}", encodeURIComponent(product.productoId)), { signal: controller.signal })
                    .then(() => { if (!controller.signal.aborted) setAvailability((s) => ({ ...s, code: false })); })
                    .catch((error: unknown) => { if (!controller.signal.aborted) setAvailability((s) => ({ ...s, code: axios.isAxiosError(error) && error.response?.status === 404 ? true : null })); });
            }
            if (product.prefijoLote && /^[A-Z0-9]{1,20}$/.test(product.prefijoLote)) {
                axios.get<{ valido: boolean }>(endpoints.validador_prefijo_lote, { params: { prefijoLote: product.prefijoLote }, signal: controller.signal })
                    .then(({ data }) => { if (!controller.signal.aborted) setAvailability((s) => ({ ...s, prefix: data.valido === true })); })
                    .catch(() => { /* Remain unverified if the server is unavailable. */ });
            }
        }, 600);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [isActive, key, product.productoId, product.prefijoLote]);
    const checks = [...validateDraft(product, nodes, edges),
        { label: "Código disponible en el catálogo", valid: availability.key === key ? availability.code : null },
        ...(product.prefijoLote ? [{ label: "Prefijo disponible", valid: availability.key === key ? availability.prefix : null }] : []),
    ];
    const passed = checks.filter((c) => c.valid === true).length;
    return <Box borderWidth="1px" rounded="md" mb="3" p="2" bg="bg.panel">
        <Button variant="ghost" size="sm" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
            {expanded ? <FiChevronUp /> : <FiChevronDown />} Validación en vivo · {passed}/{checks.length}
        </Button>
        {expanded && <>
            <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap="2" p="2">
                {checks.map((check) => <Flex key={check.label} gap="2" align="center" fontSize="sm">
                    <Icon color={check.valid === null ? "fg.muted" : check.valid ? "green.fg" : "red.fg"} asChild aria-label={check.valid === null ? "Pendiente" : check.valid ? "Válido" : "Revisar"} role="img">
                        {check.valid === null ? <FiHelpCircle /> : check.valid ? <FiCheckCircle /> : <FiXCircle />}
                    </Icon><Text>{check.label}</Text>
                </Flex>)}
            </SimpleGrid>
            <Text fontSize="xs" color="fg.muted" px="2">? significa pendiente o sin verificar. Estas comprobaciones orientan el borrador; todavía no se registra el producto.</Text>
        </>}
    </Box>;
}
