import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["src/domain/interfaces.ts", "src/server.ts"],
      include: ["src/**/*.ts"],
      provider: "v8",
      reporter: ["text", "json-summary"],
      thresholds: {
        branches: 80,
        functions: 95,
        lines: 95,
        statements: 95
      }
    },
    environment: "node",
    include: ["tests/**/*.test.ts"]
  }
});
