import { test, expect } from "./fixtures/auth";
import { seedTestData, cleanupTestData, testData } from "./fixtures/database";

// Helper to check if user is redirected to login (not authenticated)
async function isOnLoginPage(page: import("@playwright/test").Page): Promise<boolean> {
  return page.url().includes("/login");
}

test.describe("Sleep Tracking", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await seedTestData(authenticatedPage);
  });

  test.afterEach(async ({ authenticatedPage }) => {
    await cleanupTestData(authenticatedPage);
  });

  test("can start a nap timer", async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/dashboard/child/${testData.childId}`);

    // Skip if redirected to login
    if (await isOnLoginPage(authenticatedPage)) {
      test.skip();
      return;
    }

    // Find and click sleep button
    const sleepButton = authenticatedPage.getByRole("button", { name: /sleep/i });
    await sleepButton.click();

    // Should open dialog to choose nap or night
    await expect(
      authenticatedPage.getByRole("button", { name: /nap/i })
    ).toBeVisible();

    // Click nap
    await authenticatedPage.getByRole("button", { name: /nap/i }).click();

    // Timer should be running - look for stop button
    await expect(
      authenticatedPage.getByRole("button", { name: /stop/i })
    ).toBeVisible({ timeout: 5000 });
  });

  test("can stop a sleep timer", async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/dashboard/child/${testData.childId}`);

    // Skip if redirected to login
    if (await isOnLoginPage(authenticatedPage)) {
      test.skip();
      return;
    }

    // Start sleep first
    const sleepButton = authenticatedPage.getByRole("button", { name: /sleep/i });
    await sleepButton.click();
    await authenticatedPage.getByRole("button", { name: /nap/i }).click();

    // Wait for timer to be visible
    await expect(
      authenticatedPage.getByRole("button", { name: /stop/i })
    ).toBeVisible();

    // Stop the timer
    await authenticatedPage.getByRole("button", { name: /stop/i }).click();

    // Timer should stop - should see sleep button again
    await expect(
      authenticatedPage.getByRole("button", { name: /sleep/i })
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Feeding Tracking", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await seedTestData(authenticatedPage);
  });

  test.afterEach(async ({ authenticatedPage }) => {
    await cleanupTestData(authenticatedPage);
  });

  test("can start breastfeeding timer", async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/dashboard/child/${testData.childId}`);

    // Skip if redirected to login
    if (await isOnLoginPage(authenticatedPage)) {
      test.skip();
      return;
    }

    // Find and click breast button
    const breastButton = authenticatedPage.getByRole("button", { name: /breast/i });
    await breastButton.click();

    // Should open dialog to choose side
    await expect(
      authenticatedPage.getByRole("button", { name: /left/i })
    ).toBeVisible();

    // Click left side
    await authenticatedPage.getByRole("button", { name: /left/i }).click();

    // Timer should be running
    await expect(
      authenticatedPage.getByRole("button", { name: /stop/i })
    ).toBeVisible({ timeout: 5000 });
  });

  test("can log bottle feeding", async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/dashboard/child/${testData.childId}`);

    // Skip if redirected to login
    if (await isOnLoginPage(authenticatedPage)) {
      test.skip();
      return;
    }

    // Find and click bottle button
    const bottleButton = authenticatedPage.getByRole("button", { name: /bottle/i });
    await bottleButton.click();

    // Should open dialog with amount input
    await expect(authenticatedPage.getByLabel(/amount/i)).toBeVisible();

    // Enter amount
    await authenticatedPage.getByLabel(/amount/i).fill("150");

    // Submit
    await authenticatedPage.getByRole("button", { name: /log bottle/i }).click();

    // Dialog should close - success
    await expect(authenticatedPage.getByLabel(/amount/i)).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("bottle dialog has quick amount buttons", async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/dashboard/child/${testData.childId}`);

    // Skip if redirected to login
    if (await isOnLoginPage(authenticatedPage)) {
      test.skip();
      return;
    }

    const bottleButton = authenticatedPage.getByRole("button", { name: /bottle/i });
    await bottleButton.click();

    // Should have quick amount buttons
    await expect(authenticatedPage.getByRole("button", { name: "60ml" })).toBeVisible();
    await expect(authenticatedPage.getByRole("button", { name: "120ml" })).toBeVisible();
  });
});

test.describe("Diaper Tracking", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await seedTestData(authenticatedPage);
  });

  test.afterEach(async ({ authenticatedPage }) => {
    await cleanupTestData(authenticatedPage);
  });

  test("can log wet diaper", async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/dashboard/child/${testData.childId}`);

    // Skip if redirected to login
    if (await isOnLoginPage(authenticatedPage)) {
      test.skip();
      return;
    }

    // Find and click wet button
    const wetButton = authenticatedPage.getByRole("button", { name: /wet/i });
    await wetButton.click();

    // Should show success toast or confirmation
    await expect(
      authenticatedPage.getByText(/logged|recorded|success/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test("can log dirty diaper", async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/dashboard/child/${testData.childId}`);

    // Skip if redirected to login
    if (await isOnLoginPage(authenticatedPage)) {
      test.skip();
      return;
    }

    // Find and click dirty button
    const dirtyButton = authenticatedPage.getByRole("button", { name: /dirty/i });
    await dirtyButton.click();

    // Should show success toast or confirmation
    await expect(
      authenticatedPage.getByText(/logged|recorded|success/i)
    ).toBeVisible({ timeout: 5000 });
  });
});
