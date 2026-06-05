import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  VStack,
  Icon,
  useToast,
  Text,
  Box,
  Link,
  HStack,
  useColorModeValue,
} from "@chakra-ui/react";
import { useState, useEffect, useRef } from "react";
import { Cargo, AccessLevel } from "../types";
import { FaFileCircleQuestion, FaFileCircleCheck } from "react-icons/fa6";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL.tsx";

interface User {
  id: number;
  username: string;
  nombreCompleto?: string;
}

interface EditPositionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cargo: Cargo;
  onSave: (updatedCargo: Cargo) => void;
  assignedUsers?: string[]; // Lista de usuarios ya asignados a otros cargos
  mode?: 'edit' | 'view'; // Modo de visualización o edición
  accessLevel?: AccessLevel; // Nivel de acceso del usuario
  isMaster?: boolean; // Si el usuario es master
}

export default function EditCargoDialog({
  isOpen,
  onClose,
  cargo,
  onSave,
  assignedUsers = [],
  mode = 'edit', // Por defecto, modo de edición
  accessLevel = AccessLevel.VIEW,
  isMaster = false,
}: EditPositionDialogProps) {
  const toast = useToast();
  const [localCargo, setLocalCargo] = useState<Cargo>(cargo);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isEditingManual, setIsEditingManual] = useState(false);
  const [manualUrl, setManualUrl] = useState<string>("");
  const manualInputRef = useRef<HTMLInputElement>(null);
  const endPoints = new EndPointsURL();
  const assignedUserColor = useColorModeValue("blue.600", "blue.200");

  // Estado para controlar si el formulario es válido
  const [isFormValid, setIsFormValid] = useState<boolean>(false);

  // Cargar los datos del cargo
  useEffect(() => {
    setLocalCargo(cargo);
    setManualUrl(cargo.urlDocManualFunciones || "");
  }, [cargo]);

  // Función para validar los datos del cargo
  const validarCargoData = (cargo: Cargo): boolean => {
    // Verificar que todos los campos obligatorios estén presentes
    return !!(
      cargo.idCargo && 
      cargo.tituloCargo && 
      cargo.tituloCargo.trim() !== "" && 
      cargo.departamento && 
      cargo.departamento.trim() !== "" && 
      cargo.descripcionCargo && 
      cargo.descripcionCargo.trim() !== "" &&
      cargo.nivel
    );
  };

  // Efecto para validar el formulario cuando cambian los datos
  useEffect(() => {
    setIsFormValid(validarCargoData(localCargo));
  }, [localCargo]);

  // Cargar la lista de usuarios (solo en modo edición)
  useEffect(() => {
    if (mode !== 'edit') return;

    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const response = await axios.get(endPoints.get_all_users);
        // Filtrar el usuario "master" y los usuarios ya asignados
        const filteredUsers = response.data.filter(
          (user: User) => 
            user.username !== 'master' && 
            !assignedUsers.includes(user.username) || 
            (localCargo.usuario && user.username === localCargo.usuario)
        );
        setUsers(filteredUsers);
      } catch (error) {
        console.error("Error al cargar los usuarios:", error);
        toast({
          title: "Error al cargar los usuarios",
          status: "error",
          duration: 3000,
        });
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [endPoints.get_all_users, assignedUsers, localCargo.usuario, toast, mode]);

  // Manejar la selección de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        toast({
          title: "Tipo de archivo no permitido",
          description: "Solo se permiten archivos PDF para el manual de funciones.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        e.target.value = "";
        return;
      }
      setLocalCargo({ ...localCargo, manualFuncionesFile: file });
    }
  };

  // Guardar la URL del manual de funciones
  const handleSaveManual = async () => {
    if (mode === 'edit') {
      // En modo edición, actualizar el cargo local y continuar con el flujo normal
      setLocalCargo({ ...localCargo, urlDocManualFunciones: manualUrl });
      setIsEditingManual(false);
      return;
    }

    // En modo visualización, guardar directamente la URL
    try {
      // Verificar si el usuario tiene permisos de edición
      if (accessLevel !== AccessLevel.EDIT && !isMaster) {
        toast({
          title: "Acceso denegado",
          description: "No tienes permisos para editar el manual de funciones",
          status: "warning",
          duration: 5000,
        });
        return;
      }

      // Actualizar el cargo con la nueva URL
      const updatedCargo = { ...localCargo, urlDocManualFunciones: manualUrl };

      // Crear un FormData para enviar el cargo
      const formData = new FormData();
      formData.append('cargo', JSON.stringify(updatedCargo));

      // Usar axios para actualizar el cargo con el endpoint correcto
      const response = await axios.post(
        endPoints.save_cargo_with_manual,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setLocalCargo(response.data);
      setIsEditingManual(false);

      toast({
        title: "URL del manual de funciones actualizada correctamente",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error al actualizar la URL del manual de funciones:", error);
      toast({
        title: "Error al actualizar la URL del manual de funciones",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleSave = () => {
    // Si estamos editando el manual, guardar primero esos cambios
    if (isEditingManual) {
      setLocalCargo({ ...localCargo, urlDocManualFunciones: manualUrl });
    }

    onSave(localCargo);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={mode === 'view' ? "lg" : "md"}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{mode === 'edit' ? "Editar Cargo" : "Detalles del Cargo"}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {mode === 'edit' ? (
            // Modo de edición - Formulario completo
            <>
              <FormControl mb={4}>
                <FormLabel>ID del Cargo</FormLabel>
                <Text>{localCargo.idCargo}</Text>
              </FormControl>

              <FormControl mb={4} isRequired>
                <FormLabel>Título del Cargo</FormLabel>
                <Input
                  value={localCargo.tituloCargo}
                  onChange={(e) =>
                    setLocalCargo({ ...localCargo, tituloCargo: e.target.value })
                  }
                />
              </FormControl>

              <FormControl mb={4} isRequired>
                <FormLabel>Departamento</FormLabel>
                <Input
                  value={localCargo.departamento}
                  onChange={(e) =>
                    setLocalCargo({ ...localCargo, departamento: e.target.value })
                  }
                />
              </FormControl>

              <FormControl mb={4} isRequired>
                <FormLabel>Descripción</FormLabel>
                <Textarea
                  value={localCargo.descripcionCargo}
                  onChange={(e) =>
                    setLocalCargo({ ...localCargo, descripcionCargo: e.target.value })
                  }
                  placeholder="Descripción breve del cargo"
                />
              </FormControl>

              <FormControl mb={4} isRequired>
                <FormLabel>Nivel Jerárquico</FormLabel>
                <NumberInput
                  min={1}
                  max={10}
                  value={localCargo.nivel}
                  contentEditable={false}
                  onChange={(valueString) =>
                    setLocalCargo({ ...localCargo, nivel: parseInt(valueString) })
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
                  value={localCargo.usuario || ""}
                  onChange={(e) =>
                    setLocalCargo({ ...localCargo, usuario: e.target.value })
                  }
                  placeholder="Seleccione un usuario"
                  isDisabled={isLoadingUsers}
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.username}>
                      {user.nombreCompleto || user.username}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl mb={4}>
                <FormLabel>Manual de Funciones</FormLabel>
                <VStack spacing={4} align="stretch" alignItems="center">
                  <Icon
                    as={localCargo.manualFuncionesFile || localCargo.urlDocManualFunciones ? FaFileCircleCheck : FaFileCircleQuestion}
                    boxSize="4em"
                    color={localCargo.manualFuncionesFile || localCargo.urlDocManualFunciones ? "green" : "orange.500"}
                  />
                  <Button onClick={() => manualInputRef.current?.click()}>Seleccionar Archivo</Button>
                  <Input
                    type="file"
                    ref={manualInputRef}
                    style={{ display: 'none' }}
                    accept="application/pdf"
                    onChange={handleFileChange}
                  />
                  {isEditingManual ? (
                    <FormControl>
                      <FormLabel>URL del Manual</FormLabel>
                      <Input
                        value={manualUrl}
                        onChange={(e) => setManualUrl(e.target.value)}
                        placeholder="URL del manual de funciones"
                      />
                      <HStack mt={2}>
                        <Button size="sm" colorScheme="green" onClick={() => {
                          setLocalCargo({ ...localCargo, urlDocManualFunciones: manualUrl });
                          setIsEditingManual(false);
                        }}>
                          Guardar URL
                        </Button>
                        <Button size="sm" colorScheme="red" onClick={() => {
                          setManualUrl(localCargo.urlDocManualFunciones || "");
                          setIsEditingManual(false);
                        }}>
                          Cancelar
                        </Button>
                      </HStack>
                    </FormControl>
                  ) : (
                    <>
                      {localCargo.urlDocManualFunciones && (
                        <Box>
                          <Link href={localCargo.urlDocManualFunciones} isExternal color="blue.500">
                            Ver Manual Actual <ExternalLinkIcon mx="2px" />
                          </Link>
                          <Button 
                            size="sm" 
                            mt={2} 
                            onClick={() => {
                              setManualUrl(localCargo.urlDocManualFunciones || "");
                              setIsEditingManual(true);
                            }}
                          >
                            Editar URL
                          </Button>
                        </Box>
                      )}
                    </>
                  )}
                </VStack>
              </FormControl>
            </>
          ) : (
            // Modo de visualización - Detalles del cargo
            <>
              <Text fontSize="2xl" fontWeight="bold" mb={2}>
                {localCargo.tituloCargo}
              </Text>

              <Text fontSize="lg" color="app.textMuted" mb={4}>
                Departamento: {localCargo.departamento}
              </Text>

              <Text mb={6}>{localCargo.descripcionCargo}</Text>

              {localCargo.usuario && (
                <Text fontSize="sm" color={assignedUserColor} mb={4}>
                  Usuario asignado: {localCargo.usuario}
                </Text>
              )}

              <Box mt={6} pt={4} borderTop="1px solid" borderColor="app.border">
                <Text fontSize="xl" fontWeight="bold" mb={4}>
                  Manual de Funciones
                </Text>

                {isEditingManual ? (
                  <VStack spacing={4} align="stretch">
                    <FormControl>
                      <FormLabel fontWeight="bold">URL del Manual de Funciones (PDF)</FormLabel>
                      <Input
                        value={manualUrl}
                        onChange={(e) => setManualUrl(e.target.value)}
                        placeholder="Ingrese la URL del documento PDF con el manual de funciones"
                      />
                    </FormControl>
                    <Text fontSize="sm" color="app.textSubtle">
                      Ingrese la URL completa del documento PDF que contiene el manual de funciones aprobado para este cargo.
                    </Text>
                    <HStack>
                      <Button colorScheme="green" onClick={handleSaveManual}>
                        Guardar URL
                      </Button>
                      <Button 
                        colorScheme="red" 
                        onClick={() => {
                          setManualUrl(localCargo.urlDocManualFunciones || "");
                          setIsEditingManual(false);
                        }}
                      >
                        Cancelar
                      </Button>
                    </HStack>
                  </VStack>
                ) : (
                  <VStack spacing={4} align="stretch">
                    {localCargo.urlDocManualFunciones ? (
                      <Box>
                        <Link href={localCargo.urlDocManualFunciones} isExternal color="blue.500">
                          Ver Manual de Funciones (PDF) <ExternalLinkIcon mx="2px" />
                        </Link>
                        <Text fontSize="sm" color="app.textSubtle" mt={2}>
                          Haga clic en el enlace para ver o descargar el manual de funciones completo.
                        </Text>
                      </Box>
                    ) : (
                      <Text>No hay un manual de funciones disponible para este cargo.</Text>
                    )}
                  </VStack>
                )}
              </Box>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          {mode === 'edit' ? (
            // Botones para modo de edición
            <>
              <Button 
                colorScheme="blue" 
                mr={3} 
                onClick={handleSave}
                isDisabled={!isFormValid}
              >
                Guardar
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
            </>
          ) : (
            // Botones para modo de visualización
            <>
              <Button variant="ghost" onClick={onClose}>
                Cerrar
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
