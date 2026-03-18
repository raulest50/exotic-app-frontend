// src/components/UserFullRoleCRUD.tsx
import { useState } from 'react';
import {
    Box,
} from '@chakra-ui/react';
import CreateUser from "./CreateUser.tsx";
import UserViewer from "./UserViewer.tsx";
import EditarUsuario from "./EditarUsuario.tsx";
import { User } from './types.tsx';

export default function UserFullRoleCRUD() {

    const VIEW_MODES = { USER_VIEWER: 0, CREATE_USER: 1, EDIT_USER: 2 };
    const [viewMode, setViewMode] = useState(VIEW_MODES.USER_VIEWER);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    function ConditionalRender() {
        if (viewMode === VIEW_MODES.USER_VIEWER) {
            return (
                <UserViewer
                    setViewMode={setViewMode}
                    onEditUser={(user) => {
                        setEditingUser(user);
                        setViewMode(VIEW_MODES.EDIT_USER);
                    }}
                />
            );
        } else if (viewMode === VIEW_MODES.EDIT_USER && editingUser) {
            return (
                <EditarUsuario
                    user={editingUser}
                    onBack={() => setViewMode(VIEW_MODES.USER_VIEWER)}
                />
            );
        } else {
            return (
                <CreateUser
                    onCancel={() => setViewMode(VIEW_MODES.USER_VIEWER)}
                    onUserCreated={() => {
                        setViewMode(VIEW_MODES.USER_VIEWER);
                    }}
                />
            );
        }
    }

    return (
        <Box p={4} flex={1} h={"inherit"}>
            <ConditionalRender />
        </Box>
    );
}
