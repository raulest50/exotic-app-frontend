import { useEffect, useState } from "react";
import { CloseButton, Dialog, Image, Portal, Spinner, Stack, Text } from "@chakra-ui/react";
import { obtenerFirmaVisitante } from "./visitantesApi";

export default function FirmaVisitanteDialog({ id, onClose }: { id: number; onClose: () => void }) {
    const [imagen, setImagen] = useState("");
    const [error, setError] = useState("");
    useEffect(() => {
        const controller = new AbortController();
        let objectUrl = "";
        void obtenerFirmaVisitante(id, controller.signal).then((blob) => {
            if (controller.signal.aborted) return;
            objectUrl = URL.createObjectURL(blob);
            setImagen(objectUrl);
        }).catch(() => {
            if (!controller.signal.aborted) setError("No fue posible consultar la firma de esta visita.");
        });
        return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [id]);
    return <Dialog.Root open onOpenChange={({ open }) => { if (!open) onClose(); }} size="lg">
        <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
            <Dialog.Header><Dialog.Title>Firma del registro de ingreso</Dialog.Title></Dialog.Header>
            <Dialog.Body><Stack gap={3}>
                {!imagen && !error && <Text role="status"><Spinner size="sm" mr={2} />Consultando firma…</Text>}
                {imagen && <Image src={imagen} alt="Firma gráfica aportada para este registro de ingreso" bg="white" w="full" objectFit="contain" />}
                {error && <Text role="alert" color="fg.error">{error}</Text>}
                <Text fontSize="sm" color="fg.muted">Imagen aportada por quien completó el formulario público. No acredita por sí sola su identidad.</Text>
            </Stack></Dialog.Body>
            <Dialog.CloseTrigger asChild><CloseButton aria-label="Cerrar firma" size="sm" /></Dialog.CloseTrigger>
        </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>;
}
