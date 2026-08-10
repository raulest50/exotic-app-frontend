import { useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  useToast,
  VStack,
} from "@chakra-ui/react";
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
  const toast = useToast();
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
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Detalles del cargo</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text fontSize="2xl" fontWeight="bold">
            {cargo.tituloCargo || "Cargo sin título"}
          </Text>
          <Text color="app.textMuted" mb={4}>
            {cargo.departamento || "Sin departamento"}
          </Text>
          <Text whiteSpace="pre-wrap">{cargo.descripcionCargo || "Sin descripción"}</Text>
          {cargo.usuario && <Text mt={3}>Usuario asignado: {cargo.usuario}</Text>}

          <Divider my={6} />
          <VStack align="stretch" spacing={4}>
            <Text fontSize="xl" fontWeight="bold">
              Manual de funciones
            </Text>
            {cargo.urlDocManualFunciones ? (
              <HStack>
                <Button colorScheme="blue" onClick={() => void onOpenManual(cargo)}>
                  Ver manual actual
                </Button>
                {canEdit && isPersisted && (
                  <Button colorScheme="red" variant="outline" onClick={() => void remove()} isLoading={isLoading}>
                    Quitar
                  </Button>
                )}
              </HStack>
            ) : (
              <Text>No hay un manual disponible para este cargo.</Text>
            )}

            {canEdit && !isPersisted && (
              <Alert status="info">
                <AlertIcon />
                Guarda primero el organigrama para poder asociar un manual a este cargo nuevo.
              </Alert>
            )}

            {canEdit && isPersisted && (
              <Box borderTop="1px solid" borderColor="app.border" pt={4}>
                <FormControl mb={4}>
                  <FormLabel>Subir archivo PDF</FormLabel>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    p={1}
                    isDisabled={isLoading}
                    onChange={(event) => void upload(event.target.files?.[0])}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>O usar una URL HTTP/HTTPS</FormLabel>
                  <HStack>
                    <Input
                      type="url"
                      maxLength={255}
                      placeholder="https://..."
                      value={manualUrl}
                      onChange={(event) => setManualUrl(event.target.value)}
                      isDisabled={isLoading}
                    />
                    <Button
                      colorScheme="blue"
                      onClick={() => void saveUrl()}
                      isDisabled={!manualUrl.trim()}
                      isLoading={isLoading}
                    >
                      Guardar URL
                    </Button>
                  </HStack>
                </FormControl>
                <Text fontSize="sm" color="app.textMuted" mt={3}>
                  El manual se guarda de inmediato y no modifica la revisión ni las coordenadas del organigrama.
                </Text>
              </Box>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
