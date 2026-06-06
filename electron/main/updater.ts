import { app } from "electron";
import { autoUpdater } from "electron-updater";
import { notifyUpdateReady } from "./notifications";

export function initAutoUpdater(): void {
  if (!app.isPackaged) return;
  try {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on("update-downloaded", (info) => {
      notifyUpdateReady(info?.version);
    });
    autoUpdater.on("error", (err) => {
      console.warn("[updater] error:", err?.message ?? err);
    });
    void autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.warn("[updater] check failed:", err?.message ?? err);
    });
  } catch (err) {
    console.warn("[updater] init failed:", err);
  }
}
