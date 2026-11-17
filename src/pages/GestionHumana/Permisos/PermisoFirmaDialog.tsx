import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Box, Button, Checkbox, CloseButton, Dialog, Field, Image, Input, NativeSelect, Portal, Spinner, Stack, Text } from "@chakra-ui/react";
import FirmaCanvas from "../../Usuarios/FirmaUsuario/FirmaCanvas";
import { validarFirmaImagen } from "../../Usuarios/FirmaUsuario/firmaCanvasUtils";
import { cancelado, errorPermiso, imagenFirma, permisosApi } from "./permisosPersonalApi";
import type { FirmaPermisoRequest, FirmaVigentePermiso } from "./types";

interface Props {
    titulo: string; descripcion: string; busy: boolean;
    onClose: () => void; onReload: () => Promise<void>; onConfirm: (firma: FirmaPermisoRequest) => Promise<void>;
}

export default function PermisoFirmaDialog({ titulo, descripcion, busy, onClose, onReload, onConfirm }: Props) {
    const [modo, setModo] = useState("dibujar");
    const [vigente, setVigente] = useState<FirmaVigentePermiso | null>(null);
    const [cargando, setCargando] = useState(true);
    const [imagen, setImagen] = useState<string | null>(null);
    const [confirmado, setConfirmado] = useState(false);
    const [error, setError] = useState("");
    const [conflicto, setConflicto] = useState(false);
    const [leyendo, setLeyendo] = useState(false);
    const revisionImagen = useRef(0);

    useEffect(() => {
        const controller = new AbortController();
        permisosApi.firmaVigente(controller.signal).then(setVigente).catch((e: unknown) => {
            if (!cancelado(e)) setError(errorPermiso(e, "No fue posible consultar su firma vigente. Puede dibujarla o cargar una imagen."));
        }).finally(() => { if (!controller.signal.aborted) setCargando(false); });
        return () => controller.abort();
    }, []);

    const cargar = async (file?: File) => {
        if (!file) return;
        const revision = ++revisionImagen.current;
        setLeyendo(true); setError(""); setImagen(null); setConfirmado(false);
        try {
            const result = await validarFirmaImagen(file);
            const image = await new Promise<HTMLImageElement>((resolve, reject) => {
                const candidate = new window.Image(); candidate.onload = () => resolve(candidate);
                candidate.onerror = () => reject(new Error("No se pudo preparar la firma.")); candidate.src = result.dataUrl;
            });
            const canvas = document.createElement("canvas");
            const scale = Math.min(1, 1200 / image.width, 600 / image.height);
            canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
            const context = canvas.getContext("2d");
            if (!context) throw new Error("No se pudo preparar la firma.");
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            const png = canvas.toDataURL("image/png");
            if ((png.split(",")[1]?.length ?? 0) * 3 / 4 > 1024 * 1024) throw new Error("La firma preparada supera 1 MiB. Use una imagen más sencilla o dibuje su firma.");
            if (revision === revisionImagen.current) setImagen(png);
        } catch (e) { if (revision === revisionImagen.current) setError(errorPermiso(e)); }
        finally { if (revision === revisionImagen.current) setLeyendo(false); }
    };

    const firmar = async () => {
        setError(""); setConflicto(false);
        try {
            if (modo !== "vigente" && (!imagen || (imagen.split(",")[1]?.length ?? 0) * 3 / 4 > 1024 * 1024)) throw new Error("Seleccione una firma preparada de hasta 1 MiB.");
            await onConfirm(modo === "vigente" && vigente
                ? { confirmacion: true, firmaVisualVersionId: vigente.id }
                : { confirmacion: true, imagenBase64: imagen?.split(",")[1] });
        } catch (e) { setError(errorPermiso(e)); setConflicto(axios.isAxiosError(e) && e.response?.status === 409); }
    };
    const seleccionValida = modo === "vigente" ? !!vigente : !!imagen;

    return <Dialog.Root open onOpenChange={({ open }) => { if (!open && !busy) onClose(); }} size="xl" closeOnInteractOutside={!busy}>
        <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
            <Dialog.Header><Dialog.Title>{titulo}</Dialog.Title></Dialog.Header>
            <Dialog.Body><Stack gap={4}>
                <Text>{descripcion}</Text>
                <Text fontSize="sm" color="fg.muted">Esta firma se incorpora únicamente a esta revisión del permiso. Revise los datos del expediente antes de confirmar.</Text>
                <Field.Root><Field.Label htmlFor="permiso-firma-modo">Cómo desea firmar</Field.Label>
                    <NativeSelect.Root disabled={busy || leyendo}><NativeSelect.Field id="permiso-firma-modo" value={modo} onChange={(e) => { revisionImagen.current++; setModo(e.target.value); setImagen(null); setConfirmado(false); setError(""); }}>
                        <option value="dibujar">Dibujar firma</option><option value="cargar">Cargar imagen PNG/JPG</option><option value="vigente" disabled={!vigente}>Seleccionar mi firma vigente</option>
                    </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
                </Field.Root>
                {cargando && <Text fontSize="sm"><Spinner size="xs" mr={2} />Consultando firma vigente…</Text>}
                {modo === "dibujar" && <Box w="full" maxW="450px" alignSelf="center"><FirmaCanvas canvasHeight={540} disabled={busy} onError={setError} onChange={(value) => { setImagen(value?.dataUrl ?? null); setConfirmado(false); }} /></Box>}
                {modo === "cargar" && <Field.Root><Field.Label htmlFor="permiso-firma-archivo">Imagen de su firma</Field.Label><Input id="permiso-firma-archivo" type="file" accept="image/png,image/jpeg" disabled={busy || leyendo} onChange={(e) => { void cargar(e.target.files?.[0]); }} /><Field.HelperText>Original PNG o JPG de hasta 4 MiB; la firma preparada debe ocupar como máximo 1 MiB. También puede usar esta opción con teclado.</Field.HelperText></Field.Root>}
                {leyendo && <Text><Spinner size="xs" mr={2} />Preparando imagen…</Text>}
                {modo !== "dibujar" && (modo === "vigente" ? vigente?.imagenBase64 : imagen) && <Image bg="white" borderWidth="1px" maxH="180px" objectFit="contain" alt="Vista previa de mi firma seleccionada" src={modo === "vigente" ? imagenFirma(vigente!.imagenBase64) : imagen!} />}
                <Checkbox.Root checked={confirmado} disabled={busy || !seleccionValida || leyendo} onCheckedChange={({ checked }) => setConfirmado(checked === true)}>
                    <Checkbox.HiddenInput /><Checkbox.Control /><Checkbox.Label>He revisado esta versión del permiso y confirmo expresamente que deseo firmarla.</Checkbox.Label>
                </Checkbox.Root>
                {error && <Text role="alert" color="fg.error">{error}</Text>}
                {conflicto && <Stack gap={2}><Text fontSize="sm">Recargue y revise el expediente. Si cambiaron sus datos o su jefe, edite y guarde el borrador antes de volver a firmar.</Text><Button variant="outline" disabled={busy} onClick={() => { void onReload(); }}>Cerrar y recargar expediente</Button></Stack>}
            </Stack></Dialog.Body>
            <Dialog.Footer><Button variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button loading={busy} disabled={!seleccionValida || !confirmado || leyendo || busy} onClick={() => { void firmar(); }}>Confirmar firma</Button></Dialog.Footer>
            <Dialog.CloseTrigger asChild><CloseButton size="sm" disabled={busy} /></Dialog.CloseTrigger>
        </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>;
}
