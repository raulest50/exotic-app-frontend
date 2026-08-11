import { useState, useRef } from "react";
import { Steps, Box, Flex, IconButton, Icon, Text, VStack, Separator } from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import { MdAddAPhoto } from "react-icons/md";
import { FaFolderOpen } from "react-icons/fa";
import { FaFileCircleQuestion, FaFileCircleCheck } from "react-icons/fa6";

interface DocSuppUploaderProps {
  /** Allowed file extensions, e.g. {'.pdf': true, '.jpg': true} */
  allowedExtensions: Record<string, boolean>;
  /** Callback that receives the chosen file */
  setFile: (file: File | null) => void;
  /** Optional title for the component */
  title?: string;
  /** Optional description text */
  description?: string;
}

function normalizeExt(ext: string) {
  return ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
}

export function DocSuppUploader({
  allowedExtensions,
  setFile,
  title = "Adjuntar Documento Soporte",
  description = "Seleccione un archivo o tome una foto del documento soporte"
}: DocSuppUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const toast = useAppToast();

  const exts = Object.keys(allowedExtensions)
    .filter((e) => allowedExtensions[e])
    .map((e) => normalizeExt(e));
  const accept = exts.join(",");

  // Validate file type
  const validateFile = (f: File) => {
    const lower = f.name.toLowerCase();
    const valid = exts.some((ext) => lower.endsWith(ext));
    if (!valid) {
      toast({
        title: "Tipo de archivo no permitido",
        description: `Solo se permiten archivos: ${exts.join(", ")}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return false;
    }
    return true;
  };

  // Handles file selection from either input
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        setFile(file);
      } else {
        event.target.value = "";
      }
    }
  };

  // Triggers the file browsing input
  const onClickBrowse = () => {
    fileInputRef.current?.click();
  };

  // Checks for available camera(s) and triggers the camera capture input
  const onClickCamera = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoInputs = devices.filter(
            (device) => device.kind === "videoinput"
          );
          if (videoInputs.length > 0) {
            cameraInputRef.current?.click();
          } else {
            toast({
              title: "No se detectó cámara",
              description: "Su dispositivo no tiene una cámara disponible.",
              status: "warning",
              duration: 3000,
              isClosable: true,
            });
          }
        })
        .catch(() => {
          toast({
            title: "Error al acceder a los dispositivos",
            description: "No se pudo verificar la disponibilidad de la cámara.",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
        });
    } else {
      toast({
        title: "Cámara no soportada",
        description: "La API de cámara no es compatible con su navegador.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <VStack gap={4} align="stretch" w="full">
      {title && <Text fontWeight="bold" fontSize="lg" textAlign="center">{title}</Text>}
      {description && <Text textAlign="center">{description}</Text>}

      <Separator />

      <Flex
        direction="row"
        gap="10em"
        p="1em"
        justifyContent="center"
        w="full"
      >
        <IconButton
          colorPalette="teal"
          aria-label="Buscar Archivo"
          fontSize="5em"
          w="2em"
          h="2em"
          onClick={onClickBrowse}><FaFolderOpen /></IconButton>
        <IconButton
          colorPalette="teal"
          aria-label="Tomar una Foto"
          fontSize="5em"
          w="2em"
          h="2em"
          onClick={onClickCamera}><MdAddAPhoto /></IconButton>
      </Flex>

      <Separator />

      <Flex
        direction="row"
        gap="1em"
        p="1em"
        justifyContent="center"
        w="full"
      >
        <Icon
          as={selectedFile ? FaFileCircleCheck : FaFileCircleQuestion}
          boxSize="4em"
          color={selectedFile ? "green" : "orange.500"}
        />
        <Text>
          {selectedFile
            ? `Archivo seleccionado: ${selectedFile.name}`
            : "Aún no ha subido ningún archivo/foto soporte."}
        </Text>
      </Flex>

      {/* Hidden input for file browsing */}
      <input
        type="file"
        accept={accept}
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {/* Hidden input for camera capture */}
      <input
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        ref={cameraInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </VStack>
  );
}