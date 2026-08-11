import { Steps, type ThemeConfig, createSystem, defaultConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

export const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      sizes: {
        container: {
          "2xl": {
            value: "1440px",
          },
          "3xl": {
            value: "1920px",
          },
        },
      },
    },

    semanticTokens: {
      colors: {
        app: {
          surface: {
            value: {
              base: "white",
              _dark: "gray.800",
            },
          },
          surfaceSubtle: {
            value: {
              base: "gray.50",
              _dark: "gray.700",
            },
          },
          surfaceMuted: {
            value: {
              base: "gray.100",
              _dark: "whiteAlpha.200",
            },
          },
          tableHeader: {
            value: {
              base: "gray.50",
              _dark: "gray.700",
            },
          },
          tableHeaderSticky: {
            value: {
              base: "white",
              _dark: "gray.800",
            },
          },
          border: {
            value: {
              base: "gray.200",
              _dark: "gray.600",
            },
          },
          textMuted: {
            value: {
              base: "gray.600",
              _dark: "gray.400",
            },
          },
          textSubtle: {
            value: {
              base: "gray.500",
              _dark: "gray.400",
            },
          },
          inputFilled: {
            value: {
              base: "gray.200",
              _dark: "gray.700",
            },
          },
          inputReadonly: {
            value: {
              base: "gray.50",
              _dark: "whiteAlpha.100",
            },
          },
          inputReadonlyStrong: {
            value: {
              base: "gray.100",
              _dark: "whiteAlpha.200",
            },
          },
          rowHover: {
            value: {
              base: "gray.50",
              _dark: "whiteAlpha.100",
            },
          },
          rowHoverStrong: {
            value: {
              base: "gray.100",
              _dark: "whiteAlpha.200",
            },
          },
          rowSelectedBlue: {
            value: {
              base: "blue.100",
              _dark: "blue.800",
            },
          },
          rowActiveBlue: {
            value: {
              base: "blue.50",
              _dark: "blue.900",
            },
          },
          rowSelectedTeal: {
            value: {
              base: "teal.50",
              _dark: "teal.900",
            },
          },
          rowSelectedGreen: {
            value: {
              base: "green.50",
              _dark: "green.900",
            },
          },
          rowMasterGreen: {
            value: {
              base: "green.200",
              _dark: "green.800",
            },
          },
          rowWarningOrange: {
            value: {
              base: "orange.50",
              _dark: "orange.900",
            },
          },
          rowSelectedPurple: {
            value: {
              base: "purple.100",
              _dark: "purple.800",
            },
          },
          stepperTeal: {
            value: {
              base: "teal.50",
              _dark: "teal.900",
            },
          },
          stepperBlue: {
            value: {
              base: "blue.50",
              _dark: "blue.900",
            },
          },
          tabSelected: {
            value: {
              base: "blue.200",
              _dark: "blue.800",
            },
          },
          cardItemHover: {
            value: {
              base: "teal.200",
              _dark: "teal.700",
            },
          },
          cardItemBorderBlue: {
            value: {
              base: "blue.200",
              _dark: "blue.600",
            },
          },
          cardItemBorderGreen: {
            value: {
              base: "green.200",
              _dark: "green.600",
            },
          },
        },
      },
    },
  },
});

export default theme;
