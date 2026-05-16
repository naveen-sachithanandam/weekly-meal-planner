import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    environmentMatchGlobs: [["tests/components/**", "jsdom"]],
    globalSetup: ["./tests/global-setup.ts"],
    fileParallelism: false,
    setupFiles: ["./tests/setup.ts"],
  },
});
