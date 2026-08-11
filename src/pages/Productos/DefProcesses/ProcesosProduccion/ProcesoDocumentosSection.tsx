import {
  Steps,
  Accordion,
  Badge,
  Box,
  Button,
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
  Field,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
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
  const toast = useAppToast();
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
      <VStack align="stretch" gap={4}>
        <Box borderWidth="1px" borderRadius="md" p={4}>
          {loading ? (
            <Spinner size="sm" />
          ) : vigente ? (
            <VStack align="stretch" gap={2}>
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
                <Badge colorPalette="green">Vigente</Badge>
              </HStack>
              <Button
                size="sm"
                alignSelf="flex-start"
                variant="outline"
                onClick={() => void handleDownload(vigente)}
                loading={downloadingId === vigente.id}
              >
                Descargar versión vigente
              </Button>
            </VStack>
          ) : (
            <Text fontSize="sm" color="gray.500">Sin documento asociado.</Text>
          )}
        </Box>

        <Box borderWidth="1px" borderRadius="md" p={4}>
          <VStack align="stretch" gap={3}>
            <Field.Root>
              <Field.Label>{vigente ? 'Cargar nueva versión' : 'Cargar documento inicial'}</Field.Label>
              <Input
                key={fileInputKey}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onValueChange={handleFileChange}
                p={1}
              />
              <Field.HelperText>
                Formatos permitidos: PDF y Word (.docx). Tamaño máximo: 2 MB.
              </Field.HelperText>
            </Field.Root>

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
              <Field.Root required={Boolean(vigente)}>
                <Field.Label>{vigente ? 'Motivo del cambio' : 'Observación inicial (opcional)'}</Field.Label>
                <Textarea
                  value={motivoCambio}
                  onValueChange={(event) => setMotivoCambio(event.target.value)}
                  placeholder={vigente ? 'Describa brevemente qué cambió' : 'Documento inicial del proceso'}
                />
              </Field.Root>
            ) : null}

            <Button
              colorPalette="teal"
              alignSelf="flex-end"
              onClick={() => void handleUpload()}
              disabled={!selectedFile || Boolean(vigente && !motivoCambio.trim())}
              loading={uploading}
            >
              {vigente ? 'Crear nueva versión' : 'Cargar documento'}
            </Button>
          </VStack>
        </Box>

        {versiones.length > 0 ? (
          <Accordion.Root collapsible borderWidth="1px" borderRadius="md">
            <Accordion.Item border="none" value='item-0'>
              <Accordion.ItemTrigger>
                <Box as="span" flex="1" textAlign="left" fontWeight="semibold">
                  Historial de versiones ({versiones.length})
                </Box>
                <Accordion.ItemIndicator />
              </Accordion.ItemTrigger>
              <Accordion.ItemContent px={0} pb={0}><Accordion.ItemBody>
                  <Box overflowX="auto">
                    <Table.Root size="sm">
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeader>Versión</Table.ColumnHeader>
                          <Table.ColumnHeader>Estado</Table.ColumnHeader>
                          <Table.ColumnHeader>Archivo</Table.ColumnHeader>
                          <Table.ColumnHeader>Tamaño</Table.ColumnHeader>
                          <Table.ColumnHeader>Fecha</Table.ColumnHeader>
                          <Table.ColumnHeader>Usuario</Table.ColumnHeader>
                          <Table.ColumnHeader>Motivo</Table.ColumnHeader>
                          <Table.ColumnHeader>Acción</Table.ColumnHeader>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {versiones.map((version) => (
                          <Table.Row key={version.id}>
                            <Table.Cell>{version.version}</Table.Cell>
                            <Table.Cell>
                              <Badge colorPalette={version.estado === 'VIGENTE' ? 'green' : 'gray'}>
                                {version.estado}
                              </Badge>
                            </Table.Cell>
                            <Table.Cell>{version.nombreArchivoOriginal}</Table.Cell>
                            <Table.Cell>{formatBytes(version.tamanoBytes)}</Table.Cell>
                            <Table.Cell>{formatDateTime(version.creadoEn)}</Table.Cell>
                            <Table.Cell>{version.creadoPor || '-'}</Table.Cell>
                            <Table.Cell>{version.motivoCambio || '-'}</Table.Cell>
                            <Table.Cell>
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => void handleDownload(version)}
                                loading={downloadingId === version.id}
                              >
                                Descargar
                              </Button>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  </Box>
                </Accordion.ItemBody></Accordion.ItemContent>
            </Accordion.Item>
          </Accordion.Root>
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
