import { assertProductionEnv } from "@/lib/env";

// Runs once when the server starts. If it throws, Next.js logs the error and
// answers every request with a 500. `next build` loads this file too, on
// machines that have no runtime configuration yet, so the build is skipped.
export function register() {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  assertProductionEnv();
}
