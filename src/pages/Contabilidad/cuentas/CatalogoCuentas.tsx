import React, { useState, useEffect } from 'react';
import { useColorModeValue } from "../../../components/ui/color-mode";
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
  Button,
  Icon,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from 'axios';
import { CuentaContable, SaldoNormal, TipoCuenta } from '../types';
import EndPointsURL from '../../../api/EndPointsURL';
import DetalleAsientosCuenta from './DetalleAsientosCuenta';
import { LuSearch } from 'react-icons/lu';

const CatalogoCuentas: React.FC = () => {
  const [cuentas, setCuentas] = useState<CuentaContable[]>([]);
  const [filteredCuentas, setFilteredCuentas] = useState<CuentaContable[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCuenta, setSelectedCuenta] = useState<CuentaContable | null>(null);
  const toast = useAppToast();
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
          <Icon as={LuSearch} color={searchIconColor} />
        </InputLeftElement>
        <Input 
          placeholder="Buscar por código o nombre" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </InputGroup>

      <Box overflowX="auto">
        <Table.Root variant="simple">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Código</Table.ColumnHeader>
              <Table.ColumnHeader>Nombre</Table.ColumnHeader>
              <Table.ColumnHeader>Tipo</Table.ColumnHeader>
              <Table.ColumnHeader>Saldo Normal</Table.ColumnHeader>
              <Table.ColumnHeader>Cuenta Control</Table.ColumnHeader>
              <Table.ColumnHeader>Acciones</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {isLoading ? (
              <Table.Row>
                <Table.Cell colSpan={6} textAlign="center">Cargando...</Table.Cell>
              </Table.Row>
            ) : !Array.isArray(filteredCuentas) ? (
              <Table.Row>
                <Table.Cell colSpan={6} textAlign="center">Error al cargar las cuentas</Table.Cell>
              </Table.Row>
            ) : filteredCuentas.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={6} textAlign="center">No se encontraron cuentas</Table.Cell>
              </Table.Row>
            ) : (
              filteredCuentas.map((cuenta) => (
                <Table.Row 
                  key={cuenta.codigo}
                  _hover={{ 
                    bg: rowHoverBg,
                    cursor: "pointer",
                    transition: "background-color 0.2s"
                  }}
                  onClick={() => handleVerAsientos(cuenta)}
                >
                  <Table.Cell>{cuenta.codigo}</Table.Cell>
                  <Table.Cell>{cuenta.nombre}</Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette={getTipoBadgeColor(cuenta.tipo)}>
                      {cuenta.tipo}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{cuenta.saldoNormal}</Table.Cell>
                  <Table.Cell>{cuenta.cuentaControl ? 'Sí' : 'No'}</Table.Cell>
                  <Table.Cell>
                    <Button
                      colorPalette="blue"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVerAsientos(cuenta);
                      }}
                    >
                      Ver asientos
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table.Root>
      </Box>
    </Box>
  );
};

export default CatalogoCuentas;
