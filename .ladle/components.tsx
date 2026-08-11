import '@fontsource/arimo';
import '../src/index.css';

import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import type { GlobalProvider } from '@ladle/react';
import { theme } from '../src/theme';

export const Provider: GlobalProvider = ({ children }) => {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ChakraProvider theme={theme}>{children}</ChakraProvider>
    </>
  );
};
