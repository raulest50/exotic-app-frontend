import { Button, CloseButton, Dialog, Portal } from "@chakra-ui/react";

import PlanVersionDetailContent from "./PlanVersionDetailContent";
import type { PlanControl, VersionPlanControl } from "./types";

interface Props {
    plan?: Omit<PlanControl, "versiones">;
    version?: VersionPlanControl;
    onClose: () => void;
    finalFocusEl: () => HTMLElement | null;
}

export default function PlanVersionDetailDialog({ plan, version, onClose, finalFocusEl }: Props) {
    return (
        <Dialog.Root open={Boolean(plan && version)} onOpenChange={({ open }) => !open && onClose()} size="xl" scrollBehavior="inside" finalFocusEl={finalFocusEl}>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>
                            <Dialog.Title>{plan?.codigo} · versión {version?.numero}</Dialog.Title>
                            <Dialog.Description>Configuración de la versión seleccionada · solo lectura</Dialog.Description>
                        </Dialog.Header>
                        <Dialog.CloseTrigger asChild><CloseButton size="sm" aria-label="Cerrar detalle" /></Dialog.CloseTrigger>
                        <Dialog.Body>
                            {plan && version && <PlanVersionDetailContent plan={plan} version={version} />}
                        </Dialog.Body>
                        <Dialog.Footer><Dialog.CloseTrigger asChild><Button variant="outline">Cerrar</Button></Dialog.CloseTrigger></Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
