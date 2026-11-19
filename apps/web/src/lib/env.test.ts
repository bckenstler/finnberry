import { describe, it, expect } from "vitest";
import { assertProductionEnv, findProductionEnvProblems } from "./env";

const GOOD_SECRET = "k3J9x0Qw7Lr2Tz5Vb8Nn1Mm4Pp6Ss0Aa2Dd4Ff6Gg8="; // 44 characters
const fitForProduction = {
  NODE_ENV: "production",
  AUTH_SECRET: GOOD_SECRET,
  NEXTAUTH_URL: "https://finnberry.example.com",
};

describe("findProductionEnvProblems", () => {
  it("finds nothing wrong with a complete configuration", () => {
    expect(findProductionEnvProblems(fitForProduction)).toEqual([]);
  });

  it("reports a missing secret", () => {
    const problems = findProductionEnvProblems({ ...fitForProduction, AUTH_SECRET: undefined });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("AUTH_SECRET is not set");
  });

  it("reports the placeholder secret from .env.example", () => {
    const problems = findProductionEnvProblems({
      ...fitForProduction,
      AUTH_SECRET: "your-auth-secret-generate-with-openssl-rand-base64-32",
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("placeholder");
  });

  it("reports a secret too short to be a generated one", () => {
    const problems = findProductionEnvProblems({ ...fitForProduction, AUTH_SECRET: "hunter2" });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("at least 32 characters");
  });

  it("reports a deployment that does not know its own URL", () => {
    const problems = findProductionEnvProblems({ ...fitForProduction, NEXTAUTH_URL: undefined });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("NEXTAUTH_URL");
  });

  it.each(["AUTH_URL", "AUTH_TRUST_HOST", "VERCEL"])(
    "accepts %s in place of NEXTAUTH_URL",
    (name) => {
      const env = { ...fitForProduction, NEXTAUTH_URL: undefined, [name]: "1" };
      expect(findProductionEnvProblems(env)).toEqual([]);
    }
  );

  it("reports the test seed endpoint being switched on", () => {
    const problems = findProductionEnvProblems({ ...fitForProduction, ENABLE_TEST_SEED: "1" });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("ENABLE_TEST_SEED");
  });

  it("reports every problem at once", () => {
    expect(findProductionEnvProblems({ NODE_ENV: "production" })).toHaveLength(2);
  });
});

describe("assertProductionEnv", () => {
  it("refuses to start a production server with a bad configuration", () => {
    expect(() => assertProductionEnv({ NODE_ENV: "production" })).toThrow(
      /cannot start[\s\S]*AUTH_SECRET[\s\S]*NEXTAUTH_URL/
    );
  });

  it("starts a production server with a good configuration", () => {
    expect(() => assertProductionEnv(fitForProduction)).not.toThrow();
  });

  it("does not check a development server", () => {
    expect(() => assertProductionEnv({ NODE_ENV: "development" })).not.toThrow();
  });
});
