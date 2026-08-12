import config from "./eslint.config.js";

export default [
  ...config,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // Bulk suppressions only apply to errors. Promote the two editor warnings
      // in the gate so every new occurrence is checked against the baseline.
      "react-hooks/exhaustive-deps": "error",
      "react-refresh/only-export-components": "error",
    },
  },
];
