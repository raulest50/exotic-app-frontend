import js from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

const typescriptFiles = ["**/*.{ts,tsx}"];

// Scope every item from the official preset to TypeScript. Its base item also
// installs the parser and plugin, while eslint-recommended remains responsible
// for JavaScript files.
const typescriptRecommended = typescriptEslint.configs["flat/recommended"].map(
  (config) => ({
    ...config,
    files: typescriptFiles,
  }),
);

export default [
  {
    ignores: ["build/**", "dist/**"],
  },
  js.configs.recommended,
  ...typescriptRecommended,
  {
    files: ["src/**/*.{ts,tsx}", ".ladle/components.tsx", "sandbox.tsx"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: [
      "eslint.config.js",
      "eslint.gate.config.js",
      ".ladle/config.mjs",
      "vite.config.ts",
      "scripts/**/*.{js,mjs,cjs,ts,tsx}",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.bunBuiltin,
      },
    },
  },
  {
    files: typescriptFiles,
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // React Hooks 7 includes React Compiler rules in its recommended preset.
      // Preserve only the two rules that were active before this migration.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
  },
];
