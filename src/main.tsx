import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import "@fontsource/arimo"

import { Steps, ChakraProvider } from "@chakra-ui/react";
import {AuthProvider} from "./context/AuthContext.tsx";
import { theme } from "./theme.ts";

ReactDOM.createRoot(document.getElementById('root')!).render(

    <React.StrictMode>

      <ChakraProvider value={theme}>
          <AuthProvider>
            <App />
          </AuthProvider>
      </ChakraProvider>
    </React.StrictMode>
  ,
)
