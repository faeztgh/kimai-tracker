import { join } from "node:path";
import { app, BrowserWindow, nativeImage } from "electron";
import { prefs } from "./prefs";
import { resourcePath } from "./resources";
import { appState } from "./state";

const PRELOAD = join(__dirname, "../preload/index.js");

let mainWindow: BrowserWindow | null = null;
let floatingWindow: BrowserWindow | null = null;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
export function getFloatingWindow(): BrowserWindow | null {
  return floatingWindow;
}

export function broadcast(channel: string, ...args: unknown[]): void {
  for (const w of [mainWindow, floatingWindow]) {
    if (w && !w.isDestroyed()) w.webContents.send(channel, ...args);
  }
}

export function toggleTimerHotkey(): void {
  mainWindow?.webContents.send("hotkey:toggle-timer");
}

export function setTimerRunningIndicator(running: boolean): void {
  if (process.platform === "win32") {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const overlay = running
      ? nativeImage.createFromPath(resourcePath("overlay-dot.png"))
      : null;
    mainWindow.setOverlayIcon(overlay, running ? "Timer running" : "");
  } else if (process.platform === "darwin" && app.dock) {
    app.dock.setBadge(running ? "●" : "");
  }
}

function windowIcon() {
  return nativeImage.createFromPath(resourcePath("icon.ico"));
}

function loadRenderer(win: BrowserWindow): void {
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (!app.isPackaged && devUrl) {
    void win.loadURL(devUrl);
  } else {
    void win.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

export function createMainWindow(): BrowserWindow {
  if (mainWindow) return mainWindow;

  mainWindow = new BrowserWindow({
    width: 600,
    height: 680,
    minWidth: 460,
    minHeight: 520,
    show: false,
    center: true,
    title: "Kimai Tracker",
    icon: windowIcon(),
    autoHideMenuBar: true,
    backgroundColor: "#f3f4f6",
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      additionalArguments: ["--window-label=main"],
    },
  });

  mainWindow.on("close", (e) => {
    if (!appState.isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  loadRenderer(mainWindow);

  const launchedHidden = process.argv.includes("--hidden");
  mainWindow.once("ready-to-show", () => {
    if (!launchedHidden) mainWindow?.show();
  });

  return mainWindow;
}

export function createFloatingWindow(): BrowserWindow {
  if (floatingWindow) return floatingWindow;

  const saved = prefs.get<{ x: number; y: number } | null>(
    "floatingBounds",
    null,
  );

  floatingWindow = new BrowserWindow({
    width: 300,
    height: 168,
    x: saved?.x,
    y: saved?.y,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    fullscreenable: false,
    title: "Kimai Tracker (Mini)",
    icon: windowIcon(),
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      additionalArguments: ["--window-label=floating"],
    },
  });

  floatingWindow.setAlwaysOnTop(true, "floating");

  const persistBounds = () => {
    if (!floatingWindow) return;
    const b = floatingWindow.getBounds();
    prefs.set("floatingBounds", { x: b.x, y: b.y });
  };
  floatingWindow.on("moved", persistBounds);

  floatingWindow.on("close", (e) => {
    if (!appState.isQuitting) {
      e.preventDefault();
      floatingWindow?.hide();
    }
  });
  floatingWindow.on("closed", () => {
    floatingWindow = null;
  });

  loadRenderer(floatingWindow);
  return floatingWindow;
}

export function showMain(): void {
  const win = mainWindow ?? createMainWindow();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

export function toggleMain(): void {
  if (mainWindow && mainWindow.isVisible() && !mainWindow.isMinimized()) {
    mainWindow.hide();
  } else {
    showMain();
  }
}

export function toggleFloating(): void {
  const win = floatingWindow ?? createFloatingWindow();
  if (win.isVisible()) {
    win.hide();
  } else {
    win.show();
    win.focus();
  }
}

export function hideFloating(): void {
  floatingWindow?.hide();
}
