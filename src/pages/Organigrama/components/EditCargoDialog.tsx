import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Input,
  NumberInput,
  NativeSelect,
  Text,
  Textarea,
  Field,
  Dialog,
  Portal,
} from "@chakra-ui/react";
import type { Cargo, OrganigramaUser } from "../types";

interface EditCargoDialogProps {
  isOpen: boolean;
  cargo: Cargo;
  users: OrganigramaUser[];
  assignedUsers: string[];
  onClose: () => void;
  onSave: (cargo: Cargo) => void;
  onDelete: () => void;
}

export default function EditCargoDialog({
  isOpen,
  cargo,
  users,
  assignedUsers,
  onClose,
  onSave,
  onDelete,
}: EditCargoDialogProps) {
  const [draft, setDraft] = useState<Cargo>(cargo);

  useEffect(() => setDraft(cargo), [cargo]);

  const availableUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.username === draft.usuario || !assignedUsers.includes(user.username),
      ),
    [assignedUsers, draft.usuario, users],
  );

  const isValid = Boolean(
    draft.tituloCargo.trim() &&
      draft.departamento.trim() &&
      draft.descripcionCargo.trim() &&
      Number.isInteger(draft.nivel) &&
      draft.nivel >= 1 &&
      draft.nivel <= 10,
  );

  return (
    <Dialog.Root open={isOpen} size='md' onOpenChange={e => {
      if (!e.open) {
        onClose();
      }
    }}>
      <Portal>

        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header><Dialog.Title>Editar cargo</Dialog.Title></Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body>
              <Field.Root mb={4}>
                <Field.Label>ID del cargo</Field.Label>
                <Text fontSize="sm" wordBreak="break-all">
                  {draft.idCargo}
                </Text>
              </Field.Root>

              <Field.Root mb={4} required>
                <Field.Label>Título del cargo</Field.Label>
                <Input
                  maxLength={255}
                  value={draft.tituloCargo}
                  onChange={(event) => setDraft({ ...draft, tituloCargo: event.target.value })}
                />
              </Field.Root>

              <Field.Root mb={4} required>
                <Field.Label>Departamento</Field.Label>
                <Input
                  maxLength={255}
                  value={draft.departamento}
                  onChange={(event) => setDraft({ ...draft, departamento: event.target.value })}
                />
              </Field.Root>

              <Field.Root mb={4} required>
                <Field.Label>Descripción</Field.Label>
                <Textarea
                  maxLength={255}
                  value={draft.descripcionCargo}
                  onChange={(event) =>
                    setDraft({ ...draft, descripcionCargo: event.target.value })
                  }
                />
              </Field.Root>

              <Field.Root mb={4} required>
                <Field.Label>Nivel jerárquico</Field.Label>
                <NumberInput.Root
                  min={1}
                  max={10}
                  value={String(draft.nivel)}
                  onValueChange={({ valueAsNumber }) =>
                    setDraft({ ...draft, nivel: Number.isNaN(valueAsNumber) ? 1 : valueAsNumber })
                  }
                >
                  <NumberInput.Input />
                  <NumberInput.Control>
                    <NumberInput.IncrementTrigger />
                    <NumberInput.DecrementTrigger />
                  </NumberInput.Control>
                </NumberInput.Root>
              </Field.Root>

              <Field.Root mb={4}>
                <Field.Label>Usuario</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={draft.usuario || ""}
                    onChange={(event) =>
                      setDraft({ ...draft, usuario: event.target.value || undefined })
                    }
                    placeholder="Sin usuario asignado">
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.username}>
                        {user.nombreCompleto || user.username}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>

              <Text fontSize="sm" color="app.textMuted">
                Estos cambios permanecerán en el borrador hasta guardar el organigrama.
              </Text>
            </Dialog.Body>

            <Dialog.Footer justifyContent="space-between">
              <Button colorPalette="red" variant="outline" onClick={onDelete}>
                Eliminar cargo
              </Button>
              <div>
                <Button mr={3} variant="ghost" onClick={onClose}>
                  Cancelar
                </Button>
                <Button colorPalette="blue" disabled={!isValid} onClick={() => onSave(draft)}>
                  Aplicar al borrador
                </Button>
              </div>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>

      </Portal>
    </Dialog.Root>
  );
}
