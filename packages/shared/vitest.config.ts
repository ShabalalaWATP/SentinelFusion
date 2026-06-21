import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["src/types.ts"],
      include: ["src/**/*.ts"],
      provider: "v8",
      reporter: ["text", "json-summary"],
      thresholds: {
        branches: 70,
        functions: 80,
        lines: 95,
        statements: 95
      }
    },
    environment: "node",
    include: ["tests/**/*.test.ts"]
  }
});
