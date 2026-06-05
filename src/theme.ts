import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

export const theme = extendTheme({
  config,
  sizes: {
    container: {
      "2xl": "1440px",
      "3xl": "1920px",
    },
  },
  semanticTokens: {
    colors: {
      app: {
        surface: {
          default: "white",
          _dark: "gray.800",
        },
        surfaceSubtle: {
          default: "gray.50",
          _dark: "gray.700",
        },
        surfaceMuted: {
          default: "gray.100",
          _dark: "whiteAlpha.200",
        },
        tableHeader: {
          default: "gray.50",
          _dark: "gray.700",
        },
        tableHeaderSticky: {
          default: "white",
          _dark: "gray.800",
        },
        border: {
          default: "gray.200",
          _dark: "gray.600",
        },
        textMuted: {
          default: "gray.600",
          _dark: "gray.400",
        },
        textSubtle: {
          default: "gray.500",
          _dark: "gray.400",
        },
        inputFilled: {
          default: "gray.200",
          _dark: "gray.700",
        },
        inputReadonly: {
          default: "gray.50",
          _dark: "whiteAlpha.100",
        },
        inputReadonlyStrong: {
          default: "gray.100",
          _dark: "whiteAlpha.200",
        },
        rowHover: {
          default: "gray.50",
          _dark: "whiteAlpha.100",
        },
        rowHoverStrong: {
          default: "gray.100",
          _dark: "whiteAlpha.200",
        },
        rowSelectedBlue: {
          default: "blue.100",
          _dark: "blue.800",
        },
        rowActiveBlue: {
          default: "blue.50",
          _dark: "blue.900",
        },
        rowSelectedTeal: {
          default: "teal.50",
          _dark: "teal.900",
        },
        rowSelectedGreen: {
          default: "green.50",
          _dark: "green.900",
        },
        rowMasterGreen: {
          default: "green.200",
          _dark: "green.800",
        },
        rowWarningOrange: {
          default: "orange.50",
          _dark: "orange.900",
        },
        rowSelectedPurple: {
          default: "purple.100",
          _dark: "purple.800",
        },
        stepperTeal: {
          default: "teal.50",
          _dark: "teal.900",
        },
        stepperBlue: {
          default: "blue.50",
          _dark: "blue.900",
        },
        tabSelected: {
          default: "blue.200",
          _dark: "blue.800",
        },
        cardItemHover: {
          default: "teal.200",
          _dark: "teal.700",
        },
        cardItemBorderBlue: {
          default: "blue.200",
          _dark: "blue.600",
        },
        cardItemBorderGreen: {
          default: "green.200",
          _dark: "green.600",
        },
      },
    },
  },
});

export default theme;
