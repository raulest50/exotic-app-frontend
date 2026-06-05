import { useState, useEffect, useMemo } from 'react';
import {
  Select, 
  FormControl, 
  FormLabel, 
  NumberInput, 
  NumberInputField, 
  NumberInputStepper, 
  NumberIncrementStepper, 
  NumberDecrementStepper,
  VStack,
  Text,
  Box,
  Flex,
} from '@chakra-ui/react';
import ReactECharts from 'echarts-for-react';

import { MetodoDepreciacion } from "../../../types.tsx";

interface Depreciacion {
  metodo: MetodoDepreciacion;
  vi: number; // valor inicial
  vf: number; // valor residual
  Dt: number; // tiempo de vida en meses
  porcentajeDB?: number; // porcentaje para método DB
}

type Props = {
  setDepreciacion: (depreciacion: Depreciacion) => void;
  initialValue?: number; // Valor inicial opcional
  initialResidualValue?: number; // Valor residual opcional
};

export function MetodoDepreciacionComponent(props: Props) {
  const { setDepreciacion, initialValue = 1000, initialResidualValue = 0 } = props;

  const [metodoDepreciacion, setMetodoDepreciacion] = useState<MetodoDepreciacion>(MetodoDepreciacion.SL);
  const [valorInicial, setValorInicial] = useState<number>(initialValue);
  const [valorResidual, setValorResidual] = useState<number>(initialResidualValue);
  const [tiempoDeVida, setTiempoDeVida] = useState<number>(36);
  const [porcentajeDB, setPorcentajeDB] = useState<number>(20);

  // Actualizar los valores cuando cambien las props
  useEffect(() => {
    setValorInicial(initialValue);
    setValorResidual(initialResidualValue);
  }, [initialValue, initialResidualValue]);

  // Actualizar el estado de depreciación cuando cambie cualquier valor
  useEffect(() => {
    setDepreciacion({
      metodo: metodoDepreciacion,
      vi: valorInicial,
      vf: valorResidual,
      Dt: tiempoDeVida,
      ...(metodoDepreciacion === MetodoDepreciacion.DB && { porcentajeDB })
    });
  }, [metodoDepreciacion, valorInicial, valorResidual, tiempoDeVida, porcentajeDB, setDepreciacion]);

  // Calcular los valores de depreciación para cada mes
  interface DepreciacionData {
    meses: number[];
    valores: number[];
  }

  const depreciacionData: DepreciacionData = useMemo(() => {
    if (tiempoDeVida <= 0 || valorInicial <= 0)
      return { meses: [], valores: [] };

    const meses = Array.from({ length: tiempoDeVida + 1 }, (_, i) => i);
    const valores = [];

    // Valor inicial
    valores.push(valorInicial);

    if (metodoDepreciacion === MetodoDepreciacion.SL) {
      // Método de línea recta (SL)
      const depreciacionMensual = (valorInicial - valorResidual) / tiempoDeVida;

      for (let i = 1; i <= tiempoDeVida; i++) {
        const valorActual = valorInicial - (depreciacionMensual * i);
        valores.push(Math.max(valorActual, valorResidual));
      }
    } else {
      // Método de balance decreciente (DB)
      const tasaAnual = porcentajeDB / 100;
      const tasaMensual = tasaAnual / 12;

      let valorActual = valorInicial;

      for (let i = 1; i <= tiempoDeVida; i++) {
        valorActual = valorActual * (1 - tasaMensual);

        // Si el valor es menor que el valor residual, usar el valor residual
        if (valorActual < valorResidual) {
          valorActual = valorResidual;
        }

        valores.push(valorActual);
      }
    }

    return { meses, valores };
  }, [metodoDepreciacion, valorInicial, valorResidual, tiempoDeVida, porcentajeDB]);

  // Opciones para el gráfico ECharts
  const chartOptions = useMemo(() => {
    if (depreciacionData.meses.length === 0) {
      return {};
    }

    return {
      title: {
        text: 'Proyección de Depreciación',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: Array<{ axisValue: number; data: number }>) => {
          const mes = params[0].axisValue;
          const valor = params[0].data;
          return `Mes ${mes}: $${valor.toFixed(2)}`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        name: 'Meses',
        nameLocation: 'middle',
        nameGap: 30,
        data: depreciacionData.meses,
        splitLine: {
          show: true,
          lineStyle: {
            type: 'dashed'
          }
        }
      },
      yAxis: {
        type: 'value',
        name: 'Valor del Activo',
        nameLocation: 'middle',
        nameGap: 50,
        splitLine: {
          show: true,
          lineStyle: {
            type: 'dashed'
          }
        }
      },
      series: [
        {
          name: 'Valor del Activo',
          type: 'line',
          data: depreciacionData.valores,
          smooth: true,
          lineStyle: {
            width: 3,
            color: '#3182CE'
          },
          itemStyle: {
            color: '#3182CE'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: 'rgba(49, 130, 206, 0.5)'
                },
                {
                  offset: 1,
                  color: 'rgba(49, 130, 206, 0.1)'
                }
              ]
            }
          }
        }
      ]
    };
  }, [depreciacionData]);

  return (
    <Flex direction={{ base: 'column', md: 'row' }} gap={4} align="stretch" w="full">
      {/* Formulario de inputs (ahora vertical) */}
      <VStack spacing={4} align="stretch" w={{ base: 'full', md: '40%' }} pr={{ md: 4 }}>
        <Box p={4} borderWidth="1px" borderRadius="lg" bg="app.surface">
          <Text fontSize="xl" fontWeight="bold" mb={4}>Método de Depreciación</Text>

          <FormControl mb={4}>
            <FormLabel>Método de Depreciación</FormLabel>
            <Select
              value={metodoDepreciacion}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setMetodoDepreciacion(e.target.value as MetodoDepreciacion)
              }
            >
              <option value={MetodoDepreciacion.SL}>Línea Recta (SL)</option>
              <option value={MetodoDepreciacion.DB}>Balance Decreciente (DB)</option>
            </Select>
          </FormControl>

          <FormControl mb={4}>
            <FormLabel>Valor Inicial</FormLabel>
            <NumberInput
              value={valorInicial}
              isReadOnly={true}
              min={0}
              bg="app.inputReadonlyStrong" // Indicación visual de que es de solo lectura
            >
              <NumberInputField />
            </NumberInput>
            <Text fontSize="sm" color="app.textSubtle" mt={1}>
              Este valor se toma automáticamente del "Valor unitario con IVA" del grupo
            </Text>
          </FormControl>

          <FormControl mb={4}>
            <FormLabel>Valor Residual</FormLabel>
            <NumberInput
              value={valorResidual}
              onChange={(
                _valueAsString: string,
                valueAsNumber: number
              ) => setValorResidual(valueAsNumber)}
              min={0}
              max={valorInicial}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>

          <FormControl mb={4}>
            <FormLabel>Tiempo de Vida (meses)</FormLabel>
            <NumberInput
              value={tiempoDeVida}
              onChange={(
                _valueAsString: string,
                valueAsNumber: number
              ) => setTiempoDeVida(valueAsNumber)}
              min={1}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>

          {metodoDepreciacion === MetodoDepreciacion.DB && (
            <FormControl>
              <FormLabel>Porcentaje (%)</FormLabel>
              <NumberInput
                value={porcentajeDB}
                onChange={(
                  _valueAsString: string,
                  valueAsNumber: number
                ) => setPorcentajeDB(valueAsNumber)}
                min={0}
                max={100}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
          )}
        </Box>
      </VStack>

      {/* Gráfico de depreciación */}
      <Box w={{ base: 'full', md: '60%' }} mt={{ base: 4, md: 0 }} p={4} borderWidth="1px" borderRadius="lg" bg="app.surface">
        {depreciacionData.meses && depreciacionData.meses.length > 0 ? (
          <ReactECharts 
            option={chartOptions} 
            style={{ height: '400px', width: '100%' }}
          />
        ) : (
          <Text textAlign="center" color="app.textSubtle" py={10}>
            Ingrese valores válidos para visualizar la proyección de depreciación
          </Text>
        )}
      </Box>
    </Flex>
  );
}
