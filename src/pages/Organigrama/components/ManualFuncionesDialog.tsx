import { useEffect, useRef, useState } from "react";
import {
  Steps,
  Alert,
  Box,
  Button,
  HStack,
  Input,
  Text,
  VStack,
  Separator,
  Field,
  Dialog,
  Portal,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import type { Cargo } from "../types";

interface ManualFuncionesDialogProps {
  isOpen: boolean;
  cargo: Cargo;
  canEdit: boolean;
  isPersisted: boolean;
  isLoading: boolean;
  onClose: () => void;
  onOpenManual: (cargo: Cargo) => Promise<boolean>;
  onUpload: (cargoId: string, file: File) => Promise<boolean>;
  onSaveUrl: (cargoId: string, url: string) => Promise<boolean>;
  onRemove: (cargoId: string) => Promise<boolean>;
}

export default function ManualFuncionesDialog({
  isOpen,
  cargo,
  canEdit,
  isPersisted,
  isLoading,
  onClose,
  onOpenManual,
  onUpload,
  onSaveUrl,
  onRemove,
}: ManualFuncionesDialogProps) {
  const toast = useAppToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [manualUrl, setManualUrl] = useState("");

  useEffect(() => {
    setManualUrl(/^https?:\/\//i.test(cargo.urlDocManualFunciones || "") ? cargo.urlDocManualFunciones! : "");
  }, [cargo]);

  const upload = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf") || file.type !== "application/pdf") {
      toast({ title: "Seleccione un archivo PDF válido.", status: "warning", duration: 4000 });
      return;
    }
    if (await onUpload(cargo.idCargo, file)) {
      toast({ title: "Manual actualizado.", status: "success", duration: 3000 });
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const saveUrl = async () => {
    if (await onSaveUrl(cargo.idCargo, manualUrl.trim())) {
      toast({ title: "URL del manual actualizada.", status: "success", duration: 3000 });
    }
  };

  const remove = async () => {
    if (!window.confirm("¿Quitar el manual de funciones de este cargo?")) return;
    if (await onRemove(cargo.idCargo)) {
      setManualUrl("");
      toast({ title: "Manual retirado del cargo.", status: "success", duration: 3000 });
    }
  };

  return (
    <Dialog.Root open={isOpen} size='lg' onOpenChange={e => {
      if (!e.open) {
        onClose();
      }
    }}>
      <Portal>

        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>Detalles del cargo</Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body>
              <Text fontSize="2xl" fontWeight="bold">
                {cargo.tituloCargo || "Cargo sin título"}
              </Text>
              <Text color="app.textMuted" mb={4}>
                {cargo.departamento || "Sin departamento"}
              </Text>
              <Text whiteSpace="pre-wrap">{cargo.descripcionCargo || "Sin descripción"}</Text>
              {cargo.usuario && <Text mt={3}>Usuario asignado: {cargo.usuario}</Text>}

              <Separator my={6} />
              <VStack align="stretch" gap={4}>
                <Text fontSize="xl" fontWeight="bold">
                  Manual de funciones
                </Text>
                {cargo.urlDocManualFunciones ? (
                  <HStack>
                    <Button colorPalette="blue" onClick={() => void onOpenManual(cargo)}>
                      Ver manual actual
                    </Button>
                    {canEdit && isPersisted && (
                      <Button colorPalette="red" variant="outline" onClick={() => void remove()} loading={isLoading}>
                        Quitar
                      </Button>
                    )}
                  </HStack>
                ) : (
                  <Text>No hay un manual disponible para este cargo.</Text>
                )}

                {canEdit && !isPersisted && (
                  <Alert.Root status="info">
                    <Alert.Indicator />
                    Guarda primero el organigrama para poder asociar un manual a este cargo nuevo.
                  </Alert.Root>
                )}

                {canEdit && isPersisted && (
                  <Box borderTop="1px solid" borderColor="app.border" pt={4}>
                    <Field.Root mb={4}>
                      <Field.Label>Subir archivo PDF</Field.Label>
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        p={1}
                        disabled={isLoading}
                        onValueChange={(event) => void upload(event.target.files?.[0])}
                      />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>O usar una URL HTTP/HTTPS</Field.Label>
                      <HStack>
                        <Input
                          type="url"
                          maxLength={255}
                          placeholder="https://..."
                          value={manualUrl}
                          onValueChange={(event) => setManualUrl(event.target.value)}
                          disabled={isLoading}
                        />
                        <Button
                          colorPalette="blue"
                          onClick={() => void saveUrl()}
                          disabled={!manualUrl.trim()}
                          loading={isLoading}
                        >
                          Guardar URL
                        </Button>
                      </HStack>
                    </Field.Root>
                    <Text fontSize="sm" color="app.textMuted" mt={3}>
                      El manual se guarda de inmediato y no modifica la revisión ni las coordenadas del organigrama.
                    </Text>
                  </Box>
                )}
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button onClick={onClose}>Cerrar</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>

      </Portal>
    </Dialog.Root>
  );
}
