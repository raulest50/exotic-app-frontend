import React, { useState } from 'react';
import { Box, Button, Text } from '@chakra-ui/react';
import { Provider } from '@/components/ui/provider';
import axios from 'axios';
import { ProcesoProduccionPicker } from './ProcesoProduccionPicker';
import { ProcesoProduccionEntity, TimeModelType } from '../../../../types.tsx';

// Mock manual de axios para las historias
const createAxiosMock = (mockImplementation: any) => {
  // Guardar la implementación original
  const originalAxiosGet = axios.get;

  // Reemplazar con nuestra implementación mock
  axios.get = mockImplementation;

  // Devolver una función para restaurar la implementación original si es necesario
  return () => {
    axios.get = originalAxiosGet;
  };
};

// Datos de ejemplo para las historias
const mockProcesos: ProcesoProduccionEntity[] = [
  {
    procesoId: 1,
    nombre: 'Proceso de Fermentación',
    recursosRequeridos: [
      {
        id: 101,
        nombre: 'Tanque de fermentación',
        descripcion: 'Tanque de acero inoxidable para fermentación',
        capacidadTotal: 1000,
        cantidadDisponible: 800,
        capacidadPorHora: 100,
        turnos: 2,
        horasPorTurno: 8
      }
    ],
    setUpTime: 30,
    constantSeconds: 120,
    model: TimeModelType.CONSTANT,
    nivelAcceso: 1
  },
  {
    procesoId: 2,
    nombre: 'Proceso de Pasteurización',
    recursosRequeridos: [
      {
        id: 102,
        nombre: 'Pasteurizador',
        descripcion: 'Equipo de pasteurización HTST',
        capacidadTotal: 500,
        cantidadDisponible: 500,
        capacidadPorHora: 50,
        turnos: 3,
        horasPorTurno: 8
      }
    ],
    setUpTime: 15,
    model: TimeModelType.THROUGHPUT_RATE,
    throughputUnitsPerSec: 2,
    nivelAcceso: 2
  },
  {
    procesoId: 3,
    nombre: 'Proceso de Envasado',
    recursosRequeridos: [
      {
        id: 103,
        nombre: 'Línea de envasado',
        descripcion: 'Línea automática de envasado y sellado',
        capacidadTotal: 2000,
        cantidadDisponible: 2000,
        capacidadPorHora: 200,
        turnos: 2,
        horasPorTurno: 8
      }
    ],
    setUpTime: 20,
    model: TimeModelType.PER_UNIT,
    secondsPerUnit: 5,
    nivelAcceso: 3
  }
];

// Historia por defecto - Muestra el componente con datos
export const Default = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProcesos, setSelectedProcesos] = useState<ProcesoProduccionEntity[]>([]);

  // Configurar el mock de axios para devolver datos
  React.useEffect(() => {
    const restore = createAxiosMock(() => 
      Promise.resolve({
        data: {
          content: mockProcesos,
          totalPages: 1
        }
      })
    );

    // Limpiar el mock cuando el componente se desmonte
    return restore;
  }, []);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);
  const handleConfirm = (procesos: ProcesoProduccionEntity[]) => {
    setSelectedProcesos(procesos);
    setIsOpen(false);
  };

  return (
    <Provider>
      <Box p={4} maxW="600px">
        <Button onClick={handleOpen} colorPalette="blue" mb={4}>
          Abrir Selector de Procesos
        </Button>

        <ProcesoProduccionPicker 
          isOpen={isOpen}
          onClose={handleClose}
          onConfirm={handleConfirm}
          alreadySelected={[]}
        />

        {selectedProcesos.length > 0 && (
          <Box mt={4} p={4} borderWidth="1px" borderRadius="md">
            <Text fontWeight="bold">Procesos seleccionados:</Text>
            {selectedProcesos.map(proceso => (
              <Box key={proceso.procesoId} mt={2}>
                <Text>• {proceso.nombre} - Modelo: {proceso.model}</Text>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Provider>
  );
};

// Historia que muestra el estado de carga
export const Loading = () => {
  const [isOpen, setIsOpen] = useState(true);

  // Configurar el mock de axios para que nunca resuelva (simular carga)
  React.useEffect(() => {
    const restore = createAxiosMock(() => new Promise(() => {}));
    return restore;
  }, []);

  return (
    <Provider>
      <Box p={4}>
        <ProcesoProduccionPicker 
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onConfirm={() => {}}
          alreadySelected={[]}
        />
      </Box>
    </Provider>
  );
};

// Historia que muestra el estado de error
export const Error = () => {
  const [isOpen, setIsOpen] = useState(true);

  // Configurar el mock de axios para rechazar la promesa
  React.useEffect(() => {
    const restore = createAxiosMock(() => 
      Promise.reject(new Error('Error al cargar los procesos'))
    );
    return restore;
  }, []);

  return (
    <Provider>
      <Box p={4}>
        <ProcesoProduccionPicker 
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onConfirm={() => {}}
          alreadySelected={[]}
        />
      </Box>
    </Provider>
  );
};

// Historia que muestra con elementos ya seleccionados
export const WithPreselected = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedProcesos, setSelectedProcesos] = useState<ProcesoProduccionEntity[]>([mockProcesos[0]]);

  // Configurar el mock de axios para devolver datos
  React.useEffect(() => {
    const restore = createAxiosMock(() => 
      Promise.resolve({
        data: {
          content: mockProcesos.slice(1),
          totalPages: 1
        }
      })
    );
    return restore;
  }, []);

  return (
    <Provider>
      <Box p={4}>
        <ProcesoProduccionPicker 
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onConfirm={setSelectedProcesos}
          alreadySelected={selectedProcesos}
        />

        {selectedProcesos.length > 0 && (
          <Box mt={4} p={4} borderWidth="1px" borderRadius="md">
            <Text fontWeight="bold">Procesos ya seleccionados:</Text>
            {selectedProcesos.map(proceso => (
              <Box key={proceso.procesoId} mt={2}>
                <Text>• {proceso.nombre}</Text>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Provider>
  );
};

// Historia que muestra múltiples páginas
export const WithPagination = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedProcesos, setSelectedProcesos] = useState<ProcesoProduccionEntity[]>([]);

  // Crear más datos para simular paginación
  const manyProcesos = Array(25).fill(null).map((_, index) => ({
    procesoId: index + 1,
    nombre: `Proceso ${index + 1}`,
    recursosRequeridos: [
      {
        id: 100 + index,
        nombre: `Recurso ${index + 1}`,
        descripcion: `Descripción del recurso ${index + 1}`,
        capacidadTotal: 1000,
        cantidadDisponible: 800,
        capacidadPorHora: 100,
        turnos: 2,
        horasPorTurno: 8
      }
    ],
    setUpTime: 10 + index,
    model: TimeModelType.CONSTANT,
    constantSeconds: 30 + index * 2,
    nivelAcceso: (index % 3) + 1 // Valores 1, 2, 3 en ciclo
  }));

  // Configurar el mock de axios para devolver datos paginados
  React.useEffect(() => {
    const restore = createAxiosMock((url: string, config: any) => {
      const page = config?.params?.page || 0;
      const size = config?.params?.size || 10;
      const start = page * size;
      const end = start + size;

      return Promise.resolve({
        data: {
          content: manyProcesos.slice(start, end),
          totalPages: Math.ceil(manyProcesos.length / size),
          number: page
        }
      });
    });

    return restore;
  }, []);

  return (
    <Provider>
      <Box p={4}>
        <ProcesoProduccionPicker 
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onConfirm={setSelectedProcesos}
          alreadySelected={[]}
        />
      </Box>
    </Provider>
  );
};
