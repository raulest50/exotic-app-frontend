import {useState} from 'react';
import {
  Steps,
  Box,
  Heading,
  Input,
  VStack,
  Button,
  NativeSelect,
  Text,
  Textarea,
  HStack,
  Field,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
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

  const toast = useAppToast();
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
          <Field.Root required>
            <Field.Label>Tiempo Constante (segundos)</Field.Label>
            <Input
              type="number"
              value={constantSeconds}
              onValueChange={(e) => setConstantSeconds(Number(e.target.value))}
              sx={input_style}
            />
            <Field.HelperText>
              Tiempo total = Setup Time + Tiempo Constante
            </Field.HelperText>
          </Field.Root>
        );
      case TimeModelType.THROUGHPUT_RATE:
        return (
          <Field.Root required>
            <Field.Label>Tasa de Rendimiento (unidades/segundo)</Field.Label>
            <Input
              type="number"
              value={throughputUnitsPerSec}
              onValueChange={(e) => setThroughputUnitsPerSec(Number(e.target.value))}
              step="any"
              sx={input_style}
            />
            <Field.HelperText>
              Tiempo total = Setup Time + (Unidades / Tasa de Rendimiento)
            </Field.HelperText>
          </Field.Root>
        );
      case TimeModelType.PER_UNIT:
        return (
          <Field.Root required>
            <Field.Label>Tiempo por Unidad (segundos)</Field.Label>
            <Input
              type="number"
              value={secondsPerUnit}
              onValueChange={(e) => setSecondsPerUnit(Number(e.target.value))}
              sx={input_style}
            />
            <Field.HelperText>
              Tiempo total = Setup Time + (Unidades * Tiempo por Unidad)
            </Field.HelperText>
          </Field.Root>
        );
      case TimeModelType.PER_BATCH:
        return (
          <>
            <Field.Root required>
              <Field.Label>Tiempo por Lote (segundos)</Field.Label>
              <Input
                type="number"
                value={secondsPerBatch}
                onValueChange={(e) => setSecondsPerBatch(Number(e.target.value))}
                sx={input_style}
              />
            </Field.Root>
            <Field.Root required>
              <Field.Label>Tamaño del Lote (unidades)</Field.Label>
              <Input
                type="number"
                value={batchSize}
                onValueChange={(e) => setBatchSize(Number(e.target.value))}
                sx={input_style}
              />
              <Field.HelperText>
                Tiempo total = Setup Time + Math.ceil(Unidades / Tamaño del Lote) * Tiempo por Lote
              </Field.HelperText>
            </Field.Root>
          </>
        );
    }
  };

  return (
    <Box p={4}>
      <Heading size="md" mb={4}>
        Crear Proceso de Producción
      </Heading>
      <VStack gap={4} align="stretch">
        <Field.Root required>
          <Field.Label>Nombre</Field.Label>
          <Input value={nombre} onValueChange={(e) => setNombre(e.target.value)} sx={input_style} />
        </Field.Root>
        <Field.Root>
          <Field.Label>Set-up Time (segundos)</Field.Label>
          <Input
            type="number"
            value={setUpTime}
            onValueChange={(e) => setSetUpTime(Number(e.target.value))}
            sx={input_style}
          />
        </Field.Root>

        {/* Selector de modelo de tiempo */}
        <Field.Root required>
          <Field.Label>Modelo de Tiempo</Field.Label>
          <NativeSelect.Root>
            <NativeSelect.Field
              value={model}
              onValueChange={(e) => setModel(e.target.value as TimeModelType)}
              sx={input_style}>
              <option value={TimeModelType.CONSTANT}>Tiempo Constante</option>
              <option value={TimeModelType.THROUGHPUT_RATE}>Tasa de Rendimiento</option>
              <option value={TimeModelType.PER_UNIT}>Por Unidad</option>
              <option value={TimeModelType.PER_BATCH}>Por Lote</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <Field.HelperText>
            Seleccione el modelo para calcular el tiempo de proceso
          </Field.HelperText>
        </Field.Root>

        {/* Campos específicos según el modelo */}
        {renderModelFields()}

        <Field.Root>
          <Field.Label>Nivel de Acceso</Field.Label>
          <Input
            type="number"
            value={nivelAcceso}
            onValueChange={(e) => setNivelAcceso(Number(e.target.value))}
            sx={input_style}
          />
          <Field.HelperText>
            Define qué usuarios pueden ver este proceso según su nivel de acceso
          </Field.HelperText>
        </Field.Root>
        <Field.Root>
          <Field.Label>Recursos Requeridos</Field.Label>
          <PPRPmanager recursos={recursosSel} onChange={setRecursosSel} />
        </Field.Root>

        <Box borderWidth="1px" borderRadius="md" p={4}>
          <Text fontWeight="semibold" mb={3}>Documento del proceso (opcional)</Text>
          <VStack align="stretch" gap={3}>
            <Field.Root>
              <Field.Label>Archivo PDF o Word</Field.Label>
              <Input
                key={fileInputKey}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onValueChange={handleDocumentoChange}
                p={1}
              />
              <Field.HelperText>
                Formatos permitidos: PDF y Word (.docx). Tamaño máximo: 2 MB.
              </Field.HelperText>
            </Field.Root>

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
              <Field.Root>
                <Field.Label>Observación inicial (opcional)</Field.Label>
                <Textarea
                  value={documentoMotivo}
                  onValueChange={(event) => setDocumentoMotivo(event.target.value)}
                  placeholder="Ejemplo: Documento inicial del proceso"
                />
              </Field.Root>
            ) : null}
          </VStack>
        </Box>

        <Button colorPalette="teal" onClick={handleSubmit} loading={saving} loadingText="Guardando...">
          Guardar
        </Button>
        <Button colorPalette="orange" onClick={clearFields} disabled={saving}>
          Limpiar
        </Button>
      </VStack>
    </Box>
  );
}

export default DefinicionProcesosTab;
