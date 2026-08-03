import {useState} from 'react';
import {
  Box,
  Heading,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  VStack,
  Button,
  useToast,
  Select,
  Text,
  Textarea,
  HStack,
} from '@chakra-ui/react';
import axios from 'axios';
import EndPointsURL from '../../../../api/EndPointsURL.tsx';
import {input_style} from '../../../../styles/styles_general.tsx';
import {RecursoProduccion, ProcesoProduccionEntity, TimeModelType} from '../../types.tsx';
import PPRPmanager from './PPRPmanager.tsx';
import {
  createProcesoDocumentoVersion,
  formatBytes,
  procesoDocumentoErrorMessage,
  validateProcesoDocumentoFile,
} from '../../../../api/ProcesoProduccionDocumentosApi.ts';

function DefinicionProcesosTab() {
  const [nombre, setNombre] = useState('');
  const [setUpTime, setSetUpTime] = useState<number>(0);
  const [nivelAcceso, setNivelAcceso] = useState<number>(1); // Valor predeterminado: 1 (nivel básico)
  const [recursosSel, setRecursosSel] = useState<RecursoProduccion[]>([]);

  // Nuevos estados para el modelo de tiempo
  const [model, setModel] = useState<TimeModelType>(TimeModelType.CONSTANT);
  const [constantSeconds, setConstantSeconds] = useState<number>(0);
  const [throughputUnitsPerSec, setThroughputUnitsPerSec] = useState<number>(0);
  const [secondsPerUnit, setSecondsPerUnit] = useState<number>(0);
  const [secondsPerBatch, setSecondsPerBatch] = useState<number>(0);
  const [batchSize, setBatchSize] = useState<number>(0);
  const [documento, setDocumento] = useState<File | null>(null);
  const [documentoMotivo, setDocumentoMotivo] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const toast = useToast();
  const endPoints = new EndPointsURL();

  const clearFields = () => {
    setNombre('');
    setSetUpTime(0);
    setNivelAcceso(1); // Resetear a valor predeterminado
    setRecursosSel([]);

    // Limpiar campos del modelo de tiempo
    setModel(TimeModelType.CONSTANT);
    setConstantSeconds(0);
    setThroughputUnitsPerSec(0);
    setSecondsPerUnit(0);
    setSecondsPerBatch(0);
    setBatchSize(0);
    setDocumento(null);
    setDocumentoMotivo('');
    setFileInputKey((current) => current + 1);
  };

  const handleDocumentoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setDocumento(null);
    if (!file) return;

    try {
      await validateProcesoDocumentoFile(file);
      setDocumento(file);
    } catch (error) {
      event.target.value = '';
      toast({
        title: 'Documento no válido',
        description: procesoDocumentoErrorMessage(error),
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSubmit = async () => {
    // Validar campos según el modelo seleccionado
    let isValid = true;
    let errorMessage = '';

    switch (model) {
      case TimeModelType.CONSTANT:
        if (constantSeconds <= 0) {
          isValid = false;
          errorMessage = 'El tiempo constante debe ser mayor que 0';
        }
        break;
      case TimeModelType.THROUGHPUT_RATE:
        if (throughputUnitsPerSec <= 0) {
          isValid = false;
          errorMessage = 'La tasa de rendimiento debe ser mayor que 0';
        }
        break;
      case TimeModelType.PER_UNIT:
        if (secondsPerUnit <= 0) {
          isValid = false;
          errorMessage = 'El tiempo por unidad debe ser mayor que 0';
        }
        break;
      case TimeModelType.PER_BATCH:
        if (secondsPerBatch <= 0 || batchSize <= 0) {
          isValid = false;
          errorMessage = 'El tiempo por lote y el tamaño del lote deben ser mayores que 0';
        }
        break;
    }

    if (!isValid) {
      toast({
        title: 'Error de validación',
        description: errorMessage,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Crear objeto según el modelo seleccionado
    const proceso: ProcesoProduccionEntity = {
      nombre,
      recursosRequeridos: recursosSel.map((r) => ({
        id: r.id,
        cantidad: r.cantidad || 1  // Incluir la cantidad
      })) as RecursoProduccion[],
      setUpTime,
      nivelAcceso,
      model,
    };

    // Agregar campos específicos según el modelo
    switch (model) {
      case TimeModelType.CONSTANT:
        proceso.constantSeconds = constantSeconds;
        break;
      case TimeModelType.THROUGHPUT_RATE:
        proceso.throughputUnitsPerSec = throughputUnitsPerSec;
        break;
      case TimeModelType.PER_UNIT:
        proceso.secondsPerUnit = secondsPerUnit;
        break;
      case TimeModelType.PER_BATCH:
        proceso.secondsPerBatch = secondsPerBatch;
        proceso.batchSize = batchSize;
        break;
    }

    setSaving(true);
    try {
      const response = await axios.post<ProcesoProduccionEntity>(
        endPoints.save_proceso_produccion,
        proceso
      );
      const procesoId = response.data.procesoId;

      if (documento) {
        if (!procesoId) {
          throw new Error('El proceso fue creado, pero el servidor no devolvió su identificador.');
        }
        try {
          await createProcesoDocumentoVersion(procesoId, documento, documentoMotivo);
          toast({
            title: 'Proceso y documento creados',
            status: 'success',
            duration: 4000,
            isClosable: true,
          });
        } catch (documentError) {
          toast({
            title: 'Proceso creado sin documento',
            description: `El proceso quedó guardado. Reintente el documento desde Consultar procesos. ${procesoDocumentoErrorMessage(documentError)}`,
            status: 'warning',
            duration: 8000,
            isClosable: true,
          });
        }
      } else {
        toast({
          title: 'Proceso creado',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
      clearFields();
    } catch (e) {
      toast({
        title: 'Error al crear proceso',
        description: procesoDocumentoErrorMessage(e),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  // Renderizar campos específicos según el modelo seleccionado
  const renderModelFields = () => {
    switch (model) {
      case TimeModelType.CONSTANT:
        return (
          <FormControl isRequired>
            <FormLabel>Tiempo Constante (segundos)</FormLabel>
            <Input
              type="number"
              value={constantSeconds}
              onChange={(e) => setConstantSeconds(Number(e.target.value))}
              sx={input_style}
            />
            <FormHelperText>
              Tiempo total = Setup Time + Tiempo Constante
            </FormHelperText>
          </FormControl>
        );
      case TimeModelType.THROUGHPUT_RATE:
        return (
          <FormControl isRequired>
            <FormLabel>Tasa de Rendimiento (unidades/segundo)</FormLabel>
            <Input
              type="number"
              value={throughputUnitsPerSec}
              onChange={(e) => setThroughputUnitsPerSec(Number(e.target.value))}
              step="any"
              sx={input_style}
            />
            <FormHelperText>
              Tiempo total = Setup Time + (Unidades / Tasa de Rendimiento)
            </FormHelperText>
          </FormControl>
        );
      case TimeModelType.PER_UNIT:
        return (
          <FormControl isRequired>
            <FormLabel>Tiempo por Unidad (segundos)</FormLabel>
            <Input
              type="number"
              value={secondsPerUnit}
              onChange={(e) => setSecondsPerUnit(Number(e.target.value))}
              sx={input_style}
            />
            <FormHelperText>
              Tiempo total = Setup Time + (Unidades * Tiempo por Unidad)
            </FormHelperText>
          </FormControl>
        );
      case TimeModelType.PER_BATCH:
        return (
          <>
            <FormControl isRequired>
              <FormLabel>Tiempo por Lote (segundos)</FormLabel>
              <Input
                type="number"
                value={secondsPerBatch}
                onChange={(e) => setSecondsPerBatch(Number(e.target.value))}
                sx={input_style}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Tamaño del Lote (unidades)</FormLabel>
              <Input
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                sx={input_style}
              />
              <FormHelperText>
                Tiempo total = Setup Time + Math.ceil(Unidades / Tamaño del Lote) * Tiempo por Lote
              </FormHelperText>
            </FormControl>
          </>
        );
    }
  };

  return (
    <Box p={4}>
      <Heading size="md" mb={4}>
        Crear Proceso de Producción
      </Heading>
      <VStack spacing={4} align="stretch">
        <FormControl isRequired>
          <FormLabel>Nombre</FormLabel>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} sx={input_style} />
        </FormControl>
        <FormControl>
          <FormLabel>Set-up Time (segundos)</FormLabel>
          <Input
            type="number"
            value={setUpTime}
            onChange={(e) => setSetUpTime(Number(e.target.value))}
            sx={input_style}
          />
        </FormControl>

        {/* Selector de modelo de tiempo */}
        <FormControl isRequired>
          <FormLabel>Modelo de Tiempo</FormLabel>
          <Select 
            value={model} 
            onChange={(e) => setModel(e.target.value as TimeModelType)}
            sx={input_style}
          >
            <option value={TimeModelType.CONSTANT}>Tiempo Constante</option>
            <option value={TimeModelType.THROUGHPUT_RATE}>Tasa de Rendimiento</option>
            <option value={TimeModelType.PER_UNIT}>Por Unidad</option>
            <option value={TimeModelType.PER_BATCH}>Por Lote</option>
          </Select>
          <FormHelperText>
            Seleccione el modelo para calcular el tiempo de proceso
          </FormHelperText>
        </FormControl>

        {/* Campos específicos según el modelo */}
        {renderModelFields()}

        <FormControl>
          <FormLabel>Nivel de Acceso</FormLabel>
          <Input
            type="number"
            value={nivelAcceso}
            onChange={(e) => setNivelAcceso(Number(e.target.value))}
            sx={input_style}
          />
          <FormHelperText>
            Define qué usuarios pueden ver este proceso según su nivel de acceso
          </FormHelperText>
        </FormControl>
        <FormControl>
          <FormLabel>Recursos Requeridos</FormLabel>
          <PPRPmanager recursos={recursosSel} onChange={setRecursosSel} />
        </FormControl>

        <Box borderWidth="1px" borderRadius="md" p={4}>
          <Text fontWeight="semibold" mb={3}>Documento del proceso (opcional)</Text>
          <VStack align="stretch" spacing={3}>
            <FormControl>
              <FormLabel>Archivo PDF o Word</FormLabel>
              <Input
                key={fileInputKey}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleDocumentoChange}
                p={1}
              />
              <FormHelperText>
                Formatos permitidos: PDF y Word (.docx). Tamaño máximo: 2 MB.
              </FormHelperText>
            </FormControl>

            {documento ? (
              <HStack justify="space-between" align="center">
                <Box>
                  <Text fontSize="sm" fontWeight="medium">{documento.name}</Text>
                  <Text fontSize="sm" color="gray.500">{formatBytes(documento.size)}</Text>
                </Box>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDocumento(null);
                    setFileInputKey((current) => current + 1);
                  }}
                >
                  Quitar
                </Button>
              </HStack>
            ) : null}

            {documento ? (
              <FormControl>
                <FormLabel>Observación inicial (opcional)</FormLabel>
                <Textarea
                  value={documentoMotivo}
                  onChange={(event) => setDocumentoMotivo(event.target.value)}
                  placeholder="Ejemplo: Documento inicial del proceso"
                />
              </FormControl>
            ) : null}
          </VStack>
        </Box>

        <Button colorScheme="teal" onClick={handleSubmit} isLoading={saving} loadingText="Guardando...">
          Guardar
        </Button>
        <Button colorScheme="orange" onClick={clearFields} isDisabled={saving}>
          Limpiar
        </Button>
      </VStack>
    </Box>
  );
}

export default DefinicionProcesosTab;
