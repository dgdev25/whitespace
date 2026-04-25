import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 18731, proxy: { "/api": "http://localhost:18730" } },
  test: { environment: "jsdom", setupFiles: ["./vitest.setup.ts"], globals: true },
});
