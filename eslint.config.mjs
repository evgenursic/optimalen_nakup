import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "**/.next/**",
    "**/dist/**",
    "**/coverage/**",
    "**/node_modules/**",
    "convex/_generated/**",
    "lighthouse-reports/**",
    "playwright-report/**",
    "test-results/**",
  ]),
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          fixStyle: "inline-type-imports",
        },
      ],
    },
  },
]);
