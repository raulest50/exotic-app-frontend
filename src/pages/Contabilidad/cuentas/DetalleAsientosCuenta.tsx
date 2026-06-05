import React, { useState, useEffect } from 'react';
import {
  Button,
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Flex,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  Badge,
  Divider,
  HStack,
  VStack,
  Heading
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import axios from 'axios';
import { CuentaContable, MovimientoLibroMayor, PeriodoContable } from '../types';
import EndPointsURL from '../../../api/EndPointsURL';
import MyPagination from '../../../components/MyPagination';

interface DetalleAsientosCuentaProps {
  cuenta: CuentaContable;
  onVolver: () => void;
}

const DetalleAsientosCuenta: React.FC<DetalleAsientosCuentaProps> = ({
  cuenta,
  onVolver
}) => {
  const [movimientos, setMovimientos] = useState<MovimientoLibroMayor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodos, setPeriodos] = useState<PeriodoContable[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  const endpoints = new EndPointsURL();

  useEffect(() => {
    fetchPeriodos();
  }, []);

  useEffect(() => {
    if (selectedPeriodo) {
      fetchMovimientos();
    }
  }, [selectedPeriodo, page]);

  const fetchPeriodos = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(endpoints.get_periodos);
      const periodosData = Array.isArray(response.data) ? response.data : [];
      setPeriodos(periodosData);
      
      // Seleccionar automáticamente el período más reciente que esté abierto
      const periodoAbierto = periodosData.find(p => p.estado === 'ABIERTO');
      if (periodoAbierto) {
        setSelectedPeriodo(periodoAbierto.id.toString());
      } else if (periodosData.length > 0) {
        // Si no hay períodos abiertos, seleccionar el más reciente
        setSelectedPeriodo(periodosData[periodosData.length - 1].id.toString());
      } else {
        // Si no hay períodos disponibles, usar datos de ejemplo
        setError('No hay períodos contables disponibles');
        const mockMovimientos = generateMockMovimientos();
        setMovimientos(mockMovimientos);
        setTotalPages(Math.ceil(mockMovimientos.length / itemsPerPage));
      }
    } catch (error) {
      console.error('Error fetching periodos:', error);
      setError('No se pudieron cargar los períodos contables');
      
      // Usar datos de ejemplo en caso de error
      const mockMovimientos = generateMockMovimientos();
      setMovimientos(mockMovimientos);
      setTotalPages(Math.ceil(mockMovimientos.length / itemsPerPage));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMovimientos = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(endpoints.get_libro_mayor, {
        params: {
          cuentaCodigo: cuenta.codigo,
          periodoId: selectedPeriodo
        }
      });
      
      const allMovimientos = response.data || [];
      setTotalPages(Math.ceil(allMovimientos.length / itemsPerPage));
      
      // Paginar los resultados
      const paginatedMovimientos = allMovimientos.slice(
        page * itemsPerPage,
        (page + 1) * itemsPerPage
      );
      
      setMovimientos(paginatedMovimientos);
    } catch (error) {
      console.error('Error fetching movimientos:', error);
      setError('No se pudieron cargar los movimientos de la cuenta');
      
      // Mock data for development
      const mockMovimientos = generateMockMovimientos();
      setMovimientos(mockMovimientos);
      setTotalPages(Math.ceil(mockMovimientos.length / itemsPerPage));
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockMovimientos = () => {
    // Generar datos de ejemplo basados en el tipo de cuenta y los datos de la consola
    const baseMovimientos = [
      { fecha: '2023-03-01', numeroAsiento: 1, descripcion: 'Ingreso de materias primas a inventario', debito: cuenta.codigo === '1200' ? 5000000 : 0, credito: 0, saldoAcumulado: 5000000 },
      { fecha: '2023-03-05', numeroAsiento: 2, descripcion: 'Obligación con proveedor Raul Alzate', debito: 0, credito: cuenta.codigo === '2000' ? 5000000 : 0, saldoAcumulado: 0 },
    ];
    
    // Calcular saldos acumulados correctamente
    let saldo = 0;
    return baseMovimientos.map(mov => {
      const debito = mov.debito || 0;
      const credito = mov.credito || 0;
      
      // Solo incluir movimientos relevantes para esta cuenta
      if (debito === 0 && credito === 0) {
        return null;
      }
      
      saldo += debito - credito;
      return { ...mov, saldoAcumulado: saldo };
    }).filter(Boolean) as MovimientoLibroMayor[];
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };

  const calculateTotals = () => {
    let totalDebito = 0;
    let totalCredito = 0;

    movimientos.forEach(movimiento => {
      totalDebito += movimiento.debito || 0;
      totalCredito += movimiento.credito || 0;
    });

    return { totalDebito, totalCredito };
  };

  const { totalDebito, totalCredito } = calculateTotals();
  const saldoFinal = movimientos.length > 0 ? movimientos[movimientos.length - 1].saldoAcumulado : 0;

  const getPeriodoInfo = () => {
    const periodo = periodos.find(p => p.id?.toString() === selectedPeriodo);
    return periodo ? periodo.nombre : '';
  };

  return (
    <Box w="full">
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Button 
          leftIcon={<ArrowBackIcon />} 
          colorScheme="blue" 
          variant="outline" 
          onClick={onVolver}
        >
          Volver al catálogo
        </Button>
        <Heading size="md">
          Asientos de Cuenta: {cuenta.codigo} - {cuenta.nombre}
        </Heading>
      </Flex>

      <VStack spacing={4} align="stretch">
        <Box bg="app.surfaceSubtle" p={4} borderRadius="md">
          <HStack spacing={4} wrap="wrap">
            <Box flex="1" minW="200px">
              <Text fontWeight="bold">Código:</Text>
              <Text>{cuenta.codigo}</Text>
            </Box>
            <Box flex="1" minW="200px">
              <Text fontWeight="bold">Nombre:</Text>
              <Text>{cuenta.nombre}</Text>
            </Box>
            <Box flex="1" minW="200px">
              <Text fontWeight="bold">Tipo:</Text>
              <Badge colorScheme={
                cuenta.tipo === 'ACTIVO' ? 'blue' :
                cuenta.tipo === 'PASIVO' ? 'red' :
                cuenta.tipo === 'PATRIMONIO' ? 'purple' :
                cuenta.tipo === 'INGRESO' ? 'green' : 'orange'
              }>
                {cuenta.tipo}
              </Badge>
            </Box>
            <Box flex="1" minW="200px">
              <Text fontWeight="bold">Saldo Normal:</Text>
              <Text>{cuenta.saldoNormal}</Text>
            </Box>
          </HStack>
        </Box>

        <Divider />

        <Box>
          {selectedPeriodo && (
            <Flex justify="space-between" mb={4}>
              <Text fontWeight="bold">Período: {getPeriodoInfo()}</Text>
              {movimientos.length > 0 && (
                <Text fontWeight="bold">Saldo Final: {formatCurrency(saldoFinal)}</Text>
              )}
            </Flex>
          )}

          {error && (
            <Alert status="error" mb={4}>
              <AlertIcon />
              {error}
            </Alert>
          )}

          {isLoading ? (
            <Flex justify="center" align="center" h="200px">
              <Spinner size="xl" />
            </Flex>
          ) : movimientos.length > 0 ? (
            <>
              <Box overflowX="auto">
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Fecha</Th>
                      <Th>Asiento #</Th>
                      <Th>Descripción</Th>
                      <Th isNumeric>Débito</Th>
                      <Th isNumeric>Crédito</Th>
                      <Th isNumeric>Saldo</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {movimientos.map((movimiento, index) => (
                      <Tr key={index}>
                        <Td>{formatDate(movimiento.fecha)}</Td>
                        <Td>{movimiento.numeroAsiento}</Td>
                        <Td>{movimiento.descripcion}</Td>
                        <Td isNumeric>{movimiento.debito ? formatCurrency(movimiento.debito) : '-'}</Td>
                        <Td isNumeric>{movimiento.credito ? formatCurrency(movimiento.credito) : '-'}</Td>
                        <Td isNumeric>{formatCurrency(movimiento.saldoAcumulado)}</Td>
                      </Tr>
                    ))}
                    <Tr fontWeight="bold">
                      <Td colSpan={3} textAlign="right">Totales:</Td>
                      <Td isNumeric>{formatCurrency(totalDebito)}</Td>
                      <Td isNumeric>{formatCurrency(totalCredito)}</Td>
                      <Td></Td>
                    </Tr>
                  </Tbody>
                </Table>
              </Box>
              
              <MyPagination
                page={page}
                totalPages={totalPages}
                loading={isLoading}
                handlePageChange={handlePageChange}
              />
            </>
          ) : (
            <Alert status="info">
              <AlertIcon />
              No hay movimientos para esta cuenta
              {selectedPeriodo ? ' en el período seleccionado' : ''}
            </Alert>
          )}
        </Box>
      </VStack>
    </Box>
  );
};

export default DetalleAsientosCuenta;
