import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@data": path.join(import.meta.dirname, "../data"),
      "@": import.meta.dirname,
    },
  },
  test: { include: ["test/**/*.test.ts", "test/**/*.test.tsx"] },
});
