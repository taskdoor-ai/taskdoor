import { fileURLToPath } from "node:url";
import { build } from "vite";
import react from "@vitejs/plugin-react";

await build({
  root: fileURLToPath(new URL("../", import.meta.url)),
  configFile: false, publicDir: false, logLevel: "warn",
  plugins: [react()],
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: "public/shared", emptyOutDir: false, minify: true,
    lib: {
      entry: fileURLToPath(new URL("../src/prd/StandaloneToast.tsx", import.meta.url)),
      name: "AgentDoorFeedback", formats: ["iife"],
      fileName: () => "agentdoor-toast.js", cssFileName: "agentdoor-toast",
    },
  },
});
