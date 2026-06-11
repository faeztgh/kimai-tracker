import path from "node:path";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  // Electron uses a single-instance lock; run test files serially so multiple
  // Electron processes don't compete for the lock and crash each other.
  workers: 1,
  fullyParallel: false,
  retries: 1,
  reporter: "list",
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "electron",
      testMatch: "**/*.spec.ts",
    },
  ],
  // Require a production build to exist before running E2E tests.
  // Run: pnpm build  then  pnpm test:e2e
  globalSetup: path.resolve("e2e/global-setup.ts"),
});
