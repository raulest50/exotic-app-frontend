import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import "@fontsource/arimo"

import {ChakraProvider, ColorModeScript} from "@chakra-ui/react";
import {AuthProvider} from "./context/AuthContext.tsx";
import { theme } from "./theme.ts";

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
