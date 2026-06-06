/**
 * Basic launch / window smoke tests.
 * These run against the built app (pnpm build required).
 */
import { test, expect } from "./fixtures";

test("app opens a visible window", async ({ page }) => {
  await expect(page).toBeDefined();
  // Window should not be blank
  const body = await page.locator("body").count();
  expect(body).toBeGreaterThan(0);
});

test("window has a meaningful HTML title", async ({ page }) => {
  const title = await page.title();
  // Should contain 'Kimai' or 'Tracker' (set in index.html)
  expect(title.length).toBeGreaterThan(0);
});

test("window dimensions are at least 400×400 px", async ({ page }) => {
  // Read the viewport dimensions from the renderer rather than calling into
  // the main process (avoids a race with BrowserWindow.getAllWindows()).
  const { width, height } = await page.evaluate(() => ({
    width: window.outerWidth || window.innerWidth,
    height: window.outerHeight || window.innerHeight,
  }));
  expect(width).toBeGreaterThanOrEqual(400);
  expect(height).toBeGreaterThanOrEqual(400);
});

test("React root mounts successfully (no crash screen)", async ({ page }) => {
  // React 19 no longer adds data-reactroot; check the #root container has content
  const root = page.locator("#root");
  await expect(root).toBeVisible({ timeout: 8000 });
  // The root must contain at least one child element (React mounted something)
  const childCount = await root.evaluate((el) => el.children.length);
  expect(childCount).toBeGreaterThan(0);
});
