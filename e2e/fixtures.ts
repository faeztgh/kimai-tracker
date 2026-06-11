import { join } from "node:path";
import type { ElectronApplication, Page } from "@playwright/test";
import { test as base, _electron as electron, expect } from "@playwright/test";

export type ElectronFixtures = {
  electronApp: ElectronApplication;
  page: Page;
};

export const test = base.extend<ElectronFixtures>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright fixtures require destructuring
  electronApp: async ({}, use) => {
    const app = await electron.launch({
      args: [join(process.cwd(), "out", "main", "index.js")],
      env: {
        ...process.env,
        NODE_ENV: "test",
        // Disable auto-updater in tests
        KIMAI_SKIP_UPDATER: "1",
      },
    });
    await use(app);
    await app.close();
  },

  page: async ({ electronApp }, use) => {
    const win = await electronApp.firstWindow();
    await win.waitForLoadState("domcontentloaded");
    await use(win);
  },
});

export { expect };

/**
 * Override main-process IPC handlers so the renderer boots in a fully
 * authenticated state backed by mock data (no real Kimai server needed).
 */
export async function mockAuthenticatedState(
  electronApp: ElectronApplication,
  page: Page,
) {
  await electronApp.evaluate(({ ipcMain }) => {
    const ORG_SETTINGS = {
      pollSeconds: 30,
      accent: "blue",
      showSummary: true,
      weekStart: 1,
      showTags: true,
      showBillable: true,
      notifyTimer: false,
      animateDigits: false,
      hourlyRate: 0,
      currency: "€",
      showIncome: true,
      defaultProject: null,
      defaultActivity: null,
      reminderHours: 8,
      idleThresholdMinutes: 10,
    };

    const ORG_LIST = {
      organisations: [
        {
          id: "test-org",
          alias: "Test Org",
          baseUrl: "https://demo.kimai.org",
          authMode: "bearer",
          username: "",
          settings: ORG_SETTINGS,
        },
      ],
      activeOrgId: "test-org",
    };

    const replace = (
      channel: string,
      handler: (...args: unknown[]) => unknown,
    ) => {
      try {
        ipcMain.removeHandler(channel);
      } catch {
        /* not registered */
      }
      ipcMain.handle(channel, handler);
    };

    replace("org:list", () => ORG_LIST);
    replace("org:setSetting", () => ORG_LIST);
    replace("org:setActive", () => ORG_LIST);
    replace(
      "prefs:get",
      (_e: unknown, _key: unknown, fallback: unknown) => fallback,
    );
    replace("prefs:set", () => undefined);
    replace("autostart:get", () => false);

    replace("kimai:request", (_e: unknown, req: { path: string }) => {
      const { path } = req;
      if (path.includes("/api/timesheets/active")) {
        return { ok: true, status: 200, statusText: "OK", body: "[]" };
      }
      if (path.includes("/api/timesheets")) {
        return { ok: true, status: 200, statusText: "OK", body: "[]" };
      }
      if (path.includes("/api/customers")) {
        return { ok: true, status: 200, statusText: "OK", body: "[]" };
      }
      if (path.includes("/api/projects")) {
        return { ok: true, status: 200, statusText: "OK", body: "[]" };
      }
      if (path.includes("/api/activities")) {
        return { ok: true, status: 200, statusText: "OK", body: "[]" };
      }
      if (path.includes("/api/tags")) {
        return { ok: true, status: 200, statusText: "OK", body: "[]" };
      }
      return { ok: true, status: 200, statusText: "OK", body: "{}" };
    });

    replace("tray:setStatus", () => undefined);
    replace("windows:syncData", () => undefined);
  });

  // Reload so the renderer re-runs settings.load() with the mocked handlers
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
}

/**
 * Force the app into unauthenticated / unconfigured state.
 */
export async function mockUnconfiguredState(
  electronApp: ElectronApplication,
  page: Page,
) {
  await electronApp.evaluate(({ ipcMain }) => {
    const replace = (
      channel: string,
      handler: (...args: unknown[]) => unknown,
    ) => {
      try {
        ipcMain.removeHandler(channel);
      } catch {
        /* not registered */
      }
      ipcMain.handle(channel, handler);
    };

    replace("org:list", () => ({ organisations: [], activeOrgId: null }));
    replace(
      "prefs:get",
      (_e: unknown, _key: unknown, fallback: unknown) => fallback,
    );
    replace("prefs:set", () => undefined);
  });

  await page.reload();
  await page.waitForLoadState("domcontentloaded");
}
