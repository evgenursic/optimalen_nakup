import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/**/*.test.ts",
      "app/**/*.test.ts",
      "components/**/*.test.ts",
      "lib/**/*.test.ts",
    ],
  },
});
