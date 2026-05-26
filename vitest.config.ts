import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node"
  },
  resolve: {
    alias: {
      "@main": resolve("src/main"),
      "@preload": resolve("src/preload"),
      "@renderer": resolve("src/renderer"),
      "@shared": resolve("src/shared")
    }
  }
});
