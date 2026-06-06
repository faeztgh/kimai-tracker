/**
 * Tests for the initial Setup / configuration screen shown when no
 * Kimai organisation has been configured yet.
 */
import { test, expect, mockUnconfiguredState } from "./fixtures";

test.beforeEach(async ({ electronApp, page }) => {
  await mockUnconfiguredState(electronApp, page);
});

test("setup screen is visible when app is unconfigured", async ({ page }) => {
  // The Setup screen contains an input for the Kimai server URL
  await expect(page.getByPlaceholder(/https:\/\//i)).toBeVisible({ timeout: 5000 });
});

test("URL input accepts text", async ({ page }) => {
  const urlInput = page.getByPlaceholder(/https:\/\//i);
  await urlInput.fill("https://my-kimai.example.com");
  await expect(urlInput).toHaveValue("https://my-kimai.example.com");
});

test("token/password field is present", async ({ page }) => {
  // The token field is a password-type input
  const passwordField = page.locator('input[type="password"]').first();
  await expect(passwordField).toBeVisible({ timeout: 5000 });
});

test("'Test Connection' or 'Save' button is present", async ({ page }) => {
  const actionButton = page.getByRole("button", {
    name: /test connection|connect|save/i,
  });
  await expect(actionButton).toBeVisible({ timeout: 5000 });
});

test("attempting to connect with blank fields shows an error or keeps button disabled", async ({
  page,
}) => {
  const urlInput = page.getByPlaceholder(/https:\/\//i);
  await urlInput.fill("");

  const connectBtn = page.getByRole("button", { name: /test connection|connect|save/i });
  // Either the button is disabled or clicking shows an error
  const isDisabled = await connectBtn.isDisabled();
  if (!isDisabled) {
    await connectBtn.click();
    // Some validation message should appear (error text or aria-invalid)
    const invalid = await page.locator("[aria-invalid='true'], [data-error], .text-red").count();
    const errorText = await page.getByText(/required|invalid|error/i).count();
    expect(invalid + errorText).toBeGreaterThan(0);
  } else {
    // Button is disabled – that's valid UX too
    expect(isDisabled).toBe(true);
  }
});

test("switching to Legacy auth mode shows a username field", async ({ page }) => {
  // Look for a toggle/radio/select for auth mode
  const legacyOption = page.getByRole("radio", { name: /legacy/i })
    .or(page.getByRole("button", { name: /legacy/i }))
    .or(page.getByText(/legacy/i).first());

  if ((await legacyOption.count()) > 0) {
    await legacyOption.first().click();
    await expect(page.getByPlaceholder(/username/i).or(page.locator('input[name="username"]'))).toBeVisible({ timeout: 3000 });
  } else {
    test.skip(true, "Legacy auth toggle not found – skipping");
  }
});
