import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ["jspdf", "pdf-lib"],
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-pdf":   ["pdf-lib", "jspdf"],
          "acl-app":      ["./src/apps/ACLApp.jsx"],
          "shoulder-app": ["./src/apps/ShoulderApp.jsx"],
          "apre-app":     ["./src/apps/APREApp.jsx"],
        },
      },
    },
  },
});
