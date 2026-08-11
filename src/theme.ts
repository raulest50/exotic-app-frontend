import {
  createSystem,
  defaultConfig,
  defineConfig,
} from "@chakra-ui/react";
import {
  buttonRecipe,
  checkboxSlotRecipe,
  dialogSlotRecipe,
  drawerSlotRecipe,
  fieldSlotRecipe,
  inputRecipe,
  nativeSelectSlotRecipe,
  numberInputSlotRecipe,
  tableSlotRecipe,
  tabsSlotRecipe,
} from "@chakra-ui/react/theme";

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

const v2ColorPalette = (name: string) => ({
  contrast: {
    value: {
      _light: "{colors.white}",
      _dark: "{colors.gray.800}",
    },
  },
  fg: {
    value: {
      _light: `{colors.${name}.600}`,
      _dark: `{colors.${name}.200}`,
    },
  },
  subtle: {
    value: {
      _light: `{colors.${name}.100}`,
      _dark: `{colors.${name}.900}`,
    },
  },
  muted: {
    value: {
      _light: `{colors.${name}.200}`,
      _dark: `{colors.${name}.800}`,
    },
  },
  emphasized: {
    value: {
      _light: `{colors.${name}.300}`,
      _dark: `{colors.${name}.700}`,
    },
  },
  solid: {
    value: {
      _light: `{colors.${name}.500}`,
      _dark: `{colors.${name}.200}`,
    },
  },
  focusRing: {
    value: {
      _light: `{colors.${name}.500}`,
      _dark: `{colors.${name}.200}`,
    },
  },
  border: {
    value: {
      _light: `{colors.${name}.500}`,
      _dark: `{colors.${name}.200}`,
    },
  },
});

const appButtonRecipe = {
  ...buttonRecipe,
  variants: {
    ...buttonRecipe.variants,
    size: {
      ...buttonRecipe.variants?.size,
      md: {
        ...buttonRecipe.variants?.size?.md,
        textStyle: "md",
      },
    },
  },
} as unknown as typeof buttonRecipe;

const appInputRecipe = {
  ...inputRecipe,
  base: {
    ...inputRecipe.base,
    borderRadius: "md",
  },
  variants: {
    ...inputRecipe.variants,
    size: {
      ...inputRecipe.variants?.size,
      md: {
        ...inputRecipe.variants?.size?.md,
        textStyle: "md",
        px: "4",
      },
    },
    variant: {
      ...inputRecipe.variants?.variant,
      outline: {
        ...inputRecipe.variants?.variant?.outline,
        _invalid: {
          boxShadow: "0 0 0 1px var(--error-color)",
        },
      },
    },
  },
} as unknown as typeof inputRecipe;

const appFieldSlotRecipe = {
  ...fieldSlotRecipe,
  base: {
    ...fieldSlotRecipe.base,
    root: {
      ...fieldSlotRecipe.base?.root,
      gap: "2",
    },
    label: {
      ...fieldSlotRecipe.base?.label,
      textStyle: "md",
    },
    helperText: {
      ...fieldSlotRecipe.base?.helperText,
      textStyle: "sm",
      lineHeight: "normal",
    },
    errorText: {
      ...fieldSlotRecipe.base?.errorText,
      textStyle: "sm",
      lineHeight: "normal",
      fontWeight: "normal",
    },
  },
} as unknown as typeof fieldSlotRecipe;

const appNativeSelectSlotRecipe = {
  ...nativeSelectSlotRecipe,
  variants: {
    ...nativeSelectSlotRecipe.variants,
    size: {
      ...nativeSelectSlotRecipe.variants?.size,
      md: {
        ...nativeSelectSlotRecipe.variants?.size?.md,
        field: {
          ...nativeSelectSlotRecipe.variants?.size?.md?.field,
          textStyle: "md",
          ps: "4",
          borderRadius: "md",
        },
      },
    },
  },
} as unknown as typeof nativeSelectSlotRecipe;

const appNumberInputSlotRecipe = {
  ...numberInputSlotRecipe,
  base: {
    ...numberInputSlotRecipe.base,
    root: {
      ...numberInputSlotRecipe.base?.root,
      width: "full",
    },
    input: {
      ...numberInputSlotRecipe.base?.input,
      borderRadius: "md",
    },
    incrementTrigger: {
      ...numberInputSlotRecipe.base?.incrementTrigger,
      borderTopEndRadius: "md",
    },
    decrementTrigger: {
      ...numberInputSlotRecipe.base?.decrementTrigger,
      borderBottomEndRadius: "md",
    },
  },
  variants: {
    ...numberInputSlotRecipe.variants,
    size: {
      ...numberInputSlotRecipe.variants?.size,
      md: {
        ...numberInputSlotRecipe.variants?.size?.md,
        input: {
          ...numberInputSlotRecipe.variants?.size?.md?.input,
          textStyle: "md",
          px: "4",
        },
      },
    },
  },
} as unknown as typeof numberInputSlotRecipe;

const appCheckboxSlotRecipe = {
  ...checkboxSlotRecipe,
  variants: {
    ...checkboxSlotRecipe.variants,
    size: {
      ...checkboxSlotRecipe.variants?.size,
      md: {
        ...checkboxSlotRecipe.variants?.size?.md,
        root: { gap: "2" },
        label: { textStyle: "md", fontWeight: "normal" },
        control: { boxSize: "4" },
      },
    },
  },
} as unknown as typeof checkboxSlotRecipe;

const appTableSlotRecipe = {
  ...tableSlotRecipe,
  variants: {
    ...tableSlotRecipe.variants,
    variant: {
      ...tableSlotRecipe.variants?.variant,
      line: {
        ...tableSlotRecipe.variants?.variant?.line,
        row: {
          ...tableSlotRecipe.variants?.variant?.line?.row,
          bg: "transparent",
        },
      },
    },
    size: {
      ...tableSlotRecipe.variants?.size,
      sm: {
        ...tableSlotRecipe.variants?.size?.sm,
        columnHeader: {
          ...tableSlotRecipe.variants?.size?.sm?.columnHeader,
          px: "4",
          py: "1",
          textStyle: "xs",
          fontWeight: "bold",
          textTransform: "uppercase",
          letterSpacing: "wider",
        },
        cell: {
          ...tableSlotRecipe.variants?.size?.sm?.cell,
          px: "4",
          py: "1.5",
          lineHeight: "4",
        },
      },
    },
  },
} as unknown as typeof tableSlotRecipe;

const appDialogSlotRecipe = {
  ...dialogSlotRecipe,
  base: {
    ...dialogSlotRecipe.base,
    backdrop: {
      ...dialogSlotRecipe.base?.backdrop,
      bg: "blackAlpha.600",
    },
    content: {
      ...dialogSlotRecipe.base?.content,
      textStyle: "md",
    },
    header: {
      ...dialogSlotRecipe.base?.header,
      pt: "4",
    },
    body: {
      ...dialogSlotRecipe.base?.body,
      pb: "4",
    },
    title: {
      ...dialogSlotRecipe.base?.title,
      textStyle: "xl",
    },
  },
} as unknown as typeof dialogSlotRecipe;

const appDrawerSlotRecipe = {
  ...drawerSlotRecipe,
  base: {
    ...drawerSlotRecipe.base,
    backdrop: {
      ...drawerSlotRecipe.base?.backdrop,
      bg: "blackAlpha.600",
    },
    content: {
      ...drawerSlotRecipe.base?.content,
      textStyle: "md",
    },
    header: {
      ...drawerSlotRecipe.base?.header,
      pt: "4",
    },
    footer: {
      ...drawerSlotRecipe.base?.footer,
      pt: "4",
    },
    title: {
      ...drawerSlotRecipe.base?.title,
      textStyle: "xl",
    },
  },
} as unknown as typeof drawerSlotRecipe;

const appTabsSlotRecipe = {
  ...tabsSlotRecipe,
  base: {
    ...tabsSlotRecipe.base,
    content: {
      ...tabsSlotRecipe.base?.content,
      px: "4",
      pb: "4",
    },
  },
} as unknown as typeof tabsSlotRecipe;

const appConfig = defineConfig({
  globalCss: {
    // When CloseTrigger composes a CloseButton with asChild, Button's
    // position:relative otherwise wins over the overlay slot recipe.
    ".chakra-dialog__closeTrigger, .chakra-drawer__closeTrigger": {
      position: "absolute !important",
      width: "32px !important",
      minWidth: "32px !important",
      height: "32px !important",
    },
    ".chakra-field__label[data-required]::after": {
      content: '"*"',
      color: "fg.error",
    },
    '.chakra-toast__root[data-type="success"]': {
      bg: {
        _light: "green.600",
        _dark: "green.200",
      },
    },
  },
  theme: {
    recipes: {
      button: appButtonRecipe,
      input: appInputRecipe,
    },
    slotRecipes: {
      checkbox: appCheckboxSlotRecipe,
      dialog: appDialogSlotRecipe,
      drawer: appDrawerSlotRecipe,
      field: appFieldSlotRecipe,
      nativeSelect: appNativeSelectSlotRecipe,
      numberInput: appNumberInputSlotRecipe,
      table: appTableSlotRecipe,
      tabs: appTabsSlotRecipe,
    },
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
        bg: {
          DEFAULT: {
            value: {
              _light: "{colors.white}",
              _dark: "{colors.gray.800}",
            },
          },
          subtle: {
            value: {
              _light: "{colors.gray.50}",
              _dark: "{colors.gray.700}",
            },
          },
          muted: {
            value: {
              _light: "{colors.gray.100}",
              _dark: "{colors.gray.600}",
            },
          },
          emphasized: {
            value: {
              _light: "{colors.gray.200}",
              _dark: "{colors.gray.500}",
            },
          },
          panel: {
            value: {
              _light: "{colors.white}",
              _dark: "{colors.gray.700}",
            },
          },
        },
        fg: {
          DEFAULT: {
            value: {
              _light: "{colors.gray.800}",
              _dark: "{colors.gray.100}",
            },
          },
          muted: {
            value: {
              _light: "{colors.gray.600}",
              _dark: "{colors.gray.400}",
            },
          },
          subtle: {
            value: {
              _light: "{colors.gray.500}",
              _dark: "{colors.gray.400}",
            },
          },
        },
        border: {
          DEFAULT: {
            value: {
              _light: "{colors.gray.200}",
              _dark: "{colors.gray.600}",
            },
          },
          muted: {
            value: {
              _light: "{colors.gray.100}",
              _dark: "{colors.gray.700}",
            },
          },
          subtle: {
            value: {
              _light: "{colors.gray.50}",
              _dark: "{colors.gray.700}",
            },
          },
          emphasized: {
            value: {
              _light: "{colors.gray.300}",
              _dark: "{colors.gray.500}",
            },
          },
        },
        gray: {
          contrast: {
            value: {
              _light: "{colors.gray.800}",
              _dark: "{colors.gray.100}",
            },
          },
          fg: {
            value: {
              _light: "{colors.gray.800}",
              _dark: "{colors.gray.100}",
            },
          },
          subtle: {
            value: {
              _light: "{colors.gray.100}",
              _dark: "{colors.whiteAlpha.200}",
            },
          },
          muted: {
            value: {
              _light: "{colors.gray.200}",
              _dark: "{colors.whiteAlpha.300}",
            },
          },
          emphasized: {
            value: {
              _light: "{colors.gray.300}",
              _dark: "{colors.whiteAlpha.400}",
            },
          },
          solid: {
            value: {
              _light: "{colors.gray.100}",
              _dark: "{colors.whiteAlpha.200}",
            },
          },
          focusRing: {
            value: {
              _light: "{colors.blue.500}",
              _dark: "{colors.blue.300}",
            },
          },
          border: {
            value: {
              _light: "{colors.gray.200}",
              _dark: "{colors.gray.600}",
            },
          },
        },
        red: v2ColorPalette("red"),
        orange: v2ColorPalette("orange"),
        yellow: v2ColorPalette("yellow"),
        green: v2ColorPalette("green"),
        teal: v2ColorPalette("teal"),
        blue: v2ColorPalette("blue"),
        cyan: v2ColorPalette("cyan"),
        purple: v2ColorPalette("purple"),
        pink: v2ColorPalette("pink"),
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
