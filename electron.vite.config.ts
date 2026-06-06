import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/main",
      lib: { entry: resolve(__dirname, "electron/main/index.ts") },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/preload",
      lib: { entry: resolve(__dirname, "electron/preload/index.ts") },
    },
  },
  renderer: {
    root: ".",
    plugins: [react(), tailwindcss()],
    build: {
      outDir: "out/renderer",
      rollupOptions: {
        input: { index: resolve(__dirname, "index.html") },
      },
    },
  },
});
