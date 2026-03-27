import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import "@fontsource/arimo"

import {ChakraProvider, ColorModeScript} from "@chakra-ui/react";

import { extendTheme, type ThemeConfig } from "@chakra-ui/react";
import {AuthProvider} from "./context/AuthContext.tsx";

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  sizes: {
    container: {
      "2xl": "1440px",
      "3xl": "1920px", // Define your custom size here
    },
  },
});


ReactDOM.createRoot(document.getElementById('root')!).render(

    <React.StrictMode>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ChakraProvider theme={theme}>
          <AuthProvider>
            <App />
          </AuthProvider>
      </ChakraProvider>
    </React.StrictMode>
  ,
)
