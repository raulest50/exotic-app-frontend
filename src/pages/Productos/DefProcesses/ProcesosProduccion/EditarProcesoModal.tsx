import { useState, useEffect } from 'react';
import {
  Steps,
  Button,
  Input,
  NativeSelect,
  NumberInput,
  NumberInputField,
  Stack,
  Flex,
  Heading,
  Box,
  Text,
  Alert,
  Separator,
  Field,
  Dialog,
  Portal,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
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

  const toast = useAppToast();
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
    <Dialog.Root open={isOpen} size='xl' onOpenChange={e => {
      if (!e.open) {
        onClose();
      }
    }}>
      <Portal>

        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>Editar Proceso de Producción</Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body>
              <Stack gap={6}>
                {/* Sección: Información General */}
                <Box>
                  <Heading size="sm" mb={3}>Información General</Heading>
                  <Separator mb={4} />
                  <Stack gap={4}>
                    <Field.Root required>
                      <Field.Label>Nombre</Field.Label>
                      <Input 
                        name="nombre" 
                        value={procesoEditado.nombre} 
                        onValueChange={handleChange} 
                      />
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>Nivel de Acceso</Field.Label>
                      <NumberInput.Root 
                        min={0} 
                        max={10}
                        value={String(procesoEditado.nivelAcceso || 0)}
                        onValueChange={(_, value) => handleNumberChange('nivelAcceso', value)}
                      >
                        <NumberInput.Input />
                      </NumberInput.Root>
                    </Field.Root>

                    <Field.Root required>
                      <Field.Label>Tiempo de Preparación (Setup Time) en segundos</Field.Label>
                      <NumberInput.Root 
                        min={0}
                        value={String(procesoEditado.setUpTime)}
                        onValueChange={(_, value) => handleNumberChange('setUpTime', value)}
                      >
                        <NumberInput.Input />
                      </NumberInput.Root>
                    </Field.Root>
                  </Stack>
                </Box>

                {/* Sección: Modelo de Tiempo */}
                <Box>
                  <Heading size="sm" mb={3}>Modelo de Tiempo</Heading>
                  <Separator mb={4} />
                  <Stack gap={4}>
                    <Field.Root required>
                      <Field.Label>Modelo de Tiempo</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field
                          name="model"
                          value={procesoEditado.model}
                          onValueChange={handleModelChange}>
                          <option value={TimeModelType.CONSTANT}>Constante</option>
                          <option value={TimeModelType.THROUGHPUT_RATE}>Tasa</option>
                          <option value={TimeModelType.PER_UNIT}>Por Unidad</option>
                          <option value={TimeModelType.PER_BATCH}>Por Lote</option>
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Field.Root>

                    {procesoEditado.model === TimeModelType.CONSTANT && (
                      <Field.Root required>
                        <Field.Label>Tiempo Constante (segundos)</Field.Label>
                        <NumberInput.Root 
                          min={0}
                          value={String(procesoEditado.constantSeconds || 0)}
                          onValueChange={(_, value) => handleNumberChange('constantSeconds', value)}
                        >
                          <NumberInput.Input />
                        </NumberInput.Root>
                      </Field.Root>
                    )}

                    {procesoEditado.model === TimeModelType.THROUGHPUT_RATE && (
                      <Field.Root required>
                        <Field.Label>Tasa de Producción (unidades/segundo)</Field.Label>
                        <CustomDecimalInput
                          min={0}
                          maxDecimals={2}
                          value={procesoEditado.throughputUnitsPerSec || 0}
                          onChange={(value) => handleNumberChange('throughputUnitsPerSec', value)}
                        />
                      </Field.Root>
                    )}

                    {procesoEditado.model === TimeModelType.PER_UNIT && (
                      <Field.Root required>
                        <Field.Label>Segundos por Unidad</Field.Label>
                        <NumberInput.Root 
                          min={0}
                          value={String(procesoEditado.secondsPerUnit || 0)}
                          onValueChange={(_, value) => handleNumberChange('secondsPerUnit', value)}
                        >
                          <NumberInput.Input />
                        </NumberInput.Root>
                      </Field.Root>
                    )}

                    {procesoEditado.model === TimeModelType.PER_BATCH && (
                      <>
                        <Field.Root required>
                          <Field.Label>Segundos por Lote</Field.Label>
                          <NumberInput.Root 
                            min={0}
                            value={String(procesoEditado.secondsPerBatch || 0)}
                            onValueChange={(_, value) => handleNumberChange('secondsPerBatch', value)}
                          >
                            <NumberInput.Input />
                          </NumberInput.Root>
                        </Field.Root>

                        <Field.Root required>
                          <Field.Label>Tamaño del Lote</Field.Label>
                          <NumberInput.Root 
                            min={1}
                            value={String(procesoEditado.batchSize || 1)}
                            onValueChange={(_, value) => handleNumberChange('batchSize', value)}
                          >
                            <NumberInput.Input />
                          </NumberInput.Root>
                        </Field.Root>
                      </>
                    )}
                  </Stack>
                </Box>

                {/* Sección: Recursos */}
                <Box>
                  <Heading size="sm" mb={3}>Recursos</Heading>
                  <Separator mb={4} />
                  <Flex direction="column" gap={4}>
                    {/* Aquí iría la gestión de recursos requeridos */}
                    <Button colorPalette="teal" size="sm">
                      Agregar Recurso
                    </Button>
                  </Flex>
                </Box>

                <Separator />
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
                    <Separator mb={4} />

                    {!showDeleteSection ? (
                      <Button 
                        colorPalette="red" 
                        size="sm" 
                        onClick={toggleDeleteSection}
                      >
                        Mostrar Opciones de Eliminación
                      </Button>
                    ) : (
                      <Stack gap={4}>
                        <Alert.Root status="warning">
                          <Alert.Indicator />
                          Esta acción no se puede deshacer. El proceso será eliminado permanentemente.
                        </Alert.Root>

                        <Text fontWeight="bold">Token de confirmación: {randomToken}</Text>

                        <Field.Root>
                          <Field.Label>Ingrese el token de confirmación:</Field.Label>
                          <Input 
                            value={inputToken}
                            onValueChange={(e) => setInputToken(e.target.value)}
                            placeholder="Ingrese el token de 4 dígitos"
                          />
                        </Field.Root>

                        <Flex justify="space-between">
                          <Button 
                            colorPalette="gray" 
                            onClick={toggleDeleteSection}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            colorPalette="red" 
                            onClick={handleDelete}
                            loading={deleteLoading}
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
            </Dialog.Body>
            <Dialog.Footer>
              <Button mr={3} onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                colorPalette="blue" 
                onClick={handleSubmit}
                loading={loading}
              >
                Guardar Cambios
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>

      </Portal>
    </Dialog.Root>
  );
}
