import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { testLabPlugin } from "./server/test-lab/plugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), testLabPlugin()],
  build: { rollupOptions: { input: { app: path.resolve(__dirname, "index.html"), testLab: path.resolve(__dirname, "test-lab.html") } } },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
