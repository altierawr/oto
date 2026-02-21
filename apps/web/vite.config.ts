import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { defineConfig } from "vite";
import oxlint from "vite-plugin-oxlint";

// https://vite.dev/config/
export default defineConfig(() => {
  const reactPath = path.resolve(__dirname, "../../node_modules/react");
  const reactDomPath = path.resolve(__dirname, "../../node_modules/react-dom");
  const hasLocalReact = fs.existsSync(reactPath) && fs.existsSync(reactDomPath);

  const alias: Record<string, string> = hasLocalReact
    ? {
        react: reactPath,
        "react-dom": reactDomPath,
      }
    : {};

  return {
    plugins: [
      oxlint(),
      react({
        babel: {
          plugins: ["babel-plugin-react-compiler"],
        },
      }),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        ...alias,
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: true,
    },
  };
});
