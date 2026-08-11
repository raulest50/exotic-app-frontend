import {
  Box,
  Button,
  Flex,
  Input,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Badge,
  Dialog,
  Portal,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import { Tooltip } from '@/components/ui/tooltip';
import {useEffect, useState} from 'react';
import axios from 'axios';
import EndPointsURL from '../../../../../../api/EndPointsURL.tsx';
import {ProcesoProduccionEntity, TimeModelType} from '../../../../types.tsx';
import MyPagination from '../../../../../../components/MyPagination.tsx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (procesos: ProcesoProduccionEntity[]) => void;
  alreadySelected: ProcesoProduccionEntity[];
}

export function ProcesoProduccionPicker({isOpen, onClose, onConfirm, alreadySelected}: Props) {
  const endPoints = new EndPointsURL();
  const toast = useAppToast();

  // Helper function to format time model information
  const getTimeModelInfo = (proceso: ProcesoProduccionEntity): { label: string, details: string } => {
    switch (proceso.model) {
      case TimeModelType.CONSTANT:
        return {
          label: 'Constante',
          details: `${proceso.constantSeconds ?? 0} seg`
        };
      case TimeModelType.THROUGHPUT_RATE:
        return {
          label: 'Tasa',
          details: `${proceso.throughputUnitsPerSec ?? 0} u/seg`
        };
      case TimeModelType.PER_UNIT:
        return {
          label: 'Por Unidad',
          details: `${proceso.secondsPerUnit ?? 0} seg/u`
        };
      case TimeModelType.PER_BATCH:
        // Verificar que ambos valores existan antes de usarlos
        if (proceso.secondsPerBatch != null && proceso.batchSize != null) {
          return {
            label: 'Por Lote',
            details: `${proceso.secondsPerBatch} seg/lote(${proceso.batchSize})`
          };
        } else {
          return {
            label: 'Por Lote',
            details: 'Valores incompletos'
          };
        }
      default:
        // For backward compatibility with old data
        return {
          label: 'Sin modelo',
          details: `${proceso.constantSeconds ?? proceso.secondsPerUnit ?? proceso.secondsPerBatch ?? 0} seg`
        };
    }
  };

  const [searchText, setSearchText] = useState('');
  const [available, setAvailable] = useState<ProcesoProduccionEntity[]>([]);
  const [selected, setSelected] = useState<ProcesoProduccionEntity[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const pageSize = 10;

  const fetchAvailable = async (pageNumber: number) => {
    setLoading(true);
    try {
      // Usamos el endpoint de paginación existente
      const res = await axios.get(endPoints.get_procesos_produccion_pag, {
        params: {page: pageNumber, size: pageSize},
      });

      let list: ProcesoProduccionEntity[] = res.data.content || [];

      // Filtrar por texto de búsqueda si hay alguno (filtrado en el cliente)
      if (searchText) {
        list = list.filter(p => 
          p.nombre.toLowerCase().includes(searchText.toLowerCase())
        );
      }

      // Filtrar los que ya están seleccionados
      const ids = new Set([...alreadySelected, ...selected].map(p => p.procesoId));
      list = list.filter(p => !ids.has(p.procesoId));

      setAvailable(list);
      setTotalPages(res.data.totalPages || 1);
      setPage(pageNumber);
    } catch (e) {
      toast({
        title: 'Error',
        description: 'No se pudieron obtener los procesos.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setAvailable([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (isOpen) {
      fetchAvailable(0);
      setSelected([]);
    }
  }, [isOpen]);

  const handleAdd = (proceso: ProcesoProduccionEntity) => {
    setSelected([...selected, proceso]);
    setAvailable(available.filter(p => p.procesoId !== proceso.procesoId));
  };

  const handleRemove = (proceso: ProcesoProduccionEntity) => {
    const newSelected = selected.filter(p => p.procesoId !== proceso.procesoId);
    setSelected(newSelected);
    fetchAvailable(page);
  };

  const handleAccept = () => {
    onConfirm(selected);
    setSelected([]);
    setAvailable([]);
    onClose();
  };

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
            <Dialog.Header>Seleccionar Procesos de Producción</Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body>
              <Flex gap={4}>
                {/* Panel izquierdo - Procesos disponibles */}
                <Box flex={1}>
                  <Flex mb={2} gap={2}>
                    <Input
                      placeholder='Buscar por nombre'
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          fetchAvailable(0);
                        }
                      }}
                    />
                    <Button
                      onClick={() => fetchAvailable(0)}
                      loading={loading}
                      loadingText="Buscando..."
                    >
                      Buscar
                    </Button>
                  </Flex>
                  <Table.Root size='sm'>
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader>ID</Table.ColumnHeader>
                        <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                        <Table.ColumnHeader>Modelo de Tiempo</Table.ColumnHeader>
                        <Table.ColumnHeader>Setup Time</Table.ColumnHeader>
                        <Table.ColumnHeader>Nivel de Acceso</Table.ColumnHeader>
                        <Table.ColumnHeader></Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {available.map(proceso => {
                        const timeInfo = getTimeModelInfo(proceso);
                        return (
                          <Table.Row key={proceso.procesoId}>
                            <Table.Cell>{proceso.procesoId}</Table.Cell>
                            <Table.Cell>{proceso.nombre}</Table.Cell>
                            <Table.Cell>
                              <Tooltip content={timeInfo.details}>
                                <Badge colorPalette="teal">{timeInfo.label}</Badge>
                              </Tooltip>
                            </Table.Cell>
                            <Table.Cell>{proceso.setUpTime} seg</Table.Cell>
                            <Table.Cell>{proceso.nivelAcceso !== undefined ? proceso.nivelAcceso : '-'}</Table.Cell>
                            <Table.Cell>
                              <Button size='xs' onClick={() => handleAdd(proceso)}>+</Button>
                            </Table.Cell>
                          </Table.Row>
                        );
                      })}
                    </Table.Body>
                  </Table.Root>
                  {totalPages > 1 && (
                    <MyPagination 
                      page={page} 
                      totalPages={totalPages} 
                      loading={loading} 
                      handlePageChange={fetchAvailable} 
                    />
                  )}
                </Box>

                {/* Panel derecho - Procesos seleccionados */}
                <Box flex={1}>
                  <Table.Root size='sm'>
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader>ID</Table.ColumnHeader>
                        <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                        <Table.ColumnHeader>Modelo de Tiempo</Table.ColumnHeader>
                        <Table.ColumnHeader>Setup Time</Table.ColumnHeader>
                        <Table.ColumnHeader>Nivel de Acceso</Table.ColumnHeader>
                        <Table.ColumnHeader></Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {selected.map(proceso => {
                        const timeInfo = getTimeModelInfo(proceso);
                        return (
                          <Table.Row key={proceso.procesoId}>
                            <Table.Cell>{proceso.procesoId}</Table.Cell>
                            <Table.Cell>{proceso.nombre}</Table.Cell>
                            <Table.Cell>
                              <Tooltip content={timeInfo.details}>
                                <Badge colorPalette="teal">{timeInfo.label}</Badge>
                              </Tooltip>
                            </Table.Cell>
                            <Table.Cell>{proceso.setUpTime} seg</Table.Cell>
                            <Table.Cell>{proceso.nivelAcceso !== undefined ? proceso.nivelAcceso : '-'}</Table.Cell>
                            <Table.Cell>
                              <Button 
                                size='xs' 
                                colorPalette='red' 
                                onClick={() => handleRemove(proceso)}
                              >
                                -
                              </Button>
                            </Table.Cell>
                          </Table.Row>
                        );
                      })}
                    </Table.Body>
                  </Table.Root>
                </Box>
              </Flex>
            </Dialog.Body>
            <Dialog.Footer>
              <Button mr={3} onClick={onClose}>Cancelar</Button>
              <Button colorPalette='teal' onClick={handleAccept}>Aceptar</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>

      </Portal>
    </Dialog.Root>
  );
}
