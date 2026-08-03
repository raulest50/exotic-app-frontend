import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Badge,
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Input,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  VStack,
  useToast,
} from '@chakra-ui/react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import type {ChangeEvent} from 'react';
import {
  createProcesoDocumentoVersion,
  downloadProcesoDocumentoVersion,
  formatBytes,
  getProcesoDocumentoVersiones,
  procesoDocumentoErrorMessage,
  type ProcesoDocumentoVersion,
  validateProcesoDocumentoFile,
} from '../../../../api/ProcesoProduccionDocumentosApi.ts';

interface ProcesoDocumentosSectionProps {
  procesoId: number;
  isOpen: boolean;
  onDocumentVersionCreated?: () => void;
}

export default function ProcesoDocumentosSection({
  procesoId,
  isOpen,
  onDocumentVersionCreated,
}: ProcesoDocumentosSectionProps) {
  const toast = useToast();
  const [versiones, setVersiones] = useState<ProcesoDocumentoVersion[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [motivoCambio, setMotivoCambio] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const vigente = useMemo(
    () => versiones.find((version) => version.estado === 'VIGENTE') ?? null,
    [versiones]
  );

  const loadVersiones = useCallback(async () => {
    setLoading(true);
    try {
      setVersiones(await getProcesoDocumentoVersiones(procesoId));
    } catch (error) {
      setVersiones([]);
      toast({
        title: 'No se pudo consultar el documento',
        description: procesoDocumentoErrorMessage(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [procesoId, toast]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedFile(null);
    setMotivoCambio('');
    setFileInputKey((current) => current + 1);
    void loadVersiones();
  }, [isOpen, loadVersiones]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(null);
    if (!file) return;

    try {
      await validateProcesoDocumentoFile(file);
      setSelectedFile(file);
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

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (vigente && !motivoCambio.trim()) {
      toast({
        title: 'Indique el motivo del cambio',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    setUploading(true);
    try {
      await createProcesoDocumentoVersion(procesoId, selectedFile, motivoCambio);
      await loadVersiones();
      onDocumentVersionCreated?.();
      setSelectedFile(null);
      setMotivoCambio('');
      setFileInputKey((current) => current + 1);
      toast({
        title: vigente ? 'Nueva versión creada' : 'Documento inicial cargado',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'No se pudo cargar el documento',
        description: procesoDocumentoErrorMessage(error),
        status: 'error',
        duration: 6000,
        isClosable: true,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (version: ProcesoDocumentoVersion) => {
    setDownloadingId(version.id);
    try {
      await downloadProcesoDocumentoVersion(procesoId, version);
    } catch (error) {
      toast({
        title: 'No se pudo descargar el documento',
        description: procesoDocumentoErrorMessage(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Box>
      <Heading size="sm" mb={3}>Documento del proceso</Heading>
      <VStack align="stretch" spacing={4}>
        <Box borderWidth="1px" borderRadius="md" p={4}>
          {loading ? (
            <Spinner size="sm" />
          ) : vigente ? (
            <VStack align="stretch" spacing={2}>
              <HStack justify="space-between" align="flex-start">
                <Box>
                  <Text fontWeight="semibold">{vigente.nombreArchivoOriginal}</Text>
                  <Text fontSize="sm" color="gray.500">
                    Versión {vigente.version} · {formatBytes(vigente.tamanoBytes)}
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    Cargado por {vigente.creadoPor || '-'} · {formatDateTime(vigente.creadoEn)}
                  </Text>
                </Box>
                <Badge colorScheme="green">Vigente</Badge>
              </HStack>
              <Button
                size="sm"
                alignSelf="flex-start"
                variant="outline"
                onClick={() => void handleDownload(vigente)}
                isLoading={downloadingId === vigente.id}
              >
                Descargar versión vigente
              </Button>
            </VStack>
          ) : (
            <Text fontSize="sm" color="gray.500">Sin documento asociado.</Text>
          )}
        </Box>

        <Box borderWidth="1px" borderRadius="md" p={4}>
          <VStack align="stretch" spacing={3}>
            <FormControl>
              <FormLabel>{vigente ? 'Cargar nueva versión' : 'Cargar documento inicial'}</FormLabel>
              <Input
                key={fileInputKey}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                p={1}
              />
              <FormHelperText>
                Formatos permitidos: PDF y Word (.docx). Tamaño máximo: 2 MB.
              </FormHelperText>
            </FormControl>

            {selectedFile ? (
              <HStack justify="space-between">
                <Box>
                  <Text fontSize="sm" fontWeight="medium">{selectedFile.name}</Text>
                  <Text fontSize="sm" color="gray.500">{formatBytes(selectedFile.size)}</Text>
                </Box>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedFile(null);
                    setFileInputKey((current) => current + 1);
                  }}
                >
                  Quitar
                </Button>
              </HStack>
            ) : null}

            {selectedFile ? (
              <FormControl isRequired={Boolean(vigente)}>
                <FormLabel>{vigente ? 'Motivo del cambio' : 'Observación inicial (opcional)'}</FormLabel>
                <Textarea
                  value={motivoCambio}
                  onChange={(event) => setMotivoCambio(event.target.value)}
                  placeholder={vigente ? 'Describa brevemente qué cambió' : 'Documento inicial del proceso'}
                />
              </FormControl>
            ) : null}

            <Button
              colorScheme="teal"
              alignSelf="flex-end"
              onClick={() => void handleUpload()}
              isDisabled={!selectedFile || Boolean(vigente && !motivoCambio.trim())}
              isLoading={uploading}
            >
              {vigente ? 'Crear nueva versión' : 'Cargar documento'}
            </Button>
          </VStack>
        </Box>

        {versiones.length > 0 ? (
          <Accordion allowToggle borderWidth="1px" borderRadius="md">
            <AccordionItem border="none">
              <AccordionButton>
                <Box as="span" flex="1" textAlign="left" fontWeight="semibold">
                  Historial de versiones ({versiones.length})
                </Box>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel px={0} pb={0}>
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Versión</Th>
                        <Th>Estado</Th>
                        <Th>Archivo</Th>
                        <Th>Tamaño</Th>
                        <Th>Fecha</Th>
                        <Th>Usuario</Th>
                        <Th>Motivo</Th>
                        <Th>Acción</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {versiones.map((version) => (
                        <Tr key={version.id}>
                          <Td>{version.version}</Td>
                          <Td>
                            <Badge colorScheme={version.estado === 'VIGENTE' ? 'green' : 'gray'}>
                              {version.estado}
                            </Badge>
                          </Td>
                          <Td>{version.nombreArchivoOriginal}</Td>
                          <Td>{formatBytes(version.tamanoBytes)}</Td>
                          <Td>{formatDateTime(version.creadoEn)}</Td>
                          <Td>{version.creadoPor || '-'}</Td>
                          <Td>{version.motivoCambio || '-'}</Td>
                          <Td>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => void handleDownload(version)}
                              isLoading={downloadingId === version.id}
                            >
                              Descargar
                            </Button>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        ) : null}
      </VStack>
    </Box>
  );
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es-CO');
}
