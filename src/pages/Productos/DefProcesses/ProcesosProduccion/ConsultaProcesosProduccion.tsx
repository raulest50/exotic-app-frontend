/**
 * Componente: ConsultaProcesosProduccion
 * 
 * Ubicación en la navegación:
 * Productos > Definición de Procesos > Consultar Procesos de Producción (pestaña)
 * 
 * Descripción:
 * Componente que permite consultar y gestionar los procesos de producción definidos.
 * Muestra una tabla con los procesos existentes y permite filtrar, editar y ver detalles.
 */

import { useState, useEffect } from 'react';
import {
  Steps,
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
  useToast,
  Badge,
  Heading,
} from '@chakra-ui/react';
import { Tooltip } from '@/components/ui/tooltip';
import axios from 'axios';
import EndPointsURL from '../../../../api/EndPointsURL.tsx';
import { ProcesoProduccionEntity, TimeModelType } from '../../types.tsx';
import MyPagination from '../../../../components/MyPagination.tsx';
import { EditarProcesoModal } from './EditarProcesoModal.tsx';

export function ConsultaProcesosProduccion() {
  const endPoints = new EndPointsURL();
  const toast = useToast();

  const [searchText, setSearchText] = useState('');
  const [procesos, setProcesos] = useState<ProcesoProduccionEntity[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<ProcesoProduccionEntity | null>(null);
  const pageSize = 10;

  // Helper function to format time model information (copiado de ProcesoProduccionPicker)
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
        return {
          label: 'Sin modelo',
          details: `${proceso.constantSeconds ?? proceso.secondsPerUnit ?? proceso.secondsPerBatch ?? 0} seg`
        };
    }
  };

  const fetchProcesos = async (pageNumber: number) => {
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

      setProcesos(list);
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
      setProcesos([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesos(0);
  }, []);

  const handleEdit = (proceso: ProcesoProduccionEntity) => {
    setProcesoSeleccionado(proceso);
    setIsModalOpen(true);
  };

  return (
    <Flex direction="column" gap={4}>
      <Heading size="md" mb={4}>Consulta de Procesos de Producción</Heading>

      {/* Barra de búsqueda */}
      <Flex mb={4} gap={2}>
        <Input
          placeholder='Buscar por nombre'
          value={searchText}
          onValueChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              fetchProcesos(0);
            }
          }}
        />
        <Button
          onClick={() => fetchProcesos(0)}
          loading={loading}
          loadingText="Buscando..."
          colorPalette="teal"
        >
          Buscar
        </Button>
      </Flex>

      {/* Tabla de resultados */}
      <Box overflowX="auto">
        <Table.Root size='sm' variant="simple">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>ID</Table.ColumnHeader>
              <Table.ColumnHeader>Nombre</Table.ColumnHeader>
              <Table.ColumnHeader>Modelo de Tiempo</Table.ColumnHeader>
              <Table.ColumnHeader>Setup Time</Table.ColumnHeader>
              <Table.ColumnHeader>Nivel de Acceso</Table.ColumnHeader>
              <Table.ColumnHeader>Acciones</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {procesos.map(proceso => {
              const timeInfo = getTimeModelInfo(proceso);
              return (
                <Table.Row key={proceso.procesoId}>
                  <Table.Cell>{proceso.procesoId}</Table.Cell>
                  <Table.Cell>{proceso.nombre}</Table.Cell>
                  <Table.Cell>
                    <Flex alignItems="center" gap={2}>
                      <Badge colorPalette="teal">{timeInfo.label}</Badge>
                      <Box fontSize="sm">{timeInfo.details}</Box>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>{proceso.setUpTime} seg</Table.Cell>
                  <Table.Cell>{proceso.nivelAcceso !== undefined ? proceso.nivelAcceso : '-'}</Table.Cell>
                  <Table.Cell>
                    <Button 
                      size='sm' 
                      colorPalette='blue'
                      onClick={() => handleEdit(proceso)}
                    >
                      Editar
                    </Button>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Box>

      {/* Paginación */}
      {totalPages > 1 && (
        <MyPagination 
          page={page} 
          totalPages={totalPages} 
          loading={loading} 
          handlePageChange={fetchProcesos} 
        />
      )}

      {/* Modal de edición */}
      <EditarProcesoModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        proceso={procesoSeleccionado}
        onSave={(procesoActualizado) => {
          // Check if the process was deleted
          if ('deleted' in procesoActualizado && procesoActualizado.deleted) {
            // Remove the deleted process from the list
            setProcesos(procesos.filter(p => p.procesoId !== procesoActualizado.procesoId));
            toast({
              title: 'Proceso eliminado',
              description: 'El proceso ha sido eliminado de la lista',
              status: 'info',
              duration: 3000,
              isClosable: true,
            });
          } else {
            // Update the process in the list
            setProcesos(procesos.map(p => 
              p.procesoId === procesoActualizado.procesoId ? procesoActualizado : p
            ));
          }
          // Refresh the list to ensure updated data is shown
          fetchProcesos(page);
        }}
      />
    </Flex>
  );
}
