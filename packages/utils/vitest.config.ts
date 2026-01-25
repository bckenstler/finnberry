import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "@finnberry/utils",
    include: ["src/**/*.test.ts"],
  },
});
