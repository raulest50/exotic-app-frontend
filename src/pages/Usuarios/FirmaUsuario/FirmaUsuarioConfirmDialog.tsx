import {
    Button,
    CloseButton,
    Dialog,
    Field,
    HStack,
    Portal,
    Text,
    Textarea,
} from "@chakra-ui/react";

interface FirmaUsuarioConfirmDialogProps {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    colorPalette?: "blue" | "red";
    busy?: boolean;
    reason?: string;
    reasonLabel?: string;
    requireReason?: boolean;
    onReasonChange?: (value: string) => void;
    onCancel: () => void;
    onConfirm: () => void;
}

export default function FirmaUsuarioConfirmDialog({
    open,
    title,
    description,
    confirmLabel,
    colorPalette = "blue",
    busy = false,
    reason = "",
    reasonLabel = "Motivo",
    requireReason = false,
    onReasonChange,
    onCancel,
    onConfirm,
}: FirmaUsuarioConfirmDialogProps) {
    return (
        <Dialog.Root open={open} placement="center" onOpenChange={(event) => {
            if (!event.open && !busy) onCancel();
        }}>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content maxW="md">
                        <Dialog.Header>
                            <Dialog.Title>{title}</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton aria-label="Cerrar" size="sm" disabled={busy} />
                        </Dialog.CloseTrigger>
                        <Dialog.Body>
                            <Text mb={requireReason ? 4 : 0}>{description}</Text>
                            {requireReason ? (
                                <Field.Root required>
                                    <Field.Label>{reasonLabel}</Field.Label>
                                    <Textarea
                                        value={reason}
                                        onChange={(event) => onReasonChange?.(event.target.value)}
                                        minH="90px"
                                        disabled={busy}
                                    />
                                </Field.Root>
                            ) : null}
                        </Dialog.Body>
                        <Dialog.Footer>
                            <HStack>
                                <Button variant="outline" onClick={onCancel} disabled={busy}>
                                    Cancelar
                                </Button>
                                <Button
                                    colorPalette={colorPalette}
                                    onClick={onConfirm}
                                    loading={busy}
                                    disabled={requireReason && !reason.trim()}
                                >
                                    {confirmLabel}
                                </Button>
                            </HStack>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
