import { test, expect } from "./fixtures/auth";
import { cleanupTestData } from "./fixtures/database";

test.describe("Sleep Tracking", () => {
  test.afterEach(async ({ authenticatedPage }) => {
    await cleanupTestData(authenticatedPage);
  });

  test("can start a nap timer", async ({ authenticatedPage, testData }) => {
    await authenticatedPage.goto(`/dashboard/${testData.child.id}`);

    // Should not be redirected to login
    await expect(authenticatedPage).not.toHaveURL(/login/);

    // Find and click sleep button
    const sleepButton = authenticatedPage.getByRole("button", { name: /^sleep$/i });
    await expect(sleepButton).toBeVisible({ timeout: 10000 });
    await sleepButton.click();

    // Should open dialog to choose nap or night
    const napButton = authenticatedPage.getByRole("button", { name: /^nap$/i });
    await expect(napButton).toBeVisible({ timeout: 5000 });

    // Click nap
    await napButton.click();

    // Timer should be running - look for stop button (use first() as there may be multiple stop buttons)
    await expect(
      authenticatedPage.getByRole("button", { name: /stop/i }).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("can stop a sleep timer", async ({ authenticatedPage, testData }) => {
    await authenticatedPage.goto(`/dashboard/${testData.child.id}`);

    // Start sleep first
    const sleepButton = authenticatedPage.getByRole("button", { name: /^sleep$/i });
    await expect(sleepButton).toBeVisible({ timeout: 10000 });
    await sleepButton.click();

    const napButton = authenticatedPage.getByRole("button", { name: /^nap$/i });
    await expect(napButton).toBeVisible({ timeout: 5000 });
    await napButton.click();

    // Wait for stop button (use first() as there may be multiple stop buttons)
    const stopButton = authenticatedPage.getByRole("button", { name: /stop/i }).first();
    await expect(stopButton).toBeVisible({ timeout: 5000 });

    // Stop the timer
    await stopButton.click();

    // Timer should stop - sleep button should be back
    await expect(
      authenticatedPage.getByRole("button", { name: /^sleep$/i })
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Feeding Tracking", () => {
  test.afterEach(async ({ authenticatedPage }) => {
    await cleanupTestData(authenticatedPage);
  });

  test("can start breastfeeding timer", async ({ authenticatedPage, testData }) => {
    await authenticatedPage.goto(`/dashboard/${testData.child.id}`);

    // Should not be redirected to login
    await expect(authenticatedPage).not.toHaveURL(/login/);

    // Find and click breast button
    const breastButton = authenticatedPage.getByRole("button", { name: /^breast$/i });
    await expect(breastButton).toBeVisible({ timeout: 10000 });
    await breastButton.click();

    // Should open dialog to choose side
    const leftButton = authenticatedPage.getByRole("button", { name: /left side/i });
    await expect(leftButton).toBeVisible({ timeout: 5000 });

    // Click left side
    await leftButton.click();

    // Timer should be running - look for stop button (use first() as there may be multiple stop buttons)
    await expect(
      authenticatedPage.getByRole("button", { name: /stop/i }).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("can log bottle feeding", async ({ authenticatedPage, testData }) => {
    await authenticatedPage.goto(`/dashboard/${testData.child.id}`);

    // Find and click bottle button
    const bottleButton = authenticatedPage.getByRole("button", { name: /^bottle$/i });
    await expect(bottleButton).toBeVisible({ timeout: 10000 });
    await bottleButton.click();

    // Should open dialog with amount input
    const amountInput = authenticatedPage.getByLabel(/amount/i);
    await expect(amountInput).toBeVisible({ timeout: 5000 });

    // Enter amount
    await amountInput.fill("150");

    // Submit
    const submitButton = authenticatedPage.getByRole("button", { name: /log bottle/i });
    await submitButton.click();

    // Dialog should close
    await expect(amountInput).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe("Diaper Tracking", () => {
  test.afterEach(async ({ authenticatedPage }) => {
    await cleanupTestData(authenticatedPage);
  });

  test("can log wet diaper", async ({ authenticatedPage, testData }) => {
    await authenticatedPage.goto(`/dashboard/${testData.child.id}`);

    // Should not be redirected to login
    await expect(authenticatedPage).not.toHaveURL(/login/);

    // Find and click wet button
    const wetButton = authenticatedPage.getByRole("button", { name: /^wet$/i });
    await expect(wetButton).toBeVisible({ timeout: 10000 });
    await wetButton.click();

    // Wait a bit for the action to complete (toast appears)
    await authenticatedPage.waitForTimeout(1000);

    // Button should still be clickable (action completed successfully)
    await expect(wetButton).toBeEnabled();
  });

  test("can log dirty diaper", async ({ authenticatedPage, testData }) => {
    await authenticatedPage.goto(`/dashboard/${testData.child.id}`);

    // Find and click dirty button
    const dirtyButton = authenticatedPage.getByRole("button", { name: /^dirty$/i });
    await expect(dirtyButton).toBeVisible({ timeout: 10000 });
    await dirtyButton.click();

    // Wait a bit for the action to complete
    await authenticatedPage.waitForTimeout(1000);

    // Button should still be clickable (action completed successfully)
    await expect(dirtyButton).toBeEnabled();
  });
});
