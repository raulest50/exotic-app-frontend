// src/components/RoleSelectionDialog.tsx
import React from 'react';
import { Steps, List, Dialog, Portal } from '@chakra-ui/react';
import { LuCheckCircle } from 'react-icons/lu';

export type RoleItem = {
    id: number;
    name: string;
};

interface RoleSelectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    availableRoles: RoleItem[];
    onRoleSelect: (role: RoleItem) => void;
}

const RoleSelectionDialog: React.FC<RoleSelectionDialogProps> = ({
                                                                     isOpen,
                                                                     onClose,
                                                                     availableRoles,
                                                                     onRoleSelect,
                                                                 }) => {
    return (
        <Dialog.Root open={isOpen} onOpenChange={e => {
            if (!e.open) {
                onClose();
            }
        }}>
            <Portal>

                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content>
                        <Dialog.Header>Seleccionar Rol</Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body>
                            <List.Root gap={3}>
                                {availableRoles && availableRoles.length > 0 ? (
                                    availableRoles.map((role) => (
                                        <List.Item
                                            key={role.id}
                                            onClick={() => {
                                                onRoleSelect(role);
                                                onClose();
                                            }}
                                            _hover={{
                                                cursor: 'pointer',
                                                bg: 'gray.100',
                                            }}
                                            padding="2"
                                        >
                                            <List.Indicator color="green.500" asChild><LuCheckCircle /></List.Indicator>
                                            {role.name}
                                        </List.Item>
                                    ))
                                ) : (
                                    <List.Item padding="2">
                                        No hay roles disponibles para asignar
                                    </List.Item>
                                )}
                            </List.Root>
                        </Dialog.Body>
                    </Dialog.Content>
                </Dialog.Positioner>

            </Portal>
        </Dialog.Root>
    );
};

export default RoleSelectionDialog;
