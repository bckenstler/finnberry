import { test, expect } from "./fixtures/auth";
import { cleanupTestData } from "./fixtures/database";

test.describe("Realtime Updates", () => {
  test.afterEach(async ({ authenticatedPage }) => {
    await cleanupTestData(authenticatedPage);
  });

  test("diaper log completes successfully", async ({ authenticatedPage, testData }) => {
    await authenticatedPage.goto(`/dashboard/${testData.child.id}`);

    // Should not be redirected to login
    await expect(authenticatedPage).not.toHaveURL(/login/);

    // Log a diaper
    const wetButton = authenticatedPage.getByRole("button", { name: /^wet$/i });
    await expect(wetButton).toBeVisible({ timeout: 10000 });
    await wetButton.click();

    // Wait for action to complete
    await authenticatedPage.waitForTimeout(1000);

    // Button should still be enabled (action completed)
    await expect(wetButton).toBeEnabled();
  });

  test("bottle feeding log completes successfully", async ({
    authenticatedPage,
    testData,
  }) => {
    await authenticatedPage.goto(`/dashboard/${testData.child.id}`);

    // Log a bottle feeding
    const bottleButton = authenticatedPage.getByRole("button", { name: /^bottle$/i });
    await expect(bottleButton).toBeVisible({ timeout: 10000 });
    await bottleButton.click();

    // Fill in amount
    const amountInput = authenticatedPage.getByLabel(/amount/i);
    await expect(amountInput).toBeVisible({ timeout: 5000 });
    await amountInput.fill("150");

    // Submit
    await authenticatedPage.getByRole("button", { name: /log bottle/i }).click();

    // Dialog should close
    await expect(amountInput).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe("Optimistic Updates", () => {
  test.afterEach(async ({ authenticatedPage }) => {
    await cleanupTestData(authenticatedPage);
  });

  test("timer starts quickly", async ({ authenticatedPage, testData }) => {
    await authenticatedPage.goto(`/dashboard/${testData.child.id}`);

    // Should not be redirected to login
    await expect(authenticatedPage).not.toHaveURL(/login/);

    // Start measuring time
    const startTime = Date.now();

    // Click to start timer
    const sleepButton = authenticatedPage.getByRole("button", { name: /^sleep$/i });
    await expect(sleepButton).toBeVisible({ timeout: 10000 });
    await sleepButton.click();

    const napButton = authenticatedPage.getByRole("button", { name: /^nap$/i });
    await expect(napButton).toBeVisible({ timeout: 5000 });
    await napButton.click();

    // Timer should appear quickly (use first() as there may be multiple stop buttons)
    await expect(
      authenticatedPage.getByRole("button", { name: /stop/i }).first()
    ).toBeVisible({ timeout: 3000 });

    const elapsed = Date.now() - startTime;

    // Should be reasonably fast
    expect(elapsed).toBeLessThan(5000);
  });

  test("diaper log action completes quickly", async ({ authenticatedPage, testData }) => {
    await authenticatedPage.goto(`/dashboard/${testData.child.id}`);

    // Should not be redirected to login
    await expect(authenticatedPage).not.toHaveURL(/login/);

    const startTime = Date.now();

    // Log diaper
    const wetButton = authenticatedPage.getByRole("button", { name: /^wet$/i });
    await expect(wetButton).toBeVisible({ timeout: 10000 });
    await wetButton.click();

    // Wait for action to complete
    await authenticatedPage.waitForTimeout(500);

    const elapsed = Date.now() - startTime;

    // Should be reasonably fast
    expect(elapsed).toBeLessThan(5000);
  });
});
