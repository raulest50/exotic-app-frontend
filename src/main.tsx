import React from "react"
import ReactDOM from "react-dom/client"
import "@fontsource/arimo"

import App from "./App.tsx"
import { Provider } from "./components/ui/provider"
import { Toaster } from "./components/ui/toaster"
import { AuthProvider } from "./context/AuthContext.tsx"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider>
      <AuthProvider>
        <App />
      </AuthProvider>
      <Toaster />
    </Provider>
  </React.StrictMode>,
)
