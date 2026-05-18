import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { mediaPlugin } from "./vite-plugin-media";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    base: mode === "production" ? "/fillem/" : "/",
    plugins: [tailwindcss(), react(), mediaPlugin(env.MEDIA_DIR ?? "")],
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      globals: true,
    },
  };
});
