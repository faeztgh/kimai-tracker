import { app, globalShortcut, Menu, session } from "electron";
import { loadOrganisations } from "./connection";
import { registerIpc } from "./ipc";
import { appState } from "./state";
import { startIdleWatch } from "./idle";
import { createTray } from "./tray";
import { initAutoUpdater } from "./updater";
import {
  createFloatingWindow,
  createMainWindow,
  showMain,
  toggleMain,
  toggleTimerHotkey,
} from "./windows";

app.setAppUserModelId("pro.faez.kimai-tracker");

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => showMain());

  app.whenReady().then(() => {
    applyContentSecurityPolicy();

    if (process.platform !== "darwin") Menu.setApplicationMenu(null);

    loadOrganisations();
    registerIpc();
    createMainWindow();
    createFloatingWindow();
    createTray();
    registerGlobalShortcut();
    startIdleWatch();
    initAutoUpdater();

    app.on("activate", () => showMain());
  });
}

app.on("before-quit", () => {
  appState.isQuitting = true;
});

app.on("window-all-closed", () => {});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

function registerGlobalShortcut(): void {
  try {
    globalShortcut.register("CommandOrControl+Shift+K", () => toggleMain());
    globalShortcut.register("CommandOrControl+Shift+S", () => toggleTimerHotkey());
  } catch (err) {
    console.warn("[shortcut] registration failed:", err);
  }
}

function applyContentSecurityPolicy(): void {
  const dev = !app.isPackaged;
  const policy = dev
    ? [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "connect-src 'self' ws: http://localhost:* http://127.0.0.1:*",
      ].join("; ")
    : [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "connect-src 'self'",
      ].join("; ");

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [policy],
      },
    });
  });
}
