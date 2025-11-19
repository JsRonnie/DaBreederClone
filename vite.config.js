import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      // Allow imports using '@/…' to map to the project `src` directory
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    setupFiles: "src/test/setupTests.js",
    globals: true,
    css: true,
    include: ["src/**/*.{test,spec}.{js,jsx,ts,tsx}"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom")) {
              return "vendor-react";
            }
            return "vendor";
          }
        },
      },
    },
  },
});
