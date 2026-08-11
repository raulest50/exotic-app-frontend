import "@fontsource/arimo"
import type { GlobalProvider } from "@ladle/react"

import { Provider as AppProvider } from "../src/components/ui/provider"
import { Toaster } from "../src/components/ui/toaster"
import "../src/index.css"

export const Provider: GlobalProvider = ({ children }) => (
  <AppProvider>
    {children}
    <Toaster />
  </AppProvider>
)
