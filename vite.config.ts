import laravel from "laravel-vite-plugin";
import path from "path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const devHost = env.VITE_DEV_HOST || "127.0.0.1";
  const devPort = Number(env.VITE_DEV_PORT || 5173);
  const hmrHost = env.VITE_HMR_HOST || devHost;
  const hmrPort = Number(env.VITE_HMR_PORT || devPort);
  const usePolling = env.VITE_USE_POLLING === "true";

  return {
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
      host: devHost,
      port: devPort,
      hmr: {
        host: hmrHost,
        port: hmrPort,
      },
      watch: {
        usePolling,
      },
    },
  };
});
