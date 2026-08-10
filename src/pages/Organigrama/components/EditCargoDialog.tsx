import { useEffect, useMemo, useState } from "react";
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
  Text,
  Textarea,
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
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Editar cargo</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl mb={4}>
            <FormLabel>ID del cargo</FormLabel>
            <Text fontSize="sm" wordBreak="break-all">
              {draft.idCargo}
            </Text>
          </FormControl>

          <FormControl mb={4} isRequired>
            <FormLabel>Título del cargo</FormLabel>
            <Input
              maxLength={255}
              value={draft.tituloCargo}
              onChange={(event) => setDraft({ ...draft, tituloCargo: event.target.value })}
            />
          </FormControl>

          <FormControl mb={4} isRequired>
            <FormLabel>Departamento</FormLabel>
            <Input
              maxLength={255}
              value={draft.departamento}
              onChange={(event) => setDraft({ ...draft, departamento: event.target.value })}
            />
          </FormControl>

          <FormControl mb={4} isRequired>
            <FormLabel>Descripción</FormLabel>
            <Textarea
              maxLength={255}
              value={draft.descripcionCargo}
              onChange={(event) =>
                setDraft({ ...draft, descripcionCargo: event.target.value })
              }
            />
          </FormControl>

          <FormControl mb={4} isRequired>
            <FormLabel>Nivel jerárquico</FormLabel>
            <NumberInput
              min={1}
              max={10}
              value={draft.nivel}
              onChange={(_, value) =>
                setDraft({ ...draft, nivel: Number.isNaN(value) ? 1 : value })
              }
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>

          <FormControl mb={4}>
            <FormLabel>Usuario</FormLabel>
            <Select
              value={draft.usuario || ""}
              onChange={(event) =>
                setDraft({ ...draft, usuario: event.target.value || undefined })
              }
              placeholder="Sin usuario asignado"
            >
              {availableUsers.map((user) => (
                <option key={user.id} value={user.username}>
                  {user.nombreCompleto || user.username}
                </option>
              ))}
            </Select>
          </FormControl>

          <Text fontSize="sm" color="app.textMuted">
            Estos cambios permanecerán en el borrador hasta guardar el organigrama.
          </Text>
        </ModalBody>

        <ModalFooter justifyContent="space-between">
          <Button colorScheme="red" variant="outline" onClick={onDelete}>
            Eliminar cargo
          </Button>
          <div>
            <Button mr={3} variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button colorScheme="blue" isDisabled={!isValid} onClick={() => onSave(draft)}>
              Aplicar al borrador
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
