import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "./",
  root: process.cwd(),
  publicDir: "public",
  build: {
    outDir: "dist/renderer",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "public/index.html"),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@main": path.resolve(__dirname, "./src/main"),
      "@renderer": path.resolve(__dirname, "./src/renderer"),
      "@common": path.resolve(__dirname, "./src/common"),
    },
  },
  server: {
    port: 3001,
    strictPort: true,
    host: 'localhost',
    open: false,
  },
  esbuild: {
    logOverride: { 
      'this-is-undefined-in-esm': 'silent'
    }
  },
  clearScreen: false,
});
