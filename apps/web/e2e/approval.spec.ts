import { test, expect, type Page } from "@playwright/test";
import { setupAuthentication } from "./fixtures/auth";
import { callTestApi, cleanupTestData } from "./fixtures/database";

async function signInWithStatus(page: Page, status: "PENDING" | "REJECTED") {
  const stamp = Date.now();
  const { user } = await callTestApi("createTestUser", {
    email: `e2e-test-${status.toLowerCase()}-${stamp}@example.com`,
    name: `e2e-test ${status} ${stamp}`,
    status,
  });
  const { sessionToken } = await callTestApi("createTestSession", {
    userId: user.id,
  });
  await setupAuthentication(page, sessionToken);
}

test.describe("Account approval", () => {
  test.afterEach(async ({ page }) => {
    await cleanupTestData(page);
  });

  test("an account waiting for approval is held on the pending page", async ({ page }) => {
    await signInWithStatus(page, "PENDING");

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/pending$/);
    await expect(page.getByText("Waiting for approval")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("a rejected account is told access was not granted", async ({ page }) => {
    await signInWithStatus(page, "REJECTED");

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/pending$/);
    await expect(page.getByText("Access not granted")).toBeVisible();
  });

  test("an account waiting for approval cannot open a dashboard page directly", async ({ page }) => {
    await signInWithStatus(page, "PENDING");

    await page.goto("/dashboard/household/new");

    await expect(page).toHaveURL(/\/pending$/);
  });
});
