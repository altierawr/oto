import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ["design"], // Don't pre-bundle the linked package
  },
  server: {
    watch: {
      // Watch the linked package directory
      ignored: ["!**/node_modules/design/**"],
    },
  },
});
