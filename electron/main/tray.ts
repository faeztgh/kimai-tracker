import { app, Menu, nativeImage, Tray } from "electron";
import trayIco from "../../resources/tray.ico?asset";
import trayPng from "../../resources/tray.png?asset";
import trayRunningPng from "../../resources/tray-running.png?asset";
import { mainT } from "./i18n";
import { appState } from "./state";
import {
  getMainWindow,
  showMain,
  toggleFloating,
  toggleMain,
  toggleTimerHotkey,
} from "./windows";

let tray: Tray | null = null;
let running = false;
let statusLabel = "";
let orgLabel = "";

function trayImage(isRunning = false) {
  const path = isRunning
    ? trayRunningPng
    : process.platform === "win32"
      ? trayIco
      : trayPng;
  let img = nativeImage.createFromPath(path);
  if (img.isEmpty()) img = nativeImage.createFromPath(trayPng);
  if (process.platform === "darwin")
    img = img.resize({ width: 18, height: 18 });
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
  const tr = mainT();
  return Menu.buildFromTemplate([
    { label: `${tr.show} ${appName()}`, click: () => showMain() },
    { label: tr.toggleFloating, click: () => toggleFloating() },
    { type: "separator" },
    running
      ? {
          label: `${tr.stopTimer} · ${statusLabel}`,
          click: () => stopFromTray(),
        }
      : { label: tr.startTimer, click: () => toggleTimerHotkey() },
    { type: "separator" },
    {
      label: tr.settings,
      click: () => {
        showMain();
        getMainWindow()?.webContents.send("goto-settings");
      },
    },
    { type: "separator" },
    {
      label: tr.quit,
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

export function refreshTrayMenu(): void {
  if (!tray) return;
  tray.setContextMenu(buildMenu());
  tray.setToolTip(running ? `${appName()} — ${statusLabel}` : appName());
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
