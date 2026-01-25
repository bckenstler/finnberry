import { defineProject } from "vitest/config";
import path from "path";

export default defineProject({
  resolve: {
    alias: {
      "@finnberry/utils": path.resolve(__dirname, "../utils/src"),
      "@finnberry/schemas": path.resolve(__dirname, "../schemas/src"),
      "@finnberry/db": path.resolve(__dirname, "../db/src"),
    },
  },
  test: {
    name: "@finnberry/api",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
