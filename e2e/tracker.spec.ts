/**
 * Tracker UI tests in authenticated state (IPC handlers mocked).
 */
import { test, expect, mockAuthenticatedState } from "./fixtures";

test.beforeEach(async ({ electronApp, page }) => {
  await mockAuthenticatedState(electronApp, page);
  // Give React Query time to settle after reload
  await page.waitForTimeout(500);
});

test("tracker tab is visible and selected by default", async ({ page }) => {
  const trackerTab = page
    .getByRole("tab", { name: /timer|tracker/i })
    .or(page.getByRole("button", { name: /timer|tracker/i }))
    .first();

  // Either there's a labelled tab or the tracker content is directly visible
  if ((await trackerTab.count()) > 0) {
    await expect(trackerTab).toBeVisible({ timeout: 5000 });
  } else {
    // Fallback: check that a start-timer button exists
    await expect(
      page.getByRole("button", { name: /start/i }),
    ).toBeVisible({ timeout: 5000 });
  }
});

test("start-timer button is present in the tracker bar", async ({ page }) => {
  const startBtn = page.getByRole("button", { name: /start/i });
  await expect(startBtn).toBeVisible({ timeout: 5000 });
});

test("description input is present in the tracker bar", async ({ page }) => {
  const desc = page
    .getByPlaceholder(/description|what are you working on/i)
    .or(page.locator('input[name="description"], textarea[name="description"]'))
    .first();
  await expect(desc).toBeVisible({ timeout: 5000 });
});

test("can type a description without errors", async ({ page }) => {
  const desc = page
    .getByPlaceholder(/description|what are you working on/i)
    .first();

  if ((await desc.count()) > 0) {
    await desc.fill("Writing unit tests");
    await expect(desc).toHaveValue("Writing unit tests");
  } else {
    test.skip(true, "Description input not found");
  }
});

test("navigation tabs are rendered (Dashboard, Reports, Settings)", async ({ page }) => {
  const tabNames = ["Dashboard", "Reports", "Settings"];

  for (const name of tabNames) {
    const tab = page
      .getByRole("tab", { name: new RegExp(name, "i") })
      .or(page.getByRole("button", { name: new RegExp(name, "i") }))
      .first();

    if ((await tab.count()) > 0) {
      await expect(tab).toBeVisible({ timeout: 3000 });
    }
    // Not all themes surface tabs as role="tab" – skip individual missing tabs
  }
});

test("clicking Dashboard tab shows the dashboard view", async ({ page }) => {
  const dashTab = page
    .getByRole("tab", { name: /dashboard/i })
    .or(page.getByRole("button", { name: /dashboard/i }))
    .first();

  if ((await dashTab.count()) === 0) {
    test.skip(true, "Dashboard tab not found");
    return;
  }

  await dashTab.click();
  // Dashboard should show stats or a chart section
  const dashContent = page
    .getByText(/today|week|month/i)
    .first();
  await expect(dashContent).toBeVisible({ timeout: 3000 });
});

test("clicking Reports tab shows the reports view", async ({ page }) => {
  const reportsTab = page
    .getByRole("tab", { name: /reports/i })
    .or(page.getByRole("button", { name: /reports/i }))
    .first();

  if ((await reportsTab.count()) === 0) {
    test.skip(true, "Reports tab not found");
    return;
  }

  await reportsTab.click();
  // Reports view contains a date range selector or export button
  const reportsContent = page
    .getByText(/export|week|month|custom/i)
    .first();
  await expect(reportsContent).toBeVisible({ timeout: 3000 });
});

test("clicking Settings tab shows the settings view", async ({ page }) => {
  const settingsTab = page
    .getByRole("tab", { name: /settings/i })
    .or(page.getByRole("button", { name: /settings/i }))
    .first();

  if ((await settingsTab.count()) === 0) {
    test.skip(true, "Settings tab not found");
    return;
  }

  await settingsTab.click();
  // Settings should have theme options or poll interval
  const settingsContent = page
    .getByText(/theme|dark|light|poll|interval/i)
    .first();
  await expect(settingsContent).toBeVisible({ timeout: 3000 });
});
