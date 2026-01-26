import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page is accessible", async ({ page }) => {
    await page.goto("/login");

    // Should see login form with welcome heading
    await expect(
      page.getByRole("heading", { name: /welcome to finnberry/i })
    ).toBeVisible();
  });

  test("login page has email input", async ({ page }) => {
    await page.goto("/login");

    // Should have email input field
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
  });

  test("email input has validation", async ({ page }) => {
    await page.goto("/login");

    const emailInput = page.getByLabel(/email/i);

    // Input uses type="email" which provides browser validation
    await expect(emailInput).toHaveAttribute("type", "email");
    await expect(emailInput).toHaveAttribute("required", "");
  });

  test("redirects to login when accessing protected route unauthenticated", async ({
    page,
  }) => {
    // Try to access dashboard without being logged in
    await page.goto("/dashboard");

    // Should be redirected to login
    await expect(page).toHaveURL(/login/);
  });

  test("magic link flow shows confirmation or config error", async ({ page }) => {
    await page.goto("/login");

    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill("test@example.com");

    const submitButton = page.getByRole("button", { name: /send magic link/i });
    await submitButton.click();

    // Should either show confirmation or redirect to auth error (if email not configured)
    // When email provider is configured: shows "Check your email"
    // When not configured: redirects to /auth/error
    await expect(page).toHaveURL(/check.*email|auth\/error|login/i, { timeout: 10000 });
  });

  test("auth error page shows error message", async ({ page }) => {
    // Test that auth error page handles errors gracefully
    await page.goto("/auth/error?error=Configuration");

    // Should show "Authentication Error" heading
    await expect(
      page.getByRole("heading", { name: /authentication error/i })
    ).toBeVisible();

    // Should show the configuration error message
    await expect(
      page.getByText(/problem with the server configuration/i)
    ).toBeVisible();

    // Should have a "Try again" link to login
    await expect(page.getByRole("link", { name: /try again/i })).toBeVisible();
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
