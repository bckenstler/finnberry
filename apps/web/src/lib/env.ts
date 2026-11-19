// The value shipped in .env.example. A deployment that still has it signs its
// sessions with a secret anyone can read on GitHub.
const PLACEHOLDER_AUTH_SECRET = "your-auth-secret-generate-with-openssl-rand-base64-32";
// `openssl rand -base64 32` gives 44 characters.
const MIN_AUTH_SECRET_LENGTH = 32;

type Env = Record<string, string | undefined>;

// What is wrong with the environment for a production server. Empty when it
// is fit to start.
export function findProductionEnvProblems(env: Env): string[] {
  const problems: string[] = [];
  const secret = env.AUTH_SECRET ?? env.NEXTAUTH_SECRET ?? "";

  if (!secret) {
    problems.push("AUTH_SECRET is not set. Generate one with: openssl rand -base64 32");
  } else if (secret === PLACEHOLDER_AUTH_SECRET) {
    problems.push(
      "AUTH_SECRET is still the placeholder from .env.example. Generate one with: openssl rand -base64 32"
    );
  } else if (secret.length < MIN_AUTH_SECRET_LENGTH) {
    problems.push(`AUTH_SECRET must be at least ${MIN_AUTH_SECRET_LENGTH} characters.`);
  }

  // Auth.js rejects every request unless one of these tells it which host to trust.
  const knowsItsUrl = env.NEXTAUTH_URL || env.AUTH_URL || env.AUTH_TRUST_HOST || env.VERCEL;
  if (!knowsItsUrl) {
    problems.push("NEXTAUTH_URL is not set, so sign-in would reject every request.");
  }

  if (env.ENABLE_TEST_SEED) {
    problems.push("ENABLE_TEST_SEED must not be set in production.");
  }

  return problems;
}

export function assertProductionEnv(env: Env = process.env): void {
  if (env.NODE_ENV !== "production") return;

  const problems = findProductionEnvProblems(env);
  if (problems.length > 0) {
    throw new Error(
      `Finnberry cannot start with this configuration:\n- ${problems.join("\n- ")}`
    );
  }
}
