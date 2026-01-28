import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "@finnberry/mcp-server",
    include: ["src/**/*.test.ts"],
  },
});
