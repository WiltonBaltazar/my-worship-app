import laravel from "laravel-vite-plugin";
import path from "path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    laravel({
      input: "resources/js/main.tsx",
      refresh: true,
    }),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./resources/js"),
    },
  },
  server: {
    host: "::",
    port: 5173,
  },
});
