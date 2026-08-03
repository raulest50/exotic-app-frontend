import { useState, useEffect } from 'react';
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
  Select,
  NumberInput,
  NumberInputField,
  Stack,
  useToast,
  Flex,
  Heading,
  Divider,
  Box,
  Text,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import axios from 'axios';
import EndPointsURL from '../../../../api/EndPointsURL.tsx';
import { ProcesoProduccionEntity, TimeModelType, RecursoProduccion } from '../../types.tsx';
import CustomDecimalInput from '../../../../components/CustomDecimalInput/CustomDecimalInput.tsx';
import ProcesoDocumentosSection from './ProcesoDocumentosSection.tsx';

interface EditarProcesoModalProps {
  isOpen: boolean;
  onClose: () => void;
  proceso: ProcesoProduccionEntity | null;
  onSave: (procesoActualizado: ProcesoProduccionEntity) => void;
}

export function EditarProcesoModal({ isOpen, onClose, proceso, onSave }: EditarProcesoModalProps) {
  const [procesoEditado, setProcesoEditado] = useState<ProcesoProduccionEntity | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDeletable, setIsDeletable] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [randomToken, setRandomToken] = useState('');
  const [inputToken, setInputToken] = useState('');
  const [showDeleteSection, setShowDeleteSection] = useState(false);

  const toast = useToast();
  const endPoints = new EndPointsURL();

  // Inicializar el estado cuando se abre el modal con un proceso
  useEffect(() => {
    if (proceso) {
      setProcesoEditado({ ...proceso });
      checkIfDeletable(proceso.procesoId);
      // Generate a random 4-digit token
      const token = Math.floor(1000 + Math.random() * 9000).toString();
      setRandomToken(token);
      setInputToken('');
      setShowDeleteSection(false);
    }
  }, [proceso]);

  // Check if the process is deletable
  const checkIfDeletable = async (procesoId: number | undefined) => {
    if (!procesoId) return;

    try {
      const url = endPoints.is_deletable_proceso_produccion.replace('{id}', procesoId.toString());
      const response = await axios.get(url);

      // The backend returns an object with a property indicating if it's deletable
      setIsDeletable(response.data.deletable === true);
    } catch (error) {
      console.error("Error checking if process is deletable:", error);
      setIsDeletable(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!procesoEditado) return;

    const { name, value } = e.target;
    setProcesoEditado({
      ...procesoEditado,
      [name]: value
    });
  };

  const handleNumberChange = (name: string, value: number) => {
    if (!procesoEditado) return;

    setProcesoEditado({
      ...procesoEditado,
      [name]: value
    });
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!procesoEditado) return;

    const model = e.target.value as TimeModelType;
    setProcesoEditado({
      ...procesoEditado,
      model
    });
  };

  const handleSubmit = async () => {
    if (!procesoEditado || !procesoEditado.procesoId) return;

    setLoading(true);
    try {
      const url = endPoints.update_proceso_produccion.replace('{id}', procesoEditado.procesoId.toString());
      const response = await axios.put(url, procesoEditado);

      toast({
        title: 'Proceso actualizado',
        description: 'El proceso se ha actualizado correctamente',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      onSave(response.data);
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el proceso',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!procesoEditado || !procesoEditado.procesoId) return;

    // Verify token
    if (inputToken !== randomToken) {
      toast({
        title: 'Token incorrecto',
        description: 'El token ingresado no coincide con el token de confirmación',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setDeleteLoading(true);
    try {
      const url = endPoints.delete_proceso_produccion.replace('{id}', procesoEditado.procesoId.toString());
      await axios.delete(url);

      toast({
        title: 'Proceso eliminado',
        description: 'El proceso ha sido eliminado correctamente',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Close the modal and refresh the list
      onClose();
      // Pass an empty object with the same ID to indicate deletion
      onSave({ ...procesoEditado, deleted: true } as ProcesoProduccionEntity);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el proceso',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleDeleteSection = () => {
    setShowDeleteSection(!showDeleteSection);
  };

  if (!procesoEditado) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Editar Proceso de Producción</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={6}>
            {/* Sección: Información General */}
            <Box>
              <Heading size="sm" mb={3}>Información General</Heading>
              <Divider mb={4} />
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Nombre</FormLabel>
                  <Input 
                    name="nombre" 
                    value={procesoEditado.nombre} 
                    onChange={handleChange} 
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Nivel de Acceso</FormLabel>
                  <NumberInput 
                    min={0} 
                    max={10}
                    value={procesoEditado.nivelAcceso || 0}
                    onChange={(_, value) => handleNumberChange('nivelAcceso', value)}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Tiempo de Preparación (Setup Time) en segundos</FormLabel>
                  <NumberInput 
                    min={0}
                    value={procesoEditado.setUpTime}
                    onChange={(_, value) => handleNumberChange('setUpTime', value)}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
              </Stack>
            </Box>

            {/* Sección: Modelo de Tiempo */}
            <Box>
              <Heading size="sm" mb={3}>Modelo de Tiempo</Heading>
              <Divider mb={4} />
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Modelo de Tiempo</FormLabel>
                  <Select 
                    name="model" 
                    value={procesoEditado.model} 
                    onChange={handleModelChange}
                  >
                    <option value={TimeModelType.CONSTANT}>Constante</option>
                    <option value={TimeModelType.THROUGHPUT_RATE}>Tasa</option>
                    <option value={TimeModelType.PER_UNIT}>Por Unidad</option>
                    <option value={TimeModelType.PER_BATCH}>Por Lote</option>
                  </Select>
                </FormControl>

                {procesoEditado.model === TimeModelType.CONSTANT && (
                  <FormControl isRequired>
                    <FormLabel>Tiempo Constante (segundos)</FormLabel>
                    <NumberInput 
                      min={0}
                      value={procesoEditado.constantSeconds || 0}
                      onChange={(_, value) => handleNumberChange('constantSeconds', value)}
                    >
                      <NumberInputField />
                    </NumberInput>
                  </FormControl>
                )}

                {procesoEditado.model === TimeModelType.THROUGHPUT_RATE && (
                  <FormControl isRequired>
                    <FormLabel>Tasa de Producción (unidades/segundo)</FormLabel>
                    <CustomDecimalInput
                      min={0}
                      maxDecimals={2}
                      value={procesoEditado.throughputUnitsPerSec || 0}
                      onChange={(value) => handleNumberChange('throughputUnitsPerSec', value)}
                    />
                  </FormControl>
                )}

                {procesoEditado.model === TimeModelType.PER_UNIT && (
                  <FormControl isRequired>
                    <FormLabel>Segundos por Unidad</FormLabel>
                    <NumberInput 
                      min={0}
                      value={procesoEditado.secondsPerUnit || 0}
                      onChange={(_, value) => handleNumberChange('secondsPerUnit', value)}
                    >
                      <NumberInputField />
                    </NumberInput>
                  </FormControl>
                )}

                {procesoEditado.model === TimeModelType.PER_BATCH && (
                  <>
                    <FormControl isRequired>
                      <FormLabel>Segundos por Lote</FormLabel>
                      <NumberInput 
                        min={0}
                        value={procesoEditado.secondsPerBatch || 0}
                        onChange={(_, value) => handleNumberChange('secondsPerBatch', value)}
                      >
                        <NumberInputField />
                      </NumberInput>
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel>Tamaño del Lote</FormLabel>
                      <NumberInput 
                        min={1}
                        value={procesoEditado.batchSize || 1}
                        onChange={(_, value) => handleNumberChange('batchSize', value)}
                      >
                        <NumberInputField />
                      </NumberInput>
                    </FormControl>
                  </>
                )}
              </Stack>
            </Box>

            {/* Sección: Recursos */}
            <Box>
              <Heading size="sm" mb={3}>Recursos</Heading>
              <Divider mb={4} />
              <Flex direction="column" gap={4}>
                {/* Aquí iría la gestión de recursos requeridos */}
                <Button colorScheme="teal" size="sm">
                  Agregar Recurso
                </Button>
              </Flex>
            </Box>

            <Divider />
            {procesoEditado.procesoId ? (
              <ProcesoDocumentosSection
                procesoId={procesoEditado.procesoId}
                isOpen={isOpen}
                onDocumentVersionCreated={() => {
                  setIsDeletable(false);
                  setShowDeleteSection(false);
                }}
              />
            ) : null}

            {/* Sección: Eliminar Proceso (solo visible si es eliminable) */}
            {isDeletable && (
              <Box>
                <Heading size="sm" mb={3} color="red.500">Eliminar Proceso</Heading>
                <Divider mb={4} />

                {!showDeleteSection ? (
                  <Button 
                    colorScheme="red" 
                    size="sm" 
                    onClick={toggleDeleteSection}
                  >
                    Mostrar Opciones de Eliminación
                  </Button>
                ) : (
                  <Stack spacing={4}>
                    <Alert status="warning">
                      <AlertIcon />
                      Esta acción no se puede deshacer. El proceso será eliminado permanentemente.
                    </Alert>

                    <Text fontWeight="bold">Token de confirmación: {randomToken}</Text>

                    <FormControl>
                      <FormLabel>Ingrese el token de confirmación:</FormLabel>
                      <Input 
                        value={inputToken}
                        onChange={(e) => setInputToken(e.target.value)}
                        placeholder="Ingrese el token de 4 dígitos"
                      />
                    </FormControl>

                    <Flex justify="space-between">
                      <Button 
                        colorScheme="gray" 
                        onClick={toggleDeleteSection}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        colorScheme="red" 
                        onClick={handleDelete}
                        isLoading={deleteLoading}
                        loadingText="Eliminando..."
                      >
                        Eliminar Proceso
                      </Button>
                    </Flex>
                  </Stack>
                )}
              </Box>
            )}
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button mr={3} onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            colorScheme="blue" 
            onClick={handleSubmit}
            isLoading={loading}
          >
            Guardar Cambios
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
