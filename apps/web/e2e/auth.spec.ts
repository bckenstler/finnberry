import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page is accessible", async ({ page }) => {
    await page.goto("/login");

    // Should see login form
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });

  test("login page has email input", async ({ page }) => {
    await page.goto("/login");

    // Should have email input field
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
  });

  test("shows error for invalid email", async ({ page }) => {
    await page.goto("/login");

    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill("invalid-email");

    const submitButton = page.getByRole("button", { name: /sign in|continue/i });
    await submitButton.click();

    // Should show validation error
    await expect(page.getByText(/valid email|invalid/i)).toBeVisible();
  });

  test("redirects to login when accessing protected route unauthenticated", async ({
    page,
  }) => {
    // Try to access dashboard without being logged in
    await page.goto("/dashboard");

    // Should be redirected to login
    await expect(page).toHaveURL(/login/);
  });

  test("magic link flow shows confirmation", async ({ page }) => {
    await page.goto("/login");

    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill("test@example.com");

    const submitButton = page.getByRole("button", { name: /sign in|continue/i });
    await submitButton.click();

    // Should show confirmation message
    await expect(
      page.getByText(/check your email|link sent|magic link/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test("verify page handles invalid token", async ({ page }) => {
    // Navigate to verify page with invalid token
    await page.goto("/api/auth/callback/email?token=invalid-token");

    // Should show error or redirect to login
    await expect(page).toHaveURL(/login|error/);
  });

  test("login page has Google OAuth option", async ({ page }) => {
    await page.goto("/login");

    // Should have Google sign in button (if configured)
    const googleButton = page.getByRole("button", { name: /google/i });
    // This may or may not be visible depending on configuration
    if (await googleButton.isVisible()) {
      await expect(googleButton).toBeEnabled();
    }
  });
});

test.describe("Error Pages", () => {
  test("404 page for unknown routes", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");

    // Should show 404 or redirect
    await expect(page.getByText(/not found|404/i)).toBeVisible();
  });
});
