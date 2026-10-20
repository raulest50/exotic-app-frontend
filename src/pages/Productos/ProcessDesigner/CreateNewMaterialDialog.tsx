import { useRef, useState } from "react";
import {
    Button, Dialog, Field, Input, NativeSelect, Portal, SimpleGrid, Stack, Switch, Text, Textarea,
} from "@chakra-ui/react";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import { useTabPermission } from "../../../auth/usePermissions.ts";
import { toaster } from "../../../components/ui/toaster.tsx";
import { Modulo } from "../../Usuarios/GestionUsuarios/types.tsx";
import { normalizeProductId, validateProductId } from "../productIdUtils.ts";
import { IVA_VALUES, TIPOS_MATERIALES, TIPOS_PRODUCTOS, UNIDADES, type Material } from "../types.tsx";

const endpoints = new EndPointsURL();
const MAX_PDF_BYTES = 10 * 1024 * 1024;

interface Props {
    onClose: () => void;
    onCreated: (material: Material) => void;
}

export default function CreateNewMaterialDialog({ onClose, onCreated }: Props) {
    const [form, setForm] = useState({
        codigo: "", nombre: "", observaciones: "", cantidadUnidad: "", tipoUnidades: UNIDADES.KG,
        tipoMaterial: TIPOS_MATERIALES.materiaPrima, ivaPercentual: 0,
        inventareable: true, consumoDirecto: false, puntoReorden: "-1", prefijoLote: "",
    });
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const submitting = useRef(false);
    const permission = useTabPermission(Modulo.PRODUCTOS, "CODIFICAR_MATERIAL");
    const canCreate = permission.ready && permission.nivel >= 2;
    function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
        setForm((current) => ({ ...current, [key]: value }));
    }

    async function saveMaterial() {
        if (submitting.current) return;
        setError("");
        if (!canCreate) {
            setError("Necesitas permiso Codificar material, nivel 2, para crear un material.");
            return;
        }
        const codigo = normalizeProductId(form.codigo.trim());
        if (validateProductId(codigo) || !form.nombre.trim()) {
            setError("Completa el nombre y un código compuesto únicamente por letras y números.");
            return;
        }
        const cantidad = Number(form.cantidadUnidad);
        const puntoReorden = Number(form.puntoReorden);
        if (!Number.isFinite(cantidad) || cantidad <= 0) {
            setError("La cantidad por unidad debe ser un número positivo.");
            return;
        }
        if (form.inventareable && (!form.puntoReorden.trim() || !Number.isFinite(puntoReorden)
            || (puntoReorden !== -1 && puntoReorden < 0))) {
            setError("El punto de reorden debe ser -1 (sin alertas) o un número mayor o igual a cero.");
            return;
        }
        if (form.inventareable && form.prefijoLote.trim() && !/^[A-Za-z0-9]+$/.test(form.prefijoLote.trim())) {
            setError("El prefijo de lote solo admite letras y números.");
            return;
        }
        if (file && ((file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) || file.size > MAX_PDF_BYTES)) {
            setError("La ficha técnica debe ser un PDF de máximo 10 MB.");
            return;
        }
        const material: Material = {
            productoId: codigo,
            nombre: form.nombre.trim(),
            observaciones: form.observaciones.trim(),
            costo: 0,
            tipo_producto: TIPOS_PRODUCTOS.materiaPrima,
            tipoMaterial: form.tipoMaterial,
            tipoUnidades: form.tipoUnidades,
            cantidadUnidad: form.cantidadUnidad,
            ivaPercentual: form.ivaPercentual,
            inventareable: form.inventareable,
            consumoDirecto: !form.inventareable && form.consumoDirecto,
            puntoReorden: form.inventareable ? puntoReorden : -1,
            prefijoLote: form.inventareable && form.prefijoLote.trim() ? form.prefijoLote.trim().toUpperCase() : undefined,
        };
        const payload = new FormData();
        payload.append("materiaPrima", new Blob([JSON.stringify(material)], { type: "application/json" }));
        if (file) payload.append("file", file);
        submitting.current = true;
        setSaving(true);
        let saved: Material;
        try {
            const response = await axios.post<Material>(endpoints.save_mprima_v2, payload);
            saved = response.data;
        } catch (cause: unknown) {
            const detail = axios.isAxiosError(cause) ? cause.response?.data : undefined;
            setError(typeof detail === "string" && detail.length < 600
                ? detail
                : "No se pudo confirmar el guardado. Consulta el catálogo antes de volver a intentar.");
            return;
        } finally {
            submitting.current = false;
            setSaving(false);
        }
        toaster.create({ type: "success", title: "Material creado", description: `${saved.productoId} · ${saved.nombre}` });
        onCreated(saved);
    }

    return (
        <Dialog.Root
            open size="xl" scrollBehavior="inside" closeOnInteractOutside={false} closeOnEscape={!saving}
            onOpenChange={({ open }) => { if (!open && !submitting.current) onClose(); }}
        >
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content as="form" onSubmit={(event) => { event.preventDefault(); void saveMaterial(); }} textAlign="left">
                        <Dialog.Header>
                            <Stack gap="1">
                                <Dialog.Title>Crear material</Dialog.Title>
                                <Dialog.Description>
                                    Se guardará en el catálogo y se agregará al lienzo. Esta acción no guarda el diagrama.
                                </Dialog.Description>
                            </Stack>
                        </Dialog.Header>
                        <Dialog.Body>
                            <fieldset disabled={saving} style={{ border: 0, padding: 0, minWidth: 0 }}>
                                <Stack gap="4">
                                    <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
                                        <Field.Root required>
                                            <Field.Label>Código <Field.RequiredIndicator /></Field.Label>
                                            <Input required value={form.codigo} onChange={(event) => update("codigo", normalizeProductId(event.target.value))} />
                                        </Field.Root>
                                        <Field.Root required>
                                            <Field.Label>Nombre <Field.RequiredIndicator /></Field.Label>
                                            <Input required value={form.nombre} onChange={(event) => update("nombre", event.target.value)} />
                                        </Field.Root>
                                        <Field.Root>
                                            <Field.Label>Tipo de material</Field.Label>
                                            <NativeSelect.Root>
                                                <NativeSelect.Field value={form.tipoMaterial} onChange={(event) => update("tipoMaterial", Number(event.target.value))}>
                                                    <option value={TIPOS_MATERIALES.materiaPrima}>Materia prima</option>
                                                    <option value={TIPOS_MATERIALES.materialDeEmpaque}>Material de empaque</option>
                                                </NativeSelect.Field>
                                                <NativeSelect.Indicator />
                                            </NativeSelect.Root>
                                        </Field.Root>
                                        <Field.Root>
                                            <Field.Label>Unidad</Field.Label>
                                            <NativeSelect.Root>
                                                <NativeSelect.Field value={form.tipoUnidades} onChange={(event) => update("tipoUnidades", event.target.value)}>
                                                    {Object.values(UNIDADES).map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                                                </NativeSelect.Field>
                                                <NativeSelect.Indicator />
                                            </NativeSelect.Root>
                                        </Field.Root>
                                        <Field.Root required>
                                            <Field.Label>Cantidad por unidad <Field.RequiredIndicator /></Field.Label>
                                            <Input required type="number" step="any" min="0" value={form.cantidadUnidad} onChange={(event) => update("cantidadUnidad", event.target.value)} />
                                        </Field.Root>
                                        <Field.Root>
                                            <Field.Label>IVA</Field.Label>
                                            <NativeSelect.Root>
                                                <NativeSelect.Field value={form.ivaPercentual} onChange={(event) => update("ivaPercentual", Number(event.target.value))}>
                                                    {Object.values(IVA_VALUES).map((iva) => <option key={iva} value={iva}>{iva}%</option>)}
                                                </NativeSelect.Field>
                                                <NativeSelect.Indicator />
                                            </NativeSelect.Root>
                                        </Field.Root>
                                    </SimpleGrid>
                                    <Switch.Root checked={form.inventareable} onCheckedChange={({ checked }) => update("inventareable", checked)}>
                                        <Switch.HiddenInput />
                                        <Switch.Control><Switch.Thumb /></Switch.Control>
                                        <Switch.Label>Inventariable</Switch.Label>
                                    </Switch.Root>
                                    {form.inventareable ? (
                                        <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
                                            <Field.Root required>
                                                <Field.Label>Punto de reorden <Field.RequiredIndicator /></Field.Label>
                                                <Input required type="number" step="any" min="-1" value={form.puntoReorden} onChange={(event) => update("puntoReorden", event.target.value)} />
                                                <Field.HelperText>-1: sin alertas; 0: sin umbral definido.</Field.HelperText>
                                            </Field.Root>
                                            <Field.Root>
                                                <Field.Label>Prefijo de lote (opcional)</Field.Label>
                                                <Input value={form.prefijoLote} onChange={(event) => update("prefijoLote", event.target.value.toUpperCase())} />
                                            </Field.Root>
                                        </SimpleGrid>
                                    ) : (
                                        <Switch.Root checked={form.consumoDirecto} onCheckedChange={({ checked }) => update("consumoDirecto", checked)}>
                                            <Switch.HiddenInput />
                                            <Switch.Control><Switch.Thumb /></Switch.Control>
                                            <Switch.Label>Consumo directo</Switch.Label>
                                        </Switch.Root>
                                    )}
                                    <Field.Root>
                                        <Field.Label>Observaciones (opcional)</Field.Label>
                                        <Textarea value={form.observaciones} onChange={(event) => update("observaciones", event.target.value)} />
                                    </Field.Root>
                                    <Field.Root>
                                        <Field.Label>Ficha técnica (opcional)</Field.Label>
                                        <Input type="file" accept="application/pdf,.pdf" p="1" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
                                        <Field.HelperText>PDF, máximo 10 MB.</Field.HelperText>
                                    </Field.Root>
                                </Stack>
                            </fieldset>
                            {error && <Text mt="4" role="alert" color="fg.error">{error}</Text>}
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancelar</Button>
                            <Button type="submit" colorPalette="teal" loading={saving} loadingText="Guardando…" disabled={!canCreate}>
                                Crear y agregar
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
