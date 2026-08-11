import '@fontsource/arimo';
import '../src/index.css';

import { Steps, ChakraProvider } from '@chakra-ui/react';
import type { GlobalProvider } from '@ladle/react';
import { theme } from '../src/theme';

export const Provider: GlobalProvider = ({ children }) => {
  return (
    <>

      <ChakraProvider value={theme}>{children}</ChakraProvider>
    </>
  );
};
