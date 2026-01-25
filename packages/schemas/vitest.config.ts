import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "@finnberry/schemas",
    include: ["src/**/*.test.ts"],
  },
});
