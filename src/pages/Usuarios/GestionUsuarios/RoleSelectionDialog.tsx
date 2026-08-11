// src/components/RoleSelectionDialog.tsx
import React from 'react';
import { CloseButton, List, Dialog, Portal } from '@chakra-ui/react';
import { LuCircleCheck } from 'react-icons/lu';

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
                    <Dialog.Content maxW="md">
                        <Dialog.Header>
                            <Dialog.Title>Seleccionar Rol</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.CloseTrigger asChild>
                            <CloseButton size="sm" position="absolute" top="2" right="2" />
                        </Dialog.CloseTrigger>
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
                                            <List.Indicator color="green.500" asChild><LuCircleCheck /></List.Indicator>
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
