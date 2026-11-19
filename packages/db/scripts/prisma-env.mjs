// Runs the Prisma CLI with the app's environment: `node prisma-env.mjs db push`.
//
// The repo keeps one .env, in apps/web, which Next.js loads by itself. Prisma
// only looks beside its own schema, so run directly it cannot find
// DATABASE_URL and the documented `pnpm db:push` fails. Variables already set
// in the environment win over the file, so CI and hosted builds are unaffected.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const WEB_ENV_FILE = resolve(packageDir, "../../apps/web/.env");

// Returns whether there was a file to load.
export function loadWebEnv(envFile = WEB_ENV_FILE) {
  if (!existsSync(envFile)) return false;
  process.loadEnvFile(envFile);
  return true;
}

export function prismaCliPath() {
  const require = createRequire(import.meta.url);
  const manifestPath = require.resolve("prisma/package.json");
  return resolve(dirname(manifestPath), require(manifestPath).bin.prisma);
}

const isRunDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isRunDirectly) {
  loadWebEnv();
  const prisma = spawnSync(
    process.execPath,
    [prismaCliPath(), ...process.argv.slice(2)],
    { stdio: "inherit", cwd: packageDir }
  );
  process.exit(prisma.status ?? 1);
}
