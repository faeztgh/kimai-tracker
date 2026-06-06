import { app, Menu, nativeImage, Tray } from "electron";
import { resourcePath } from "./resources";
import { appState } from "./state";
import { getMainWindow, showMain, toggleFloating, toggleMain, toggleTimerHotkey } from "./windows";

let tray: Tray | null = null;
let running = false;
let statusLabel = "";
let orgLabel = "";

function trayImage(isRunning = false) {
  const name = isRunning
    ? "tray-running.png"
    : process.platform === "win32"
      ? "tray.ico"
      : "tray.png";
  let img = nativeImage.createFromPath(resourcePath(name));
  if (process.platform === "darwin") {
    img = img.resize({ width: 18, height: 18 });
  }
  return img;
}

function stopFromTray(): void {
  const win = getMainWindow();
  if (!win) return;
  showMain();
  win.webContents.send("tray:stop-timer");
}

function appName(): string {
  return orgLabel || "Kimai Tracker";
}

function buildMenu(): Menu {
  return Menu.buildFromTemplate([
    { label: `Show ${appName()}`, click: () => showMain() },
    { label: "Toggle Floating Window", click: () => toggleFloating() },
    { type: "separator" },
    running
      ? { label: `Stop timer · ${statusLabel}`, click: () => stopFromTray() }
      : { label: "Start timer", click: () => toggleTimerHotkey() },
    { type: "separator" },
    {
      label: "Settings",
      click: () => {
        showMain();
        getMainWindow()?.webContents.send("goto-settings");
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        appState.isQuitting = true;
        app.quit();
      },
    },
  ]);
}

export function createTray(): Tray {
  tray = new Tray(trayImage());
  tray.setToolTip("Kimai Tracker");
  tray.setContextMenu(buildMenu());
  tray.on("click", () => toggleMain());
  tray.on("double-click", () => showMain());
  return tray;
}

export function updateTrayStatus(status: {
  running: boolean;
  label: string;
  org: string;
}): void {
  running = status.running;
  statusLabel = status.label;
  orgLabel = status.org;
  if (!tray) return;
  tray.setImage(trayImage(running));
  tray.setToolTip(running ? `${appName()} — ${statusLabel}` : appName());
  if (process.platform === "darwin") {
    tray.setTitle(running ? statusLabel : "");
  }
  tray.setContextMenu(buildMenu());
}
