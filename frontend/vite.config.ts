import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// The repo-root .env is shared with docker compose and the backend (which reads BACKEND_PORT from it
// when run locally), so the dev proxy reads it too and both sides agree on the backend port.
const repoRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, repoRoot, "");
  const proxyTarget =
    process.env.VITE_PROXY_TARGET ?? `http://localhost:${rootEnv.BACKEND_PORT || "8080"}`;

  return {
    plugins: [react()],
    resolve: {
      // "@/shared/ui/Button" instead of "../../../shared/ui/Button" (same alias in tsconfig and jest).
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      port: 5173,
      // In dev, /api is proxied to the backend so the browser only talks to one origin.
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
