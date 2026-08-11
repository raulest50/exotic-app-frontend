// src/pages/ActivosFijos/Incorporacion/step_one/MetodoDepreciacion/MetodoDepreciacion.stories.tsx
import React, { useState } from 'react';
import { Box } from '@chakra-ui/react';
import { MetodoDepreciacionComponent } from './MetodoDepreciacion';
import { MetodoDepreciacion } from '../../../types';

// Interfaz para mostrar el estado actual en el story
interface Depreciacion {
  metodo: MetodoDepreciacion;
  vi: number; // valor inicial
  vf: number; // valor residual
  Dt: number; // tiempo de vida en meses
  porcentajeDB?: number; // porcentaje para método DB
}

// Historia por defecto - Método de Línea Recta (SL)
export const MetodoLineaRecta = () => {
  const [depreciacion, setDepreciacion] = useState<Depreciacion>({
    metodo: MetodoDepreciacion.SL,
    vi: 1000,
    vf: 100,
    Dt: 36
  });

  return (
    <Box maxWidth="1000px" margin="0 auto" padding="20px">
      <h2>Método de Depreciación - Línea Recta (SL)</h2>
      <MetodoDepreciacionComponent setDepreciacion={setDepreciacion} />
      
      <Box mt={6} p={4} borderWidth="1px" borderRadius="lg" bg="gray.50">
        <h3>Estado actual:</h3>
        <pre>{JSON.stringify(depreciacion, null, 2)}</pre>
      </Box>
    </Box>
  );
};

// Historia con Método de Balance Decreciente (DB)
export const MetodoBalanceDecreciente = () => {
  const [depreciacion, setDepreciacion] = useState<Depreciacion>({
    metodo: MetodoDepreciacion.DB,
    vi: 2000,
    vf: 200,
    Dt: 48,
    porcentajeDB: 20
  });

  return (
    <Box maxWidth="1000px" margin="0 auto" padding="20px">
      <h2>Método de Depreciación - Balance Decreciente (DB)</h2>
      <MetodoDepreciacionComponent setDepreciacion={setDepreciacion} />
      
      <Box mt={6} p={4} borderWidth="1px" borderRadius="lg" bg="gray.50">
        <h3>Estado actual:</h3>
        <pre>{JSON.stringify(depreciacion, null, 2)}</pre>
      </Box>
    </Box>
  );
};

// Historia con valores personalizados
export const ValoresPersonalizados = () => {
  const [depreciacion, setDepreciacion] = useState<Depreciacion>({
    metodo: MetodoDepreciacion.SL,
    vi: 5000,
    vf: 500,
    Dt: 60
  });

  return (
    <Box maxWidth="1000px" margin="0 auto" padding="20px">
      <h2>Método de Depreciación - Valores Personalizados</h2>
      <MetodoDepreciacionComponent setDepreciacion={setDepreciacion} />
      
      <Box mt={6} p={4} borderWidth="1px" borderRadius="lg" bg="gray.50">
        <h3>Estado actual:</h3>
        <pre>{JSON.stringify(depreciacion, null, 2)}</pre>
      </Box>
    </Box>
  );
};