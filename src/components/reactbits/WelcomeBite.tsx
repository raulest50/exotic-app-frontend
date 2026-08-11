import { useEffect, useState } from 'react';
import { Text } from '@chakra-ui/react';

interface WelcomeBiteProps {
  text: string;
  speed?: number; // milliseconds per character
}

export default function WelcomeBite({ text = "", speed = 80 }: WelcomeBiteProps) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    // Asegurarse de que text sea una cadena válida
    const safeText = typeof text === 'string' ? text : '';

    // Reiniciar el estado cuando cambia el texto
    setDisplay('');

    let index = 0;
    const interval = setInterval(() => {
      if (index < safeText.length) {
        // Usar una forma más segura de actualizar el estado
        setDisplay((prev) => {
          // Solo agregar el carácter si está definido
          const nextChar = safeText[index] || '';
          return prev + nextChar;
        });
        index++;
      } else {
        clearInterval(interval);
      }
    }, speed);

    // Limpiar el intervalo cuando el componente se desmonta o cuando cambian las props
    return () => clearInterval(interval);
  }, [text, speed]);

  return <Text fontSize="lg" fontWeight="bold" fontFamily="Arimo">{display}</Text>;
}
