import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/maplibre-gl")) {
            return "maplibre";
          }

          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "react-vendor";
          }

          if (id.includes("node_modules/lucide-react")) {
            return "icons";
          }
        }
      }
    }
  },
  server: {
    port: 5173,
    strictPort: false
  },
  preview: {
    port: 4173
  },
  test: {
    coverage: {
      exclude: ["src/main.tsx"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      provider: "v8",
      reporter: ["text", "json-summary"],
      thresholds: {
        branches: 80,
        functions: 85,
        lines: 90,
        statements: 90
      }
    },
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"]
  }
});
