import { Button, Dialog, Portal, Stack, Text } from "@chakra-ui/react";
import type { SavedProductSummary } from "./ProcessDesignerApi.ts";

export default function OperationResultDialog({ result, onClose }: {
    result: SavedProductSummary; onClose: () => void;
}) {
    return <Dialog.Root open placement="center" closeOnInteractOutside={false} onOpenChange={({ open }) => { if (!open) onClose(); }}>
        <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content mx="4" maxW="lg">
            <Dialog.Header><Dialog.Title>Producto guardado</Dialog.Title></Dialog.Header>
            <Dialog.Body>
                <Stack gap="3">
                    <Dialog.Description>El producto y su receta se registraron correctamente.</Dialog.Description>
                    <Text fontWeight="semibold" overflowWrap="anywhere">{result.id} · {result.name}</Text>
                    <Text>{result.kind === "S" ? "Semiterminado" : "Terminado"}</Text>
                    <Text>Salida de la receta: {result.quantity} {result.unit}</Text>
                </Stack>
            </Dialog.Body>
            <Dialog.Footer><Button colorPalette="teal" onClick={onClose}>Aceptar</Button></Dialog.Footer>
        </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>;
}
