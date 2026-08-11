// src/pages/LoginPage/CoolDownAnim.tsx
import React, { useEffect, useState } from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import { Tooltip } from '@/components/ui/tooltip';
import { BiTime } from 'react-icons/bi';

interface CoolDownAnimProps {
  duration: number; // duración en milisegundos
  isActive: boolean;
  onComplete?: () => void;
}

const CoolDownAnim: React.FC<CoolDownAnimProps> = ({ 
  duration = 60000, // 60 segundos por defecto
  isActive,
  onComplete 
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        const newTimeLeft = timeLeft - 100;
        setTimeLeft(newTimeLeft);
        setProgress(100 - (newTimeLeft / duration * 100));

        if (newTimeLeft <= 0) {
          clearInterval(interval);
          if (onComplete) onComplete();
        }
      }, 100);
    } else if (!isActive) {
      setTimeLeft(duration);
      setProgress(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, duration, onComplete]);

  // Ensure onComplete is called when timeLeft reaches 0
  useEffect(() => {
    if (timeLeft <= 0 && isActive && onComplete) {
      onComplete();
    }
  }, [timeLeft, isActive, onComplete]);

  // Formatear el tiempo restante en segundos
  const secondsLeft = Math.ceil(timeLeft / 1000);

  // Determinar el color basado en el progreso
  const getColor = () => {
    if (progress < 33) return "red.500";
    if (progress < 66) return "yellow.500";
    return "green.500";
  };

  // No mostrar nada si no está activo o si el tiempo ha terminado
  if (!isActive || timeLeft <= 0) return null;

  return (
    <Tooltip content={`Espera ${secondsLeft} segundos para enviar otro correo`}>
      <Flex 
        direction="column" 
        align="center" 
        justify="center"
        position="relative"
        width="50px"
        height="50px"
      >
        {/* Icono de reloj moderno */}
        <Box size="32px" color="gray.400" position="absolute" zIndex="1" asChild><BiTime /></Box>

        {/* Contenedor de la animación de llenado */}
        <Box 
          position="absolute"
          bottom="0"
          width="100%"
          height="100%"
          borderRadius="md"
          overflow="hidden"
        >
          {/* Barra de progreso que se llena de abajo hacia arriba */}
          <Box 
            position="absolute"
            bottom="0"
            width="100%"
            height={`${progress}%`}
            bg={getColor()}
            transition="height 0.3s, background-color 0.5s"
            opacity="0.7"
          />
        </Box>

        {/* Texto con el tiempo restante */}
        <Text 
          position="absolute" 
          bottom="-28px" 
          fontSize="sm" 
          fontWeight="bold"
        >
          {secondsLeft}s
        </Text>
      </Flex>
    </Tooltip>
  );
};

export default CoolDownAnim;
