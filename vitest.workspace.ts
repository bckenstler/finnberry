import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "packages/utils",
  "packages/schemas",
  "packages/api",
  "apps/web",
]);
