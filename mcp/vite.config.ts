import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  root: "mcp",
  plugins: [viteSingleFile()],
  build: {
    outDir: "../dist-mcp/ui",
    emptyOutDir: true,
    rollupOptions: { input: "mcp/task-card.html" },
  },
});
