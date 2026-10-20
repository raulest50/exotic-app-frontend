import { useEffect, useId, useRef, useState } from "react";
import {
    Box, Button, Field, Flex, Heading, Icon, IconButton, Input, NativeSelect, Spinner, Stack, Text,
} from "@chakra-ui/react";
import { FiCheck, FiChevronLeft, FiChevronRight, FiLayers, FiPlus } from "react-icons/fi";
import { BiTestTube } from "react-icons/bi";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import { useTabPermission } from "../../../auth/usePermissions.ts";
import { Tooltip } from "../../../components/ui/tooltip.tsx";
import { Modulo } from "../../Usuarios/GestionUsuarios/types.tsx";
import type { Producto } from "../types.tsx";
import CreateNewMaterialDialog from "./CreateNewMaterialDialog.tsx";

const endpoints = new EndPointsURL();
type ProductPage = { content: Producto[]; totalPages: number; totalElements: number };
type SearchQuery = { searchTerm: string; tipoBusqueda: "NOMBRE" | "ID"; clasificacion: "M" | "S"; tipoMaterial: string; page: number };

interface Props {
    isActive: boolean;
    selectedIds: string[];
    onAddProduct: (producto: Producto) => void;
}

export default function MaterialSemiTerPanel({ isActive, selectedIds, onAddProduct }: Props) {
    const panelId = useId();
    const [collapsed, setCollapsed] = useState(false);
    const [width, setWidth] = useState(320);
    const panelRef = useRef<HTMLDivElement>(null);
    const drag = useRef<{ x: number; width: number } | null>(null);
    const constrainWidth = (value: number) => Math.max(260, Math.min(value, 640, (panelRef.current?.parentElement?.clientWidth ?? 1200) * 0.5));
    const [createOpen, setCreateOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [searchBy, setSearchBy] = useState<"NOMBRE" | "ID">("NOMBRE");
    const [query, setQuery] = useState<SearchQuery>({
        searchTerm: "", tipoBusqueda: "NOMBRE", clasificacion: "M", tipoMaterial: "", page: 0,
    });
    const [result, setResult] = useState<ProductPage | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const permission = useTabPermission(Modulo.PRODUCTOS, "CODIFICAR_MATERIAL");
    const canCreate = permission.ready && permission.nivel >= 2;

    useEffect(() => {
        if (!isActive || collapsed) return;
        const controller = new AbortController();
        setLoading(true);
        setError("");
        axios.get<ProductPage>(endpoints.search_p4_receta_v2, {
            params: { ...query, tipoMaterial: query.clasificacion === "M" && query.tipoMaterial ? Number(query.tipoMaterial) : undefined, size: 10 }, signal: controller.signal,
        }).then(({ data }) => {
            if (!controller.signal.aborted) setResult(data);
        }).catch((cause: unknown) => {
            if (!controller.signal.aborted && !axios.isCancel(cause)) {
                setResult(null);
                setError("No se pudo consultar el catálogo. Intenta nuevamente.");
            }
        }).finally(() => {
            if (!controller.signal.aborted) setLoading(false);
        });
        return () => controller.abort();
    }, [isActive, collapsed, query]);

    return (
        <Flex
            ref={panelRef} position="relative"
            as="aside" aria-label="Materiales y semiterminados" direction="column"
            w={{ base: "full", lg: collapsed ? "3.5rem" : `${width}px` }} maxW={{ lg: collapsed ? "none" : "50%" }} flexShrink="0" minH="0"
            borderRightWidth={{ base: "0", lg: "1px" }} borderBottomWidth={{ base: "1px", lg: "0" }}
        >
            <Flex align="center" justify={collapsed ? "center" : "space-between"} p="2" gap="2">
                {!collapsed && <Heading size="sm" px="1">Materiales y semiterminados</Heading>}
                <IconButton
                    size="sm" variant="ghost"
                    aria-label={collapsed ? "Expandir panel de materiales" : "Contraer panel de materiales"}
                    aria-expanded={!collapsed} aria-controls={panelId}
                    onClick={() => setCollapsed((current) => !current)}
                >
                    {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
                </IconButton>
            </Flex>
            <Flex id={panelId} display={collapsed ? "none" : "flex"} direction="column" minH="0" flex="1">
                <Stack p="3" gap="3" borderBottomWidth="1px" overflowY="auto" flexShrink="0" maxH={{ lg: "65%" }}>
                    <Button size="sm" colorPalette="teal" disabled={!canCreate} onClick={() => setCreateOpen(true)}>
                        <FiPlus /> Crear material
                    </Button>
                    {!canCreate && permission.ready && (
                        <Text fontSize="xs" color="fg.muted">Crear requiere permiso Codificar material, nivel 2.</Text>
                    )}
                    <Field.Root>
                        <Field.Label>Catálogo</Field.Label>
                        <NativeSelect.Root size="sm">
                            <NativeSelect.Field
                                value={query.clasificacion}
                                onChange={(event) => setQuery((current) => ({
                                    ...current, clasificacion: event.target.value as "M" | "S", page: 0,
                                }))}
                            >
                                <option value="M">Materiales</option>
                                <option value="S">Semiterminados</option>
                            </NativeSelect.Field>
                            <NativeSelect.Indicator />
                        </NativeSelect.Root>
                    </Field.Root>
                    {query.clasificacion === "M" && (
                        <Field.Root>
                            <Field.Label>Tipo de material</Field.Label>
                            <NativeSelect.Root size="sm">
                                <NativeSelect.Field value={query.tipoMaterial} onChange={(event) => setQuery((current) => ({ ...current, tipoMaterial: event.target.value, page: 0 }))}>
                                    <option value="">Todos los materiales</option>
                                    <option value="1">Materias primas</option>
                                    <option value="2">Materiales de empaque</option>
                                </NativeSelect.Field>
                                <NativeSelect.Indicator />
                            </NativeSelect.Root>
                        </Field.Root>
                    )}
                    <form onSubmit={(event) => {
                        event.preventDefault();
                        setQuery((current) => ({
                            ...current, tipoBusqueda: searchBy,
                            searchTerm: searchBy === "ID" ? search.trim().toUpperCase() : search.trim(), page: 0,
                        }));
                    }}>
                        <Stack gap="2">
                            <Field.Root>
                                <Field.Label>Buscar por</Field.Label>
                                <NativeSelect.Root size="sm">
                                    <NativeSelect.Field value={searchBy} onChange={(event) => setSearchBy(event.target.value as "NOMBRE" | "ID")}>
                                        <option value="NOMBRE">Nombre</option>
                                        <option value="ID">Código exacto</option>
                                    </NativeSelect.Field>
                                    <NativeSelect.Indicator />
                                </NativeSelect.Root>
                            </Field.Root>
                            <Input
                                size="sm" aria-label={searchBy === "ID" ? "Código del producto" : "Nombre del producto"}
                                placeholder={searchBy === "ID" ? "Código exacto" : "Buscar por nombre"}
                                value={search} onChange={(event) => setSearch(event.target.value)}
                            />
                            <Button type="submit" size="sm" variant="outline" loading={loading}>Buscar</Button>
                        </Stack>
                    </form>
                </Stack>
                <Stack p="2" gap="1" flex="1" minH="0" overflowY="auto" maxH={{ base: "20rem", lg: "none" }} aria-busy={loading}>
                    {loading ? (
                        <Flex role="status" align="center" gap="2"><Spinner size="sm" /><Text fontSize="sm">Consultando…</Text></Flex>
                    ) : error ? (
                        <Stack>
                            <Text role="alert" fontSize="sm" color="fg.error">{error}</Text>
                            <Button size="sm" variant="outline" onClick={() => setQuery((current) => ({ ...current }))}>Reintentar</Button>
                        </Stack>
                    ) : result && (
                        <>
                            <Text fontSize="xs" color="fg.muted" role="status">{result.totalElements} resultados</Text>
                            {result.content.length === 0 && <Text fontSize="sm" color="fg.muted">No hay productos para esta búsqueda.</Text>}
                            {result.content.map((producto) => {
                                const added = selectedIds.includes(producto.productoId);
                                const isSemi = producto.tipo_producto === "S";
                                const kind = isSemi ? "Semiterminado" : "Material";
                                return (
                                    <Flex
                                        key={producto.productoId} align="center" gap="2" minH="10" px="2" py="1"
                                        borderBottomWidth="1px" _hover={{ bg: "bg.subtle" }}
                                    >
                                        <Icon boxSize="4" flexShrink="0" color={isSemi ? "purple.fg" : "green.fg"} role="img" aria-label={kind} asChild>
                                            {isSemi ? <FiLayers /> : <BiTestTube />}
                                        </Icon>
                                        <Tooltip content={`${kind} · ${producto.productoId} · ${producto.nombre} · ${producto.cantidadUnidad} ${producto.tipoUnidades}`}>
                                            <Text tabIndex={0} truncate flex="1" minW="0" fontSize="sm" fontWeight="medium" _focusVisible={{ outline: "2px solid", outlineColor: "teal.focusRing" }}>
                                                {producto.nombre}
                                            </Text>
                                        </Tooltip>
                                        <IconButton
                                            size="xs" variant="ghost" colorPalette="teal" flexShrink="0" disabled={added}
                                            onClick={() => onAddProduct(producto)}
                                            aria-label={`${added ? "Añadido" : "Agregar"} ${producto.nombre} (${producto.productoId}) al lienzo`}
                                        >{added ? <FiCheck /> : <FiPlus />}</IconButton>
                                    </Flex>
                                );
                            })}
                        </>
                    )}
                </Stack>
                {result && result.totalPages > 1 && !error && (
                    <Flex justify="space-between" align="center" p="3" gap="2" borderTopWidth="1px">
                        <IconButton
                            size="sm" variant="outline" aria-label="Página anterior" disabled={loading || query.page === 0}
                            onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}
                        ><FiChevronLeft /></IconButton>
                        <Text fontSize="xs">{query.page + 1} / {result.totalPages}</Text>
                        <IconButton
                            size="sm" variant="outline" aria-label="Página siguiente"
                            disabled={loading || query.page + 1 >= result.totalPages}
                            onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
                        ><FiChevronRight /></IconButton>
                    </Flex>
                )}
            </Flex>
            {!collapsed && (
                <Box role="separator" aria-label="Ancho del panel de materiales" aria-orientation="vertical"
                    aria-controls={panelId} aria-valuemin={260} aria-valuemax={640} aria-valuenow={Math.round(width)}
                    tabIndex={0} position="absolute" right="0" top="0" bottom="0" w="2" zIndex="1"
                    display={{ base: "none", lg: "block" }} cursor="col-resize" touchAction="none"
                    _hover={{ bg: "teal.subtle" }} _focusVisible={{ bg: "teal.subtle", outline: "2px solid", outlineColor: "teal.focusRing" }}
                    onPointerDown={(event) => {
                        if (event.button !== 0) return;
                        drag.current = { x: event.clientX, width: panelRef.current?.clientWidth ?? width };
                        event.currentTarget.setPointerCapture(event.pointerId);
                        event.preventDefault();
                    }}
                    onPointerMove={(event) => { if (drag.current) setWidth(constrainWidth(drag.current.width + event.clientX - drag.current.x)); }}
                    onPointerUp={(event) => { drag.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }}
                    onLostPointerCapture={() => { drag.current = null; }}
                    onKeyDown={(event) => {
                        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                        event.preventDefault();
                        setWidth(constrainWidth(event.key === "Home" ? 260 : event.key === "End" ? 640 : width + (event.key === "ArrowRight" ? 20 : -20)));
                    }}
                />
            )}
            {createOpen && (
                <CreateNewMaterialDialog
                    onClose={() => setCreateOpen(false)}
                    onCreated={(material) => {
                        setCreateOpen(false);
                        onAddProduct(material);
                        setQuery((current) => ({ ...current, page: 0 }));
                    }}
                />
            )}
        </Flex>
    );
}
