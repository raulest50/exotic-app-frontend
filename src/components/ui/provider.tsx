"use client"

import { ChakraProvider } from "@chakra-ui/react"
import { system } from "../../theme"
import {
  ColorModeProvider,
  type ColorModeProviderProps,
} from "./color-mode"

export function Provider(props: ColorModeProviderProps) {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider
        {...props}
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        storageKey="chakra-ui-color-mode"
      />
    </ChakraProvider>
  )
}
