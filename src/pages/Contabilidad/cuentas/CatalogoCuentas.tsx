import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  InputGroup,
  InputLeftElement,
  Badge,
  useToast,
  Button,
  useColorModeValue
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import axios from 'axios';
import { CuentaContable, SaldoNormal, TipoCuenta } from '../types';
import EndPointsURL from '../../../api/EndPointsURL';
import DetalleAsientosCuenta from './DetalleAsientosCuenta';

const CatalogoCuentas: React.FC = () => {
  const [cuentas, setCuentas] = useState<CuentaContable[]>([]);
  const [filteredCuentas, setFilteredCuentas] = useState<CuentaContable[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCuenta, setSelectedCuenta] = useState<CuentaContable | null>(null);
  const toast = useToast();
  const endpoints = new EndPointsURL();
  const rowHoverBg = useColorModeValue("blue.50", "blue.900");
  const searchIconColor = useColorModeValue("gray.300", "gray.500");

  useEffect(() => {
    fetchCuentas();
  }, []);

  useEffect(() => {
    if (!Array.isArray(cuentas)) {
      setFilteredCuentas([]);
      return;
    }

    if (searchTerm) {
      const filtered = cuentas.filter(cuenta => 
        cuenta.codigo.toLowerCase().includes(searchTerm.toLowerCase()) || 
        cuenta.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCuentas(filtered);
    } else {
      setFilteredCuentas(cuentas);
    }
  }, [searchTerm, cuentas]);

  const fetchCuentas = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(endpoints.get_cuentas);
      // Asegúrate de que response.data sea un array
      const cuentasData = Array.isArray(response.data) ? response.data : [];
      setCuentas(cuentasData);
      setFilteredCuentas(cuentasData);
    } catch (error) {
      console.error('Error fetching cuentas:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las cuentas contables',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      // Temporary mock data for development
      const mockData: CuentaContable[] = [
        { codigo: '1000', nombre: 'Caja', tipo: TipoCuenta.ACTIVO, saldoNormal: SaldoNormal.DEBITO, cuentaControl: false },
        { codigo: '1010', nombre: 'Banco', tipo: TipoCuenta.ACTIVO, saldoNormal: SaldoNormal.DEBITO, cuentaControl: false },
        { codigo: '1200', nombre: 'Inventario Materias Primas', tipo: TipoCuenta.ACTIVO, saldoNormal: SaldoNormal.DEBITO, cuentaControl: true },
        { codigo: '1210', nombre: 'Inventario WIP', tipo: TipoCuenta.ACTIVO, saldoNormal: SaldoNormal.DEBITO, cuentaControl: true },
        { codigo: '1220', nombre: 'Inventario Productos Terminados', tipo: TipoCuenta.ACTIVO, saldoNormal: SaldoNormal.DEBITO, cuentaControl: true },
        { codigo: '2000', nombre: 'Cuentas por Pagar - Proveedores', tipo: TipoCuenta.PASIVO, saldoNormal: SaldoNormal.CREDITO, cuentaControl: false },
      ];
      setCuentas(mockData);
      setFilteredCuentas(mockData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerAsientos = (cuenta: CuentaContable) => {
    setSelectedCuenta(cuenta);
  };

  const handleVolverACatalogo = () => {
    setSelectedCuenta(null);
  };

  const getTipoBadgeColor = (tipo: TipoCuenta) => {
    switch (tipo) {
      case TipoCuenta.ACTIVO:
        return 'blue';
      case TipoCuenta.PASIVO:
        return 'red';
      case TipoCuenta.PATRIMONIO:
        return 'purple';
      case TipoCuenta.INGRESO:
        return 'green';
      case TipoCuenta.GASTO:
        return 'orange';
      case TipoCuenta.COSTOS_VENTAS:
        return 'teal';
      case TipoCuenta.COSTOS_PRODUCCION:
        return 'cyan';
      default:
        return 'gray';
    }
  };

  // Renderizado condicional: mostrar catálogo o detalle de asientos
  if (selectedCuenta) {
    return <DetalleAsientosCuenta cuenta={selectedCuenta} onVolver={handleVolverACatalogo} />;
  }

  return (
    <Box w="full">
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Heading size="md">Catálogo de Cuentas</Heading>
      </Flex>

      <InputGroup mb={4}>
        <InputLeftElement pointerEvents="none">
          <SearchIcon color={searchIconColor} />
        </InputLeftElement>
        <Input 
          placeholder="Buscar por código o nombre" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </InputGroup>

      <Box overflowX="auto">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Código</Th>
              <Th>Nombre</Th>
              <Th>Tipo</Th>
              <Th>Saldo Normal</Th>
              <Th>Cuenta Control</Th>
              <Th>Acciones</Th>
            </Tr>
          </Thead>
          <Tbody>
            {isLoading ? (
              <Tr>
                <Td colSpan={6} textAlign="center">Cargando...</Td>
              </Tr>
            ) : !Array.isArray(filteredCuentas) ? (
              <Tr>
                <Td colSpan={6} textAlign="center">Error al cargar las cuentas</Td>
              </Tr>
            ) : filteredCuentas.length === 0 ? (
              <Tr>
                <Td colSpan={6} textAlign="center">No se encontraron cuentas</Td>
              </Tr>
            ) : (
              filteredCuentas.map((cuenta) => (
                <Tr 
                  key={cuenta.codigo}
                  _hover={{ 
                    bg: rowHoverBg,
                    cursor: "pointer",
                    transition: "background-color 0.2s"
                  }}
                  onClick={() => handleVerAsientos(cuenta)}
                >
                  <Td>{cuenta.codigo}</Td>
                  <Td>{cuenta.nombre}</Td>
                  <Td>
                    <Badge colorScheme={getTipoBadgeColor(cuenta.tipo)}>
                      {cuenta.tipo}
                    </Badge>
                  </Td>
                  <Td>{cuenta.saldoNormal}</Td>
                  <Td>{cuenta.cuentaControl ? 'Sí' : 'No'}</Td>
                  <Td>
                    <Button
                      colorScheme="blue"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVerAsientos(cuenta);
                      }}
                    >
                      Ver asientos
                    </Button>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
};

export default CatalogoCuentas;
