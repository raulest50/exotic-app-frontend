import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const palette = (values: readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
]) => ({
  50: { value: values[0] },
  100: { value: values[1] },
  200: { value: values[2] },
  300: { value: values[3] },
  400: { value: values[4] },
  500: { value: values[5] },
  600: { value: values[6] },
  700: { value: values[7] },
  800: { value: values[8] },
  900: { value: values[9] },
  // Chakra v3 recipes may request shade 950. Reusing v2's darkest shade
  // avoids introducing a new color while retaining the v3 recipe contract.
  950: { value: values[9] },
});

const appConfig = defineConfig({
  theme: {
    tokens: {
      sizes: {
        container: {
          "2xl": { value: "1440px" },
          "3xl": { value: "1920px" },
        },
      },
      colors: {
        black: { value: "#000000" },
        white: { value: "#FFFFFF" },
        whiteAlpha: palette([
          "rgba(255, 255, 255, 0.04)",
          "rgba(255, 255, 255, 0.06)",
          "rgba(255, 255, 255, 0.08)",
          "rgba(255, 255, 255, 0.16)",
          "rgba(255, 255, 255, 0.24)",
          "rgba(255, 255, 255, 0.36)",
          "rgba(255, 255, 255, 0.48)",
          "rgba(255, 255, 255, 0.64)",
          "rgba(255, 255, 255, 0.80)",
          "rgba(255, 255, 255, 0.92)",
        ]),
        blackAlpha: palette([
          "rgba(0, 0, 0, 0.04)",
          "rgba(0, 0, 0, 0.06)",
          "rgba(0, 0, 0, 0.08)",
          "rgba(0, 0, 0, 0.16)",
          "rgba(0, 0, 0, 0.24)",
          "rgba(0, 0, 0, 0.36)",
          "rgba(0, 0, 0, 0.48)",
          "rgba(0, 0, 0, 0.64)",
          "rgba(0, 0, 0, 0.80)",
          "rgba(0, 0, 0, 0.92)",
        ]),
        gray: palette([
          "#F7FAFC",
          "#EDF2F7",
          "#E2E8F0",
          "#CBD5E0",
          "#A0AEC0",
          "#718096",
          "#4A5568",
          "#2D3748",
          "#1A202C",
          "#171923",
        ]),
        red: palette([
          "#FFF5F5",
          "#FED7D7",
          "#FEB2B2",
          "#FC8181",
          "#F56565",
          "#E53E3E",
          "#C53030",
          "#9B2C2C",
          "#822727",
          "#63171B",
        ]),
        orange: palette([
          "#FFFAF0",
          "#FEEBC8",
          "#FBD38D",
          "#F6AD55",
          "#ED8936",
          "#DD6B20",
          "#C05621",
          "#9C4221",
          "#7B341E",
          "#652B19",
        ]),
        yellow: palette([
          "#FFFFF0",
          "#FEFCBF",
          "#FAF089",
          "#F6E05E",
          "#ECC94B",
          "#D69E2E",
          "#B7791F",
          "#975A16",
          "#744210",
          "#5F370E",
        ]),
        green: palette([
          "#F0FFF4",
          "#C6F6D5",
          "#9AE6B4",
          "#68D391",
          "#48BB78",
          "#38A169",
          "#2F855A",
          "#276749",
          "#22543D",
          "#1C4532",
        ]),
        teal: palette([
          "#E6FFFA",
          "#B2F5EA",
          "#81E6D9",
          "#4FD1C5",
          "#38B2AC",
          "#319795",
          "#2C7A7B",
          "#285E61",
          "#234E52",
          "#1D4044",
        ]),
        blue: palette([
          "#EBF8FF",
          "#BEE3F8",
          "#90CDF4",
          "#63B3ED",
          "#4299E1",
          "#3182CE",
          "#2B6CB0",
          "#2C5282",
          "#2A4365",
          "#1A365D",
        ]),
        cyan: palette([
          "#EDFDFD",
          "#C4F1F9",
          "#9DECF9",
          "#76E4F7",
          "#0BC5EA",
          "#00B5D8",
          "#00A3C4",
          "#0987A0",
          "#086F83",
          "#065666",
        ]),
        purple: palette([
          "#FAF5FF",
          "#E9D8FD",
          "#D6BCFA",
          "#B794F4",
          "#9F7AEA",
          "#805AD5",
          "#6B46C1",
          "#553C9A",
          "#44337A",
          "#322659",
        ]),
        pink: palette([
          "#FFF5F7",
          "#FED7E2",
          "#FBB6CE",
          "#F687B3",
          "#ED64A6",
          "#D53F8C",
          "#B83280",
          "#97266D",
          "#702459",
          "#521B41",
        ]),
      },
    },
    semanticTokens: {
      colors: {
        app: {
          surface: {
            value: {
              _light: "{colors.white}",
              _dark: "{colors.gray.800}",
            },
          },
          surfaceSubtle: {
            value: {
              _light: "{colors.gray.50}",
              _dark: "{colors.gray.700}",
            },
          },
          surfaceMuted: {
            value: {
              _light: "{colors.gray.100}",
              _dark: "{colors.whiteAlpha.200}",
            },
          },
          tableHeader: {
            value: {
              _light: "{colors.gray.50}",
              _dark: "{colors.gray.700}",
            },
          },
          tableHeaderSticky: {
            value: {
              _light: "{colors.white}",
              _dark: "{colors.gray.800}",
            },
          },
          border: {
            value: {
              _light: "{colors.gray.200}",
              _dark: "{colors.gray.600}",
            },
          },
          textMuted: {
            value: {
              _light: "{colors.gray.600}",
              _dark: "{colors.gray.400}",
            },
          },
          textSubtle: {
            value: {
              _light: "{colors.gray.500}",
              _dark: "{colors.gray.400}",
            },
          },
          inputFilled: {
            value: {
              _light: "{colors.gray.200}",
              _dark: "{colors.gray.700}",
            },
          },
          inputReadonly: {
            value: {
              _light: "{colors.gray.50}",
              _dark: "{colors.whiteAlpha.100}",
            },
          },
          inputReadonlyStrong: {
            value: {
              _light: "{colors.gray.100}",
              _dark: "{colors.whiteAlpha.200}",
            },
          },
          rowHover: {
            value: {
              _light: "{colors.gray.50}",
              _dark: "{colors.whiteAlpha.100}",
            },
          },
          rowHoverStrong: {
            value: {
              _light: "{colors.gray.100}",
              _dark: "{colors.whiteAlpha.200}",
            },
          },
          rowSelectedBlue: {
            value: {
              _light: "{colors.blue.100}",
              _dark: "{colors.blue.800}",
            },
          },
          rowActiveBlue: {
            value: {
              _light: "{colors.blue.50}",
              _dark: "{colors.blue.900}",
            },
          },
          rowSelectedTeal: {
            value: {
              _light: "{colors.teal.50}",
              _dark: "{colors.teal.900}",
            },
          },
          rowSelectedGreen: {
            value: {
              _light: "{colors.green.50}",
              _dark: "{colors.green.900}",
            },
          },
          rowMasterGreen: {
            value: {
              _light: "{colors.green.200}",
              _dark: "{colors.green.800}",
            },
          },
          rowWarningOrange: {
            value: {
              _light: "{colors.orange.50}",
              _dark: "{colors.orange.900}",
            },
          },
          rowSelectedPurple: {
            value: {
              _light: "{colors.purple.100}",
              _dark: "{colors.purple.800}",
            },
          },
          stepperTeal: {
            value: {
              _light: "{colors.teal.50}",
              _dark: "{colors.teal.900}",
            },
          },
          stepperBlue: {
            value: {
              _light: "{colors.blue.50}",
              _dark: "{colors.blue.900}",
            },
          },
          tabSelected: {
            value: {
              _light: "{colors.blue.200}",
              _dark: "{colors.blue.800}",
            },
          },
          cardItemHover: {
            value: {
              _light: "{colors.teal.200}",
              _dark: "{colors.teal.700}",
            },
          },
          cardItemBorderBlue: {
            value: {
              _light: "{colors.blue.200}",
              _dark: "{colors.blue.600}",
            },
          },
          cardItemBorderGreen: {
            value: {
              _light: "{colors.green.200}",
              _dark: "{colors.green.600}",
            },
          },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, appConfig);

export default system;
